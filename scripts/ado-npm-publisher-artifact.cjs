const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { gunzipSync } = require('node:zlib');
const {
    COHORT, DEPENDENCY_FIELDS, DESTINATION_FEED_ID, DESTINATION_REGISTRY, DIST_TAG, ENTRY_FIELDS,
    MANIFEST_FILE_NAME, SOURCE_REPOSITORY, assertSafeManifest, dependencyMap, fetchJson, isObject, normalizeSha,
} = require('./ado-npm-publisher-lib.cjs');

const FEED_URL = `https://feeds.dev.azure.com/msazure/One/_apis/packaging/feeds/${DESTINATION_FEED_ID}?api-version=7.1`;

function resolveNpmRoot(execPath = process.execPath) {
    const nodeDirectory = path.dirname(execPath);
    const launcher = path.join(nodeDirectory, 'npm');
    const candidates = [
        ...(fs.existsSync(launcher) ? [path.dirname(path.dirname(fs.realpathSync(launcher)))] : []),
        path.join(nodeDirectory, 'node_modules/npm'),
        path.resolve(nodeDirectory, '../lib/node_modules/npm'),
    ];
    // Resolve only the Node installation's npm, never PATH or the source checkout.
    for (const root of candidates) {
        if (!fs.existsSync(path.join(root, 'bin/npm-cli.js'))) continue;
        try {
            for (const dependency of ['tar', 'ini']) require.resolve(path.join(root, 'node_modules', dependency));
            return root;
        } catch (error) {
            if (error.code !== 'MODULE_NOT_FOUND') throw error;
        }
    }
    throw new Error('Node installation is missing a supported npm CLI with bundled tar and ini modules.');
}

function isPackagePath(value) {
    return typeof value === 'string' && !/[:\\\u0000-\u001f\u007f*]/.test(value) &&
        value.split('/').every(part => part && part !== '.' && part !== '..');
}

function readRegularFile(filename, limit) {
    const fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    try {
        const stat = fs.fstatSync(fd);
        if (!stat.isFile() || stat.nlink !== 1 || stat.size > limit) throw new Error(`Not a bounded regular file: ${path.basename(filename)}.`);
        return fs.readFileSync(fd);
    } finally {
        fs.closeSync(fd);
    }
}

function isPackageContent(name, directory) {
    if (name.startsWith('package/build/lib/')) return !/(?:^|\/)(?:\.npmrc|node_modules)(?:\/|$)/i.test(name);
    if (directory) return ['package', 'package/build', 'package/build/lib'].includes(name);
    return /^package\/(?:package\.json|(?:readme|licen[cs]e|copying|notice|changelog|history)(?:\.[\w.-]+)?)$/i.test(name);
}

function readTarball(buffer) {
    // Use the trusted Node distribution's npm tar parser (same format as npm publish), never code from the artifact.
    const tar = require(path.join(resolveNpmRoot(), 'node_modules/tar'));
    const Parser = tar.Parser ?? tar.Parse;
    const archive = gunzipSync(buffer, { maxOutputLength: 256 * 1024 * 1024 });
    const entries = new Map();
    const foldedFiles = new Set();
    const foldedDirectories = new Set();
    let ended = false;
    const parser = new Parser({
        strict: true,
        onentry(entry) {
            const directory = entry.type === 'Directory';
            const name = directory ? entry.path.replace(/\/$/, '') : entry.path;
            const foldedName = name.toLowerCase().normalize('NFC');
            if (foldedName === 'package/package.json' && name !== 'package/package.json') {
                throw new Error('Noncanonical package manifest path.');
            }
            if (!isPackagePath(name) || (name !== 'package' && !name.startsWith('package/')) ||
                foldedFiles.has(foldedName) || foldedDirectories.has(foldedName)) throw new Error('Invalid or duplicate tar entry path.');
            if (!directory && !['File', 'OldFile'].includes(entry.type)) throw new Error('Unexpected tar entry type.');
            if (!isPackageContent(name, directory)) throw new Error('Unexpected path outside the library package content.');
            // Case-insensitive consumers must not see files overwrite entries or become directories.
            const parts = foldedName.split('/');
            if (parts.some((_, index) => foldedFiles.has(parts.slice(0, index).join('/'))) ||
                (!directory && [...foldedFiles, ...foldedDirectories].some(existing => existing.startsWith(`${foldedName}/`)))) {
                throw new Error('Tar file conflicts with a directory ancestor.');
            }
            if (directory) foldedDirectories.add(foldedName);
            else {
                foldedFiles.add(foldedName);
                entries.set(name, entry.size);
            }
            if (name === 'package/package.json') {
                if (!entries.has(name) || entry.size > 256 * 1024) throw new Error('Invalid packed package.json.');
                const chunks = [];
                entry.on('data', chunk => chunks.push(chunk));
                entry.on('end', () => entries.set(name, Buffer.concat(chunks)));
            }
            entry.resume();
        },
        ondone() { ended = true; },
    });
    parser.on('ignoredEntry', entry => {
        if (!['ExtendedHeader', 'NextFileHasLongPath', 'OldExtendedHeader'].includes(entry.type)) {
            throw new Error('Unsupported or ambiguous tar metadata entry.');
        }
    });
    parser.end(archive);
    if (!ended || archive.length % 512 !== 0 || !archive.subarray(-1024).every(byte => byte === 0) ||
        !Buffer.isBuffer(entries.get('package/package.json'))) throw new Error('Incomplete tar archive or missing package.json.');
    return entries;
}

function requiredPaths(value, requireDot = false) {
    if (typeof value === 'string') {
        const entry = value.replace(/^\.\//, '');
        if (!isPackagePath(entry) || (requireDot && !value.startsWith('./'))) throw new Error('Invalid packed entrypoint path.');
        return [`package/${entry}`];
    }
    if (requireDot && (isObject(value) || Array.isArray(value))) return Object.values(value).flatMap(item => requiredPaths(item, true));
    if (requireDot && value === null) return [];
    throw new Error('Invalid packed entrypoint type.');
}

function validateEntrypoints(manifest, contract, entries) {
    for (const field of ENTRY_FIELDS) {
        assert.deepEqual(manifest[field], contract.entrypoints[field], `${manifest.name}: packed ${field} differs from source.`);
        if (Object.hasOwn(manifest.publishConfig ?? {}, field)) {
            assert.deepEqual(manifest.publishConfig[field], manifest[field], `${manifest.name}: publishConfig override mismatch.`);
        }
        if (manifest[field] !== undefined) {
            for (const file of requiredPaths(manifest[field], field === 'exports')) {
                if (!entries.get(file)) throw new Error(`${manifest.name} is missing required packed entry '${file}'.`);
            }
        }
    }
    if (!manifest.main || !manifest.types || !manifest.exports ||
        (manifest.name === '@microsoft/designer-ui-v2' && !Object.hasOwn(manifest.exports, './metrics')) ||
        (manifest.name === '@microsoft/logic-apps-designer-v2' && !entries.get('package/build/lib/_graph-layout/index.d.ts'))) {
        throw new Error(`${manifest.name}: missing library entrypoints or graph declarations.`);
    }
}

function digest(buffer) {
    return {
        integrity: `sha512-${crypto.createHash('sha512').update(buffer).digest('base64')}`,
        sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
        bytes: buffer.length,
    };
}

function validateTarballArtifact(buffer, definition, version, contract) {
    const entries = readTarball(buffer);
    const manifest = JSON.parse(entries.get('package/package.json').toString('utf8'));
    assertSafeManifest(manifest, definition.name);
    assert.equal(manifest.version, version, `${definition.name}: packed version mismatch.`);
    for (const field of DEPENDENCY_FIELDS) {
        assert.deepEqual(dependencyMap(manifest, field), contract[field], `${definition.name}: packed ${field} differs from source.`);
    }
    validateEntrypoints(manifest, contract, entries);
    return { name: definition.name, version, file: tarballName(definition, version), ...digest(buffer) };
}

function tarballName(definition, version) {
    return `${definition.name.slice(1).replace('/', '-')}-${version}.tgz`;
}

function expectedProvenance(verified) {
    return {
        source: { repository: SOURCE_REPOSITORY, releaseRef: `refs/tags/${verified.releaseTag}`, releaseId: verified.releaseId,
            verifiedSha: verified.commitSha, version: verified.version },
        destination: { registry: DESTINATION_REGISTRY, feedId: DESTINATION_FEED_ID, distTag: DIST_TAG },
    };
}

function checkDirectory(dir, fileNames) {
    if (!fs.lstatSync(dir).isDirectory() || path.resolve(dir) !== fs.realpathSync(dir)) throw new Error('Artifact directory is not confined.');
    assert.deepEqual(fs.readdirSync(dir).sort(), [...fileNames].sort(), 'Artifact must contain exactly the expected filenames.');
}

function validateArtifactFiles(dir, verified, contracts, { prepare = false } = {}) {
    const version = verified.version;
    const names = COHORT.map(item => tarballName(item, version));
    checkDirectory(dir, prepare ? names : [MANIFEST_FILE_NAME, ...names]);
    const provenance = expectedProvenance(verified);
    const record = prepare ? null : JSON.parse(readRegularFile(path.join(dir, MANIFEST_FILE_NAME), 128 * 1024).toString('utf8'));
    if (!prepare) {
        assert.deepEqual(record.source, provenance.source, 'Artifact source provenance mismatch.');
        assert.deepEqual(record.destination, provenance.destination, 'Artifact destination mismatch.');
        assert(Array.isArray(record.packages) && record.packages.length === COHORT.length, 'Artifact cohort size mismatch.');
    }
    const packages = COHORT.map((definition, index) => {
        // Never derive a filesystem path from the uploaded manifest.
        const file = names[index];
        const buffer = readRegularFile(path.join(dir, file), 64 * 1024 * 1024);
        const identity = { name: definition.name, version, file, ...digest(buffer) };
        if (!prepare) assert.deepEqual(record.packages[index], identity, 'Artifact identity or integrity mismatch.');
        return validateTarballArtifact(buffer, definition, version, contracts[definition.name]);
    });
    const artifact = { ...provenance, packages };
    if (prepare) fs.writeFileSync(path.join(dir, MANIFEST_FILE_NAME), `${JSON.stringify(artifact, null, 2)}\n`, { flag: 'wx' });
    return artifact;
}

function readNpmAuthorization(npmrcPath) {
    const scope = DESTINATION_REGISTRY.slice('https:'.length);
    const parentScope = scope.replace(/registry\/$/, '');
    const ini = require(path.join(resolveNpmRoot(), 'node_modules/ini'));
    const credentials = new Map();
    for (const line of readRegularFile(npmrcPath, 16 * 1024).toString('utf8').split(/\r?\n/).map(line => line.trim())) {
        if (!line || /^[;#]/.test(line)) continue;
        const values = Object.entries(ini.parse(line));
        if (values.length === 1 && ((values[0][0] === 'registry' && values[0][1] === DESTINATION_REGISTRY) ||
            (values[0][0] === 'always-auth' && values[0][1] === true))) continue;
        const [key, value] = values[0] ?? [];
        const match = /^(.*\/):(_authToken|_password|username|email)$/.exec(key ?? '');
        if (values.length !== 1 || !match || ![scope, parentScope].includes(match[1]) || credentials.has(key) ||
            typeof value !== 'string' || !value || /[\s$]/.test(value)) {
            throw new Error('Unexpected or duplicate entry in dedicated npmrc.');
        }
        credentials.set(key, value);
    }
    const authorizations = [scope, parentScope].map(prefix => {
        const [token, password, username] = ['_authToken', '_password', 'username'].map(key => credentials.get(`${prefix}:${key}`));
        if (!token && !password && !username) return undefined;
        if (token && !password && !username) return `Bearer ${token}`;
        if (!token && username && !username.includes(':') && password && Buffer.from(password, 'base64').toString('base64') === password) {
            return `Basic ${Buffer.concat([Buffer.from(`${username}:`), Buffer.from(password, 'base64')]).toString('base64')}`;
        }
        // npm selects complete credentials at one scope; never synthesize a split-scope pair.
        throw new Error('Missing or ambiguous credentials for the exact registry scope.');
    }).filter(Boolean);
    if (!authorizations.length) throw new Error('Missing credentials for the exact registry scope.');
    if (new Set(authorizations).size !== 1) throw new Error('Conflicting npm credential scopes.');
    return authorizations[0];
}

function npmRunner(npmrcPath, cwd, run = spawnSync) {
    checkDirectory(cwd, []);
    // With no project/user/global fallback and no inherited npm_config_* or NODE_OPTIONS.
    const environment = { HOME: cwd, PATH: path.dirname(process.execPath) + ':/usr/bin:/bin' };
    const invoke = args => run(process.execPath, [path.join(resolveNpmRoot(), 'bin/npm-cli.js'), ...args,
        '--prefix', cwd, '--userconfig', npmrcPath, '--globalconfig', '/dev/null', '--cache', path.join(cwd, 'cache'),
        '--strict-ssl=true', '--fetch-retries=0', '--ignore-scripts', '--logs-max=0'],
    { cwd, env: environment, encoding: 'utf8', timeout: 120_000 });
    // Deliberately omit --registry from this probe so it checks the actual configuration.
    const registry = invoke(['config', 'get', 'registry']);
    if (registry.status !== 0 || registry.stdout?.trim() !== DESTINATION_REGISTRY) throw new Error('Effective npm registry does not match the fixed feed.');
    return (tarball, distTag, dryRun = false) => invoke([
        'publish', tarball, '--registry', DESTINATION_REGISTRY, '--tag', distTag, ...(dryRun ? ['--dry-run'] : []),
    ]);
}

async function authenticateFeed(token, fetchImpl) {
    if (!token || !/^[A-Za-z0-9._~+/-]+=*$/.test(token)) throw new Error('Missing valid ADO job token for exact feed read.');
    const feed = await fetchJson(FEED_URL, fetchImpl, { authorization: `Bearer ${token}` }, 'Exact feed access check');
    if (feed?.id !== DESTINATION_FEED_ID || feed.name !== 'microsoft-logic-apps') throw new Error('ADO feed identity mismatch.');
}

function createRegistry(authorization, fetchImpl) {
    return name => {
        return fetchJson(`${DESTINATION_REGISTRY}${encodeURIComponent(name)}`, fetchImpl,
            { authorization, 'cache-control': 'no-cache' }, 'Exact registry metadata');
    };
}

function isVersion(value) {
    return typeof value === 'string' && /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.+-]+)?$/.test(value) && value === value.trim();
}

async function readTagsAndVersions(registry, name) {
    const doc = await registry(name);
    if (doc?.name !== name || !isObject(doc.versions) || !isObject(doc['dist-tags']) || !Object.hasOwn(doc['dist-tags'], 'latest') ||
        Object.keys(doc.versions).length === 0 || Object.entries(doc.versions).some(([version, item]) =>
            !isVersion(version) || item?.name !== name || item?.version !== version) ||
        Object.values(doc['dist-tags']).some(version => !isVersion(version) || !Object.hasOwn(doc.versions, version))) {
        throw new Error('Package metadata identity, version map or dist-tags are invalid.');
    }
    return { tags: doc['dist-tags'], versions: doc.versions };
}

function compareStableVersions(left, right) {
    const parse = value => {
        if (typeof value !== 'string' || value.length > 100 || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) {
            throw new Error('Cannot safely compare non-stable latest or release version.');
        }
        return value.split('.').map(part => BigInt(part));
    };
    const a = parse(left);
    const b = parse(right);
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
    }
    return 0;
}

function reconcileVersion(versions, entry) {
    const metadata = versions[entry.version];
    const integrity = metadata?.dist?.integrity;
    if (metadata?.name !== entry.name || metadata.version !== entry.version ||
        typeof integrity !== 'string' || !/^sha512-[A-Za-z0-9+/]{85}[AQgw]==$/.test(integrity)) {
        return { status: 'unknown', reason: 'Missing exact identity or canonical SHA-512 registry integrity.' };
    }
    if (integrity !== entry.integrity) return { status: 'conflict', reason: 'Existing integrity differs from the artifact.' };
    return { status: 'already-identical', reason: 'Exact identity and SHA-512 match.' };
}

function classifyPackageSnapshot(tags, versions, entry) {
    if (compareStableVersions(tags.latest, entry.version) > 0) {
        return { status: 'conflict', reason: 'Release is older than latest; backfill requires reconciliation.' };
    }
    let newerStable;
    for (const published of Object.keys(versions)) {
        const stable = /^((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(published);
        if (!stable || published === entry.version) continue;
        const comparison = compareStableVersions(stable[1], entry.version);
        if (comparison === 0) {
            return { status: 'conflict', reason: `Existing stable version ${published} has ambiguous release precedence.` };
        }
        if (comparison > 0) newerStable ??= published;
    }
    // Only a successful authenticated packument can supply absence evidence. Every HTTP 404 is unknown.
    const state = Object.hasOwn(versions, entry.version)
        ? reconcileVersion(versions, entry)
        : { status: 'absent', reason: 'Version missing from successful package metadata.' };
    if (state.status === 'already-identical' && tags.latest !== entry.version) {
        return { status: 'conflict', reason: 'Existing identical version is not latest; reconciliation is required.' };
    }
    const warning = newerStable
        ? `Newer stable version ${newerStable} exists outside latest; release order is unverified.`
        : undefined;
    return { ...state, latest: tags.latest, warning };
}

async function classifyPackageState(registry, entry) {
    try {
        const { tags, versions } = await readTagsAndVersions(registry, entry.name);
        return classifyPackageSnapshot(tags, versions, entry);
    } catch (error) {
        return { status: 'unknown', reason: error.message };
    }
}

async function publishPackage({ entry, registry, write }) {
    let result;
    try {
        result = write();
    } catch {
        // Spawn exceptions and timeouts are just as ambiguous as a server error.
    }
    const failed = reason => ({ status: 'failed', reason });
    try {
        // Even a zero exit is not evidence that this feed retained the expected immutable bytes.
        // Integrity and tags must describe the same observed registry state.
        const { tags, versions } = await readTagsAndVersions(registry, entry.name);
        if (tags.latest !== entry.version) return failed('Publication outcome unknown: latest does not point to the release version.');
        const state = classifyPackageSnapshot(tags, versions, entry);
        if (state.status === 'conflict') return failed(`Publication conflict: ${state.reason}`);
        if (state.status !== 'already-identical') return failed(`Publication outcome unknown: ${state.reason}`);
        const outcome = result?.status === 0
            ? { status: 'published', reason: 'Publish completed and tags verified.' }
            : { status: 'already-identical', reason: 'Exact version reconciled after a nonzero write result.' };
        return state.warning ? { ...outcome, warning: state.warning } : outcome;
    } catch (error) {
        return failed(`Publication outcome unknown: ${error.message}`);
    }
}

module.exports = {
    authenticateFeed, classifyPackageState, createRegistry, digest, npmRunner, publishPackage,
    readNpmAuthorization, readRegularFile, resolveNpmRoot, validateArtifactFiles, validateTarballArtifact,
};
