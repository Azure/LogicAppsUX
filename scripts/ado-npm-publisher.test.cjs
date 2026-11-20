const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { gzipSync } = require('node:zlib');
const { afterEach, test } = require('node:test');
const { COHORT, DESTINATION_FEED_ID, DESTINATION_REGISTRY, MANIFEST_FILE_NAME, branchProvenance, buildManifestContract, parseReleaseRef, verifyBuildPrerequisites, verifyCleanCheckout, verifyReleaseMetadata } =
    require('./ado-npm-publisher-lib.cjs');
const { authenticateFeed, classifyPackageState, createRegistry, digest, npmRunner, publishPackage, readNpmAuthorization, resolveNpmRoot, validateArtifactFiles, validateTarballArtifact } =
    require('./ado-npm-publisher-artifact.cjs');
const { buildCohort, dryRunCohort, main, prepareArtifact, processCohort, sanitizeAgentOutput } = require('./ado-npm-publisher.cjs');
const { FIXTURE_PROTOCOL, assertPinnedIsolatedIdentity, runIsolatedTestFeedPath } = require('./ado-npm-publisher-test-feed.cjs');

const releaseRef = 'refs/tags/v5.1022.0';
const commitSha = '6b2a7a7344e1165cda3d5db490c748446051b45f';
const version = '5.1022.0';
const previousVersion = '5.1021.0';
const distTag = 'latest';
const verified = { releaseTag: 'v5.1022.0', releaseId: 7, commitSha, version };
const branchEnv = {
    SOURCE_REPOSITORY: 'Azure/LogicAppsUX',
    SOURCE_BRANCH: 'refs/heads/krmitta/ado-npm-publish-pipeline',
    SOURCE_VERSION: commitSha,
    EXPECTED_SHA: commitSha,
    BUILD_ID: '192333967',
};
const roots = [];
const workspace = () => {
    const root = path.join(fs.realpathSync('scripts'), `.publisher-test-${randomUUID()}`);
    fs.mkdirSync(root);
    roots.push(root);
    return root;
};
afterEach(() => roots.splice(0).forEach(root => fs.rmSync(root, { force: true, recursive: true })));

function tar(entries) {
    const chunks = [];
    for (const [file, text, { type = '0', prefix = '', corrupt = false } = {}] of entries) {
        const content = Buffer.from(text);
        const header = Buffer.alloc(512);
        header.write(file, 0, 100);
        header.write('0000644\0', 100);
        header.write(`${content.length.toString(8).padStart(11, '0')}\0`, 124);
        header.fill(' ', 148, 156);
        header.write(type, 156);
        if (type === '2') header.write('target', 157);
        header.write('ustar\0' + '00', 257);
        header.write(prefix, 345, 155);
        const checksum = header.reduce((sum, byte) => sum + byte, 0);
        header.write(`${(checksum + Number(corrupt)).toString(8).padStart(6, '0')}\0 `, 148);
        chunks.push(header, content, Buffer.alloc((512 - (content.length % 512)) % 512));
    }
    return gzipSync(Buffer.concat([...chunks, Buffer.alloc(1024)]));
}

function fixture(definition, artifactVersion = version) {
    const source = { name: definition.name,
        dependencies: { react: '^18.2.0', ...Object.fromEntries(definition.runtimeDependencies.map(name => [name, 'workspace:*'])) },
        peerDependencies: { '@fluentui/react': '^8.0.0' },
        publishConfig: { main: 'build/lib/index.js', module: 'build/lib/index.js', types: 'build/lib/index.d.ts',
            exports: { '.': './build/lib/index.js', './index.css': './build/lib/index.css' } } };
    if (definition.directory === 'libs/designer-ui-v2') source.publishConfig.exports['./metrics'] = './build/lib/metrics.js';
    const contract = buildManifestContract(definition, source, artifactVersion);
    const packed = { name: definition.name, version: artifactVersion, ...source.publishConfig, dependencies: contract.dependencies, peerDependencies: contract.peerDependencies };
    const content = [
        ['index.js', 'export {};', { prefix: 'package/build/lib' }],
        ['package/build/lib/index.d.ts', 'export {};'],
        ['package/build/lib/index.css', 'div {}'],
        ['package/build/lib/metrics.js', 'export {};'],
        ['package/build/lib/_graph-layout/index.d.ts', 'export {};'],
    ];
    const pack = (manifest = packed, files = content) => tar([['package/package.json', JSON.stringify(manifest)], ...files]);
    return { source, contract, packed, content, pack };
}

function artifactFixture(provenance = verified) {
    const dir = workspace();
    const contracts = Object.fromEntries(COHORT.map(item => {
        const { pack, contract } = fixture(item, provenance.version);
        const filename = `${item.name.slice(1).replace('/', '-')}-${provenance.version}.tgz`;
        fs.writeFileSync(path.join(dir, filename), pack());
        return [item.name, contract];
    }));
    return { dir, contracts, record: validateArtifactFiles(dir, provenance, contracts, { prepare: true }) };
}

function isolatedFeedFixture({ missing = new Set(), empty = false, upstream = new Set(), provenance = verified } = {}) {
    const pinnedFeed = { id: 'logicappsux-npm-e2e.invalid', name: 'logicappsux-npm-e2e', registry: 'https://logicappsux-feed.invalid/npm/registry/' };
    const state = new Map();
    const writes = [];
    const stored = new Map();
    const { dir, contracts, record } = artifactFixture(provenance);
    const branch = provenance.kind === 'branch-e2e';
    const tagField = branch ? 'testTag' : 'latest';
    for (const pkg of record.packages) {
        if (empty) continue;
        if (missing.has(pkg.name)) {
            const previousIntegrity = digest(Buffer.from(`${pkg.name}@${previousVersion}`)).integrity;
            state.set(pkg.name, { latest: previousVersion, versions: new Map([[previousVersion, previousIntegrity]]) });
        } else {
            state.set(pkg.name, { latest: pkg.version, versions: new Map([[pkg.version, pkg.integrity]]) });
            stored.set(pkg.name, fs.readFileSync(path.join(dir, pkg.file)));
        }
    }
    const metadata = name => {
        if (!state.has(name)) {
            return {
                protocol: FIXTURE_PROTOCOL,
                packageName: name,
                status: 404,
            };
        }
        const snapshot = state.get(name);
        return {
            protocol: FIXTURE_PROTOCOL,
            packageName: name,
            status: 200,
            [tagField]: snapshot.latest,
            versions: [...snapshot.versions.entries()].map(([pkgVersion, integrity]) => ({ name, version: pkgVersion, integrity })),
        };
    };
    const inventory = name => {
        const snapshot = state.get(name);
        const events = [];
        if (snapshot) {
            for (const [pkgVersion, integrity] of snapshot.versions.entries()) {
                events.push({ type: 'version', version: pkgVersion, integrity });
            }
        }
        if (upstream.has(name)) events.push({ type: 'upstream', version: provenance.version });
        return [
            { protocol: FIXTURE_PROTOCOL, packageName: name, events: events.slice(0, 1), nextCursor: events.length > 1 ? 'next' : null, complete: events.length <= 1 },
            { protocol: FIXTURE_PROTOCOL, packageName: name, events: events.slice(1), nextCursor: null, complete: true },
        ];
    };
    const operations = {
        async readAuthenticatedFeedIdentity() {
            return pinnedFeed;
        },
        async readPackageMetadata(name) {
            return metadata(name);
        },
        async readPackageInventoryPage(name, cursor) {
            const pages = inventory(name);
            return cursor === 'next' ? pages[1] : pages[0];
        },
        async writePackage(entry, bytes, tag = distTag) {
            assert.equal(tag, branch ? 'ado-e2e' : distTag);
            assert.deepEqual(digest(bytes), { integrity: entry.integrity, bytes: entry.bytes, sha256: entry.sha256 });
            writes.push(entry.name);
            const versions = state.get(entry.name)?.versions ?? new Map();
            versions.set(entry.version, entry.integrity);
            state.set(entry.name, { latest: entry.version, versions });
            stored.set(entry.name, Buffer.from(bytes));
        },
        async downloadPackage(name, pkgVersion) {
            const pkg = record.packages.find(item => item.name === name && item.version === pkgVersion);
            const bytes = stored.get(name);
            return {
                protocol: FIXTURE_PROTOCOL,
                status: 200,
                bytes,
                integrity: digest(bytes).integrity,
                resolvedUrl: `${pinnedFeed.registry}${encodeURIComponent(name)}/-/${pkg.file}`,
            };
        },
        async verifyConsumerInstall(request) {
            assert.equal(request.scriptsDisabled, true);
            assert.equal(request.registry, pinnedFeed.registry);
            assert.deepEqual(request.packages, record.packages.map(({ name, version: pkgVersion }) => ({ name, version: pkgVersion })));
            return {
                protocol: FIXTURE_PROTOCOL,
                scriptsDisabled: true,
                entries: record.packages.map(pkg => ({
                    name: pkg.name,
                    version: pkg.version,
                    integrity: pkg.integrity,
                    resolvedUrl: `${pinnedFeed.registry}${encodeURIComponent(pkg.name)}/-/${pkg.file}`,
                })),
            };
        },
    };
    return {
        dir,
        contracts,
        pinnedFeed,
        record,
        operations,
        stored,
        writes,
        options: {
            artifactRoot: dir,
            verified: provenance,
            contracts,
            pinnedFeed,
            readFeedIdentity: async () => pinnedFeed,
            openFeedOperations: async () => operations,
        },
    };
}

const json = (body, status = 200, redirected = false) => ({ status, redirected, text: async () => JSON.stringify(body) });

test('rejects whitespace, non-stable refs and queue macro text before any request', async () => {
    assert.deepEqual(parseReleaseRef(releaseRef), { version, tag: 'v5.1022.0' });
    for (const ref of [`${releaseRef}\n`, 'refs/heads/main', 'refs/tags/v05.1022.0', 'refs/tags/v5.1022.0-beta.1', '$(System.AccessToken)']) {
        assert.throws(() => parseReleaseRef(ref), /Invalid releaseRef/);
    }
    await assert.rejects(verifyReleaseMetadata({ releaseRef, expectedSha: `${commitSha} `, fetchImpl: assert.fail }), /full 40-character/);
    await assert.rejects(main(['snapshot-source', '--release-ref'], {}, assert.fail), /only accept inputs from their environment/);
});

test('requires a published release and an annotated tag peeled to the expected commit', async () => {
    const tagObject = '773772347897c57b58c9bf51ec7cc7bb27d24581';
    const responses = new Map([
        ['releases/tags/v5.1022.0', { id: 7, tag_name: 'v5.1022.0', draft: false, prerelease: false, published_at: '2026-11-18T16:55:54Z' }],
        ['git/ref/tags/v5.1022.0', { ref: releaseRef, object: { type: 'tag', sha: tagObject } }],
        [`git/tags/${tagObject}`, { sha: tagObject, tag: 'v5.1022.0', object: { type: 'commit', sha: commitSha } }],
        [`git/commits/${commitSha}`, { sha: commitSha }],
    ]);
    const fetchImpl = async url => json(responses.get(url.split('/LogicAppsUX/')[1]));
    assert.equal((await verifyReleaseMetadata({ releaseRef, expectedSha: commitSha.toUpperCase(), fetchImpl })).commitSha, commitSha);
    await assert.rejects(verifyReleaseMetadata({ releaseRef, expectedSha: 'a'.repeat(40), fetchImpl }), /does not match expectedSha/);
    delete responses.get('releases/tags/v5.1022.0').published_at;
    await assert.rejects(verifyReleaseMetadata({ releaseRef, expectedSha: commitSha, fetchImpl }), /not a verified published/);
});

test('verifies release metadata before checkout and rejects a different checked-out HEAD', async () => {
    const root = workspace();
    const provenance = path.join(root, 'provenance.json');
    const contract = path.join(root, 'contract.json');
    const fetchImpl = async url => {
        const key = url.split('/LogicAppsUX/')[1];
        if (key === 'releases/tags/v5.1022.0') {
            return json({ id: 7, tag_name: 'v5.1022.0', draft: false, prerelease: false, published_at: '2026-11-18T16:55:54Z' });
        }
        if (key === 'git/ref/tags/v5.1022.0') return json({ ref: releaseRef, object: { type: 'commit', sha: commitSha } });
        if (key === `git/commits/${commitSha}`) return json({ sha: commitSha });
        throw new Error(`Unexpected source lookup: ${key}`);
    };
    const env = {
        RELEASE_REF: releaseRef, EXPECTED_SHA: commitSha, PROVENANCE_FILE: provenance,
        SOURCE_ROOT: process.cwd(), CONTRACT_FILE: contract,
    };
    await main(['verify-source'], env, fetchImpl, () => {});
    assert.equal(JSON.parse(fs.readFileSync(provenance, 'utf8')).commitSha, commitSha);
    await assert.rejects(main(['snapshot-source'], env, fetchImpl, () => {}), /Checked out commit.*does not match/);
    assert.equal(fs.existsSync(contract), false);
    fs.writeFileSync(provenance, JSON.stringify({ ...JSON.parse(fs.readFileSync(provenance, 'utf8')), releaseId: 8 }));
    await assert.rejects(main(['snapshot-source'], env, fetchImpl, () => {}), /Release metadata changed/);
});

test('artifact preparation stops on HEAD mismatch before consuming tarballs', async () => {
    const saved = path.join(workspace(), 'source.json');
    fs.writeFileSync(saved, JSON.stringify({ verified }));
    await assert.rejects(prepareArtifact({ CONTRACT_FILE: saved, SOURCE_ROOT: process.cwd() }, assert.fail), /Checked out commit.*does not match/);
});

test('requires a clean source checkout before snapshot and build', () => {
    const root = workspace();
    const result = spawnSync('git', ['init', '--quiet', root], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotThrow(() => verifyCleanCheckout(root));
    fs.writeFileSync(path.join(root, 'untracked.js'), 'fixture');
    assert.throws(() => verifyCleanCheckout(root), /modified or untracked/);
});

test('source contract requires all cohort workspace edges and rejects excluded packages', () => {
    const definition = COHORT[4];
    const { source } = fixture(definition);
    const [dependency] = definition.runtimeDependencies;
    assert.equal(buildManifestContract(definition, source, version).dependencies[dependency], version);
    assert.throws(() => buildManifestContract(definition, { ...source, dependencies: { ...source.dependencies, [dependency]: 'workspace:^' } }, version), /expected workspace:\*/);
    assert.throws(() => buildManifestContract(definition, { ...source, optionalDependencies: { '@microsoft/logic-apps-chat': '^0.1.0' } }, version), /unexpected external/);
});

test('sanitizes source-derived validation errors before they reach the agent log', () => {
    const definition = COHORT[0];
    const { source } = fixture(definition);
    const untrustedName = '##vso[task.setvariable variable=example]value';
    source.dependencies[untrustedName] = 'workspace:*';
    assert.throws(() => buildManifestContract(definition, source, version), error => {
        assert(error.message.includes(untrustedName));
        assert(!sanitizeAgentOutput(error.message).includes('##'));
        return true;
    });
});

test('sanitizes the CLI error path before writing to stderr', () => {
    const root = workspace();
    const result = spawnSync(process.execPath, [path.join('scripts', 'ado-npm-publisher.cjs'), 'prepare-artifact'], {
        env: { ...process.env, CONTRACT_FILE: path.join(root, '##vso[task.setvariable variable=example]value') },
        encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /vso\[task\.setvariable/);
    assert(!result.stderr.includes('##'));
});

test('requires Designer v2 build prerequisites on its specific Turbo task', () => {
    const designerTask = '@microsoft/logic-apps-designer-v2#build:lib';
    const prerequisites = ['@microsoft/designer-ui-v2#build:lib', '@microsoft/logic-apps-graph-layout#build:lib'];
    const config = { tasks: { 'build:lib': {}, [designerTask]: { dependsOn: prerequisites } } };
    assert.doesNotThrow(() => verifyBuildPrerequisites(config));
    assert.throws(() => verifyBuildPrerequisites({ tasks: { 'build:lib': { dependsOn: prerequisites } } }), /Missing Turbo prerequisite/);
    assert.throws(() => verifyBuildPrerequisites({ tasks: { [designerTask]: { dependsOn: [prerequisites[0]] } } }), /graph-layout/);
});

test('builds and packs only the verified cohort after checking each version rewrite', () => {
    const root = workspace();
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    const contracts = {};
    for (const item of COHORT) {
        const { contract, source: manifest } = fixture(item);
        const dir = path.join(source, item.directory);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ ...manifest, version: '5.110.0' }));
        contracts[item.name] = contract;
    }
    const calls = [];
    const logs = [];
    const run = (command, args, options) => {
        calls.push({ command, args, cwd: options.cwd });
        assert.deepEqual(options.stdio, ['ignore', 'pipe', 'pipe']);
        if (command === process.execPath) {
            for (const item of COHORT) {
                const file = path.join(source, item.directory, 'package.json');
                fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file, 'utf8')), version }));
            }
        }
        return { status: 0, stdout: '##vso[task.prependpath]/tmp/untrusted\n', stderr: '##[error]untrusted\n' };
    };
    const env = { SOURCE_ROOT: source, ARTIFACT_ROOT: output };
    const snapshot = JSON.parse(JSON.stringify({ verified, contracts }));
    buildCohort(env, snapshot, run, text => logs.push(text));
    assert(logs.some(text => text.includes('vso[task.prependpath]')));
    assert(logs.every(text => !text.includes('##')));
    assert.deepEqual(calls.slice(0, 3).map(call => call.args), [
        ['pnpm', 'install', '--recursive', '--frozen-lockfile', '--strict-peer-dependencies'],
        ['scripts/update-versions.js', version],
        ['pnpm', 'run', 'build:lib'],
    ]);
    assert.deepEqual(calls.slice(3).map(call => call.args), COHORT.map(item =>
        ['pnpm', '--dir', path.join(source, item.directory), 'pack', '--pack-destination', output]));
    assert(calls.every(call => call.cwd === source));

    fs.rmSync(output, { recursive: true });
    const failingRewrite = (command, args) => ({ status: command === process.execPath ? 1 : 0 });
    assert.throws(() => buildCohort(env, snapshot, failingRewrite), /failed: exit 1/);

    fs.rmSync(output, { recursive: true });
    const first = path.join(source, COHORT[0].directory, 'package.json');
    fs.writeFileSync(first, JSON.stringify({ ...JSON.parse(fs.readFileSync(first, 'utf8')), version: '5.110.0' }));
    const attempted = [];
    assert.throws(() => buildCohort(env, snapshot, (command, args) => {
        attempted.push(args);
        return { status: 0 };
    }), /version rewrite failed/);
    assert.equal(attempted.length, 2);
});

test('validates ustar prefix, entry types, checksums and entrypoint files without a leading ./', () => {
    const item = COHORT[0];
    const { contract, pack, content, packed } = fixture(item);
    const validate = buffer => validateTarballArtifact(buffer, item, version, contract);
    assert.equal(validate(pack()).name, item.name);
    assert.throws(() => validate(pack(packed, content.slice(1))), /missing required packed entry.*index.js/);
    assert.throws(() => validate(pack(packed, [...content, ['package/../escape', 'x']])), /tar entry path/);
    assert.throws(() => validate(pack(packed, [...content, ['package/link', '', { type: '2' }]])), /tar entry type/);
    assert.throws(() => validate(pack(packed, [...content, ['package/bad', 'x', { corrupt: true }]])), /checksum failure/);
    assert.throws(() => validate(pack(packed, [...content, ['package/build/lib/.npmrc', 'x']])), /outside the library package/);
});

test('reads actual local npm pack output from a synthetic library without running lifecycle scripts', () => {
    const item = COHORT[0];
    const { contract, packed } = fixture(item);
    const root = workspace();
    const config = path.join(root, 'empty.npmrc');
    fs.writeFileSync(config, '');
    fs.mkdirSync(path.join(root, 'build/lib'), { recursive: true });
    for (const file of ['index.js', 'index.d.ts', 'index.css']) fs.writeFileSync(path.join(root, 'build/lib', file), 'fixture');
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ ...packed, files: ['build/lib/**/*'] }));
    const result = spawnSync('npm', ['pack', '--offline', '--ignore-scripts', '--json', '--prefix', root, '--userconfig', config,
        '--globalconfig', '/dev/null', '--cache', path.join(root, 'cache')], { cwd: root, env: { HOME: root, PATH: process.env.PATH }, encoding: 'utf8' });
    assert.equal(result.status, 0, 'npm pack fixture failed');
    const [{ filename }] = JSON.parse(result.stdout);
    assert.equal(validateTarballArtifact(fs.readFileSync(path.join(root, filename)), item, version, contract).file, filename);
});

test('rejects file ancestors in either tar order and noncanonical root manifests', () => {
    const item = COHORT[0];
    const { contract, pack, packed, content } = fixture(item);
    const validate = files => validateTarballArtifact(pack(packed, files), item, version, contract);
    const collision = [['package/build/lib/parent', 'file'], ['package/build/lib/parent/child.js', 'child']];
    for (const files of [collision, [...collision].reverse()]) {
        assert.throws(() => validate([...content, ...files]), /directory ancestor/);
    }
    assert.throws(() => validate([...content, ['package/PACKAGE.JSON', '{}']]), /Noncanonical package manifest/);
    assert.equal(validate([['package/build/lib', '', { type: '5' }], ...content]).name, item.name);
});

test('rejects case-insensitive file and ancestor collisions in either tar order', () => {
    const item = COHORT[0];
    const { contract, pack, packed, content } = fixture(item);
    const validate = files => validateTarballArtifact(pack(packed, files), item, version, contract);
    const collisions = [
        [['package/build/lib/Component.js', 'a'], ['package/build/lib/component.js', 'b']],
        [['package/build/lib/Parent', 'file'], ['package/build/lib/parent/child.js', 'child']],
        [['package/build/lib/Folder/file.js', 'a'], ['package/build/lib/folder/FILE.js', 'b']],
        [['package/build/lib/Caf\u00e9.js', 'a'], ['package/build/lib/CAFE\u0301.js', 'b']],
    ];
    for (const pair of collisions) {
        for (const files of [pair, [...pair].reverse()]) {
            assert.throws(() => validate([...content, ...files]), /duplicate tar entry path|directory ancestor/);
        }
    }
});

test('rejects private packages, publish overrides, hooks and changed external requirements', () => {
    const item = COHORT[0];
    const { contract, pack, packed } = fixture(item);
    const validate = changes => validateTarballArtifact(pack({ ...packed, ...changes }), item, version, contract);
    assert.throws(() => validate({ private: true }), /private package/);
    assert.throws(() => validate({ publishConfig: { tag: 'latest' } }), /unexpected publishConfig/);
    assert.throws(() => validate({ publishConfig: { registry: 'https://other.invalid/' } }), /unexpected publishConfig/);
    assert.throws(() => validate({ scripts: { prepublishOnly: 'false' } }), /lifecycle hook/);
    assert.throws(() => validate({ dependencies: { react: '^17' } }), /packed dependencies differs/);
});

test('revalidates every tarball against the same source contract even when uploaded digests match', () => {
    const { dir, contracts, record } = artifactFixture();
    const manifestFile = path.join(dir, MANIFEST_FILE_NAME);
    assert.deepEqual(validateArtifactFiles(dir, verified, contracts), record);
    const { pack, packed } = fixture(COHORT[0]);
    const forged = pack({ ...packed, peerDependencies: { '@fluentui/react': '^7' } });
    fs.writeFileSync(path.join(dir, record.packages[0].file), forged);
    assert.throws(() => validateArtifactFiles(dir, verified, contracts), /identity or integrity mismatch/);
    Object.assign(record.packages[0], digest(forged));
    fs.writeFileSync(manifestFile, JSON.stringify(record));
    assert.throws(() => validateArtifactFiles(dir, verified, contracts), /packed peerDependencies differs/);
});

test('rejects provenance changes, artifact path traversal and symlink tarballs', () => {
    const { dir, contracts, record } = artifactFixture();
    const file = path.join(dir, MANIFEST_FILE_NAME);
    const validate = () => validateArtifactFiles(dir, verified, contracts);
    fs.writeFileSync(file, JSON.stringify({ ...record, source: { ...record.source, verifiedSha: 'a'.repeat(40) } }));
    assert.throws(validate, /source provenance mismatch/);
    const first = record.packages[0];
    fs.writeFileSync(file, JSON.stringify({ ...record, packages: [{ ...first, file: `../${first.file}` }, ...record.packages.slice(1)] }));
    assert.throws(validate, /identity or integrity mismatch/);
    fs.writeFileSync(file, JSON.stringify(record));
    const target = path.join(dir, first.file);
    fs.renameSync(target, path.join(workspace(), first.file));
    fs.symlinkSync('anything', target);
    assert.throws(validate, /ELOOP/);
});

test('uses only exact-scope npm credentials and asserts npm registry from an empty cwd', () => {
    const root = workspace();
    const cwd = path.join(root, 'empty');
    fs.mkdirSync(cwd);
    const config = path.join(root, 'config.npmrc');
    fs.writeFileSync(config, `registry=${DESTINATION_REGISTRY}\n${DESTINATION_REGISTRY.slice(6)}:_authToken=fake-token\n`);
    assert.equal(readNpmAuthorization(config), 'Bearer fake-token');
    // Real local npm config resolution (no network) and a separate fake subprocess to inspect write arguments.
    npmRunner(config, cwd);
    fs.rmSync(path.join(cwd, 'cache'), { force: true, recursive: true });
    const calls = [];
    const write = npmRunner(config, cwd, (_, args, options) => {
        calls.push(args);
        assert.equal(options.cwd, cwd);
        assert.deepEqual(Object.keys(options.env).sort(), ['HOME', 'PATH']);
        return { status: 0, stdout: DESTINATION_REGISTRY };
    });
    write(path.join(root, 'package.tgz'), distTag);
    write(path.join(root, 'package.tgz'), 'latest', true);
    assert(!calls[0].includes('--registry'));
    assert(calls[1].includes('--ignore-scripts') && calls[1].includes(distTag));
    assert(calls[2].includes('--ignore-scripts') && calls[2].includes('--dry-run') && calls[2].includes('latest'));
    fs.appendFileSync(config, '@microsoft:registry=https://other.invalid/\n');
    assert.throws(() => readNpmAuthorization(config), /Unexpected or duplicate/);
});

const entry = { name: COHORT[0].name, version, integrity: digest(Buffer.from('same')).integrity };
const old = previousVersion;
const packument = (name = entry.name, tags = { latest: old }, versions = [old]) => ({
    name, 'dist-tags': tags, versions: Object.fromEntries(versions.map(value => [value, { name, version: value }])),
});
const exact = { name: entry.name, version, dist: { integrity: entry.integrity } };

test('npm dry run uses latest without writes and stops on the first failure', () => {
    const packages = [
        { ...entry, file: 'one.tgz' },
        { ...entry, name: COHORT[1].name, file: 'two.tgz' },
        { ...entry, name: COHORT[2].name, file: 'three.tgz' },
    ];
    const calls = [];
    const run = (file, tag, isDryRun) => {
        calls.push({ file, tag, isDryRun });
        return { status: calls.length === 2 ? 1 : 0 };
    };
    assert.throws(() => dryRunCohort({ packages }, '/artifact', run, () => {}), /dry run failed/);
    assert.deepEqual(calls, [
        { file: '/artifact/one.tgz', tag: 'latest', isDryRun: true },
        { file: '/artifact/two.tgz', tag: 'latest', isDryRun: true },
    ]);
});

test('requires authenticated HTTP 200 on the exact feed ID and rejects redirects', async () => {
    const fake = async (url, opts) => {
        assert(url.includes(`/${DESTINATION_FEED_ID}?`));
        assert.equal(opts.redirect, 'error');
        assert.equal(opts.headers.authorization, 'Bearer fake-token');
        return json({ id: DESTINATION_FEED_ID, name: 'microsoft-logic-apps' });
    };
    await authenticateFeed('fake-token', fake);
    await assert.rejects(authenticateFeed('fake-token', async () => json({ id: 'another-feed' })), /identity mismatch/);
    await assert.rejects(authenticateFeed('fake-token', async () => json({}, 200, true)), /unexpected HTTP/);
});

test('only authenticated successful package metadata supplies absence evidence', async () => {
    for (const status of [401, 403, 404, 429, 500]) {
        const registry = createRegistry('Bearer fake-token', async (url, options) => {
            assert.equal(url, `${DESTINATION_REGISTRY}${encodeURIComponent(entry.name)}`);
            assert.equal(options.headers.authorization, 'Bearer fake-token');
            return json({ code: 'E404' }, status);
        });
        assert.equal((await classifyPackageState(registry, entry, distTag)).status, 'unknown');
    }
    assert.equal((await classifyPackageState(async () => packument(), entry, distTag)).status, 'absent');
    assert.equal((await classifyPackageState(async () => ({ name: entry.name, 'dist-tags': {}, versions: [] }), entry, distTag)).status, 'unknown');
});

test('rejects backfills and requires existing identical versions to already be latest', async () => {
    const newer = '5.1023.0';
    const pre = name => packument(name, { latest: newer }, [old, newer]);
    assert.equal((await classifyPackageState(pre, entry, distTag)).status, 'conflict');
    const existing = name => {
        const doc = packument(name, { latest: old }, [old, version]);
        doc.versions[version] = exact;
        return doc;
    };
    assert.equal((await classifyPackageState(existing, entry, distTag)).status, 'conflict');
    const prerelease = name => packument(name, { latest: '5.1021.0-beta.1' }, ['5.1021.0-beta.1']);
    assert.equal((await classifyPackageState(prerelease, entry, distTag)).status, 'unknown');
    const numeric = latest => name => packument(name, { latest }, [latest]);
    assert.equal((await classifyPackageState(numeric('5.99.0'), entry)).status, 'absent');
    assert.equal((await classifyPackageState(numeric('5.10210.0'), entry)).status, 'conflict');
});

test('reports newer stable versions outside latest without assuming their release order', async () => {
    for (const newer of ['5.1023.0', '5.1023.0+build.1']) {
        const registry = name => packument(name, { latest: old }, [old, newer]);
        const state = await classifyPackageState(registry, entry);
        assert.equal(state.status, 'absent');
        assert.match(state.warning, /newer stable version.*release order is unverified/i);
    }
    const prerelease = name => packument(name, { latest: old }, [old, '5.1023.0-beta.1']);
    assert.equal((await classifyPackageState(prerelease, entry)).status, 'absent');
    const sameVersion = name => packument(name, { latest: old }, [old, '5.1022.0+build.1']);
    assert.equal((await classifyPackageState(sameVersion, entry)).status, 'conflict');
});

test('requires exact name/version and matching canonical SHA-512 to skip a version', async () => {
    const lookup = metadata => name => {
        const doc = packument(name, { latest: version }, [old, version]);
        doc.versions[version] = metadata;
        return doc;
    };
    assert.equal((await classifyPackageState(lookup(exact), entry, distTag)).status, 'already-identical');
    assert.equal((await classifyPackageState(lookup({ ...exact, version: old }), entry, distTag)).status, 'unknown');
    assert.equal((await classifyPackageState(lookup({ ...exact, dist: {} }), entry, distTag)).status, 'unknown');
    const changed = { integrity: digest(Buffer.from('different')).integrity };
    assert.equal((await classifyPackageState(lookup({ ...exact, dist: changed }), entry, distTag)).status, 'conflict');
});

test('reconciles all nonzero write results without retry, even timeout and spawn exception', async () => {
    for (const writeResult of [{ status: 1 }, { status: 128 }, { status: null, error: 'ETIMEDOUT' }, undefined]) {
        let writes = 0;
        const lookups = [];
        const registry = name => {
            lookups.push(name);
            const doc = packument(name, { latest: version }, [old, version]);
            doc.versions[version] = exact;
            return doc;
        };
        const write = () => {
            writes++;
            if (!writeResult) throw new Error('spawn failure');
            return writeResult;
        };
        assert.equal((await publishPackage({ entry, registry, write })).status, 'already-identical');
        assert.equal(writes, 1);
        assert.deepEqual(lookups, [entry.name]);
    }
});

test('stops dependents for an unknown write or latest drift; no tag repair', async () => {
    const second = { ...entry, name: COHORT[1].name };
    const artifact = { destination: { distTag }, packages: [entry, second] };
    for (const drift of [false, true]) {
        const results = [];
        let writes = 0;
        const registry = name => {
            if (writes && !drift) throw new Error('read timed out');
            const doc = writes ? packument(name, { latest: old }, [old, version]) : packument(name);
            if (writes) doc.versions[version] = { ...exact, name };
            return doc;
        };
        const write = () => { writes++; return { status: drift ? 0 : 1 }; };
        await assert.rejects(processCohort(artifact, registry, write, line => results.push(line)), /Publication stopped/);
        assert.equal(writes, 1);
        assert.match(results[0], drift ? /latest does not point/ : /Publication outcome unknown/);
        assert.match(results[1], /not-attempted/);
    }
});

test('rechecks latest immediately before each write and stops when a newer version appears', async () => {
    const second = { ...entry, name: COHORT[1].name };
    const artifact = { destination: { distTag }, packages: [entry, second] };
    let firstReads = 0;
    const registry = name => {
        const latest = name === entry.name && ++firstReads > 1 ? '5.1023.0' : old;
        return packument(name, { latest }, [latest]);
    };
    const report = [];
    let writes = 0;
    await assert.rejects(processCohort(artifact, registry, () => { writes++; }, line => report.push(line)), /Publication stopped/);
    assert.equal(writes, 0);
    assert.match(report[0], /older than latest/);
    assert.match(report[1], /not-attempted/);
});

test('npmAuthenticate parent credentials, quoted values and always-auth do not mask conflicting scopes', () => {
    const config = path.join(workspace(), 'npmrc');
    const parent = DESTINATION_REGISTRY.slice(6).replace(/registry\/$/, '');
    fs.writeFileSync(config, `registry=${DESTINATION_REGISTRY}\nalways-auth=true\n${parent}:_authToken="fake-token"\n`);
    assert.equal(readNpmAuthorization(config), 'Bearer fake-token');
    fs.appendFileSync(config, `${DESTINATION_REGISTRY.slice(6)}:_authToken=different-token\n`);
    assert.throws(() => readNpmAuthorization(config), /Conflicting npm credential scopes/);
});

test('auth agrees with npm parsing without borrowing fields across credential scopes', () => {
    const config = path.join(workspace(), 'npmrc');
    const scope = DESTINATION_REGISTRY.slice(6);
    const parent = scope.replace(/registry\/$/, '');
    const npmRoot = resolveNpmRoot();
    const ini = require(path.join(npmRoot, 'node_modules/ini'));
    const getAuth = require(path.join(npmRoot, 'node_modules/npm-registry-fetch/lib/auth.js'));
    const password = Buffer.from('fake-password').toString('base64');
    const check = text => {
        fs.writeFileSync(config, `registry=${DESTINATION_REGISTRY}\n${text}`);
        const auth = getAuth(DESTINATION_REGISTRY, ini.parse(fs.readFileSync(config, 'utf8')));
        assert.equal(readNpmAuthorization(config), auth.token ? `Bearer ${auth.token}` : `Basic ${auth.auth}`);
    };
    for (const prefix of [scope, parent]) {
        check(`${prefix}:username=fake-user\n${prefix}:_password=${password}\n`);
        check(`${prefix}:_authToken=fake-token ; inline comment\n`);
        check(`${prefix}:_authToken="fake-token" # inline comment\n`);
        check(`${prefix}:_authToken='fake-token'\n`);
    }
    fs.writeFileSync(config, `${scope}:username=fake-user\n${parent}:_password=${password}\n`);
    assert.throws(() => readNpmAuthorization(config), /Missing or ambiguous credentials/);
});

test('resolves trusted npm lazily for symlink and regular launchers, failing closed when missing', () => {
    const root = workspace();
    const bin = path.join(root, 'bin');
    fs.mkdirSync(bin);
    const execPath = path.join(bin, 'node');
    const actualRoot = resolveNpmRoot();
    fs.symlinkSync(path.join(actualRoot, 'bin/npm-cli.js'), path.join(bin, 'npm'));
    assert.equal(resolveNpmRoot(execPath), actualRoot);
    fs.unlinkSync(path.join(bin, 'npm'));
    fs.writeFileSync(path.join(bin, 'npm'), '# regular launcher fixture\n');
    fs.mkdirSync(path.join(bin, 'node_modules'));
    fs.symlinkSync(actualRoot, path.join(bin, 'node_modules/npm'), 'dir');
    assert.equal(resolveNpmRoot(execPath), path.join(bin, 'node_modules/npm'));
    fs.unlinkSync(path.join(bin, 'node_modules/npm'));
    assert.throws(() => resolveNpmRoot(execPath), /missing a supported npm CLI/);
    fs.unlinkSync(path.join(bin, 'npm'));
    assert.throws(() => resolveNpmRoot(execPath), /missing a supported npm CLI/);
});

test('uses one coherent packument for preflight and each zero or nonzero write reconciliation', async () => {
    const complete = () => {
        const doc = packument(entry.name, { latest: version }, [old, version]);
        doc.versions[version] = structuredClone(exact);
        return doc;
    };
    let reads = 0;
    const initial = complete();
    delete initial.versions[version].dist;
    // The following response must not be used to fill holes in the first response.
    const preflight = await classifyPackageState(async () => ++reads === 1 ? initial : complete(), entry, distTag);
    assert.equal(preflight.status, 'unknown');
    assert.equal(reads, 1);
    for (const status of [0, 1]) {
        reads = 0;
        const wrongLatest = complete();
        wrongLatest['dist-tags'].latest = old;
        const result = await publishPackage({ entry, write: () => ({ status }),
            registry: async () => ++reads === 1 ? wrongLatest : complete() });
        assert.equal(result.status, 'failed');
        assert.match(result.reason, /latest does not point/);
        assert.equal(reads, 1);
    }
});

test('zero-exit publish still requires exact retained integrity and latest', async () => {
    const registry = metadata => async () => {
        const doc = packument(entry.name, { latest: version }, [old, version]);
        doc.versions[version] = metadata;
        return doc;
    };
    const write = () => ({ status: 0 });
    const call = metadata => publishPackage({ entry, registry: registry(metadata), write });
    assert.equal((await call(exact)).status, 'published');
    assert.match((await call({ ...exact, dist: { integrity: digest(Buffer.from('other')).integrity } })).reason, /conflict/);
    const missingTag = async () => {
        const doc = packument(entry.name, { latest: old }, [old, version]);
        doc.versions[version] = exact;
        return doc;
    };
    assert.match((await publishPackage({ entry, registry: missingTag, write: () => ({ status: 1 }) })).reason, /latest does not point/);
    assert.equal((await classifyPackageState(async () => packument(entry.name, {}, [old]), entry, distTag)).status, 'unknown');
});

test('stops later writes when a same-precedence variant appears during reconciliation', async () => {
    const second = { ...entry, name: COHORT[1].name };
    const artifact = { destination: { distTag }, packages: [entry, second] };
    let writes = 0;
    const registry = name => {
        if (!writes) return packument(name);
        const doc = packument(name, { latest: version }, [old, version, `${version}+build.1`]);
        doc.versions[version] = { ...exact, name };
        return doc;
    };
    const report = [];
    await assert.rejects(processCohort(artifact, registry, () => { writes++; return { status: 0 }; }, line => report.push(line)),
        /Publication stopped/);
    assert.equal(writes, 1);
    assert.match(report[0], /ambiguous release precedence/);
    assert.match(report[1], /not-attempted/);
});

test('blocks every write if any preflight fails, and keeps the production command disabled', async () => {
    const second = { ...entry, name: COHORT[1].name };
    const artifact = { destination: { distTag }, packages: [entry, second] };
    const registry = name => name === entry.name ? packument(name) : {};
    await assert.rejects(processCohort(artifact, registry, assert.fail, () => {}), /zero package writes/);
    await assert.rejects(main(['feed'], { PUBLISHER_MODE: 'publish' }, assert.fail, assert.fail), /Publication blocked/);
});

test('blocks isolated test-feed CLI path before reading environment or network state', async () => {
    await assert.rejects(
        main(['isolated-test-feed'], new Proxy({}, { get: () => { throw new Error('env should not be read'); } }), assert.fail, assert.fail),
        /fixture-only.*rejected before environment/i,
    );
});

test('isolated feed path rejects production identities and non-.invalid registries', () => {
    assert.throws(() => assertPinnedIsolatedIdentity({
        id: DESTINATION_FEED_ID,
        name: 'microsoft-logic-apps',
        registry: 'https://logicappsux-feed.invalid/npm/registry/',
    }), /cannot target production/);
    assert.throws(() => assertPinnedIsolatedIdentity({
        id: 'test',
        name: 'test',
        registry: 'https://feeds.dev.azure.com/msazure/One/_packaging/test/npm/registry/',
    }), /\.invalid host/);
});

test('isolated preflight validates all 9 retained packages with zero writes', async () => {
    const fixtureState = isolatedFeedFixture();
    const result = await runIsolatedTestFeedPath(fixtureState.options);
    assert.equal(result.summary['already-identical'], COHORT.length);
    assert.equal(result.summary.writes, 0);
    assert.equal(fixtureState.writes.length, 0);
});

test('isolated publish writes only missing packages and replays same artifact with zero writes', async () => {
    const missing = new Set(COHORT.slice(0, 3).map(item => item.name));
    const fixtureState = isolatedFeedFixture({ missing });
    const first = await runIsolatedTestFeedPath({ ...fixtureState.options, mode: 'publish' });
    assert.equal(first.summary.writes, 3);
    assert.equal(fixtureState.writes.length, 3);
    const second = await runIsolatedTestFeedPath({ ...fixtureState.options, mode: 'publish' });
    assert.equal(second.summary.writes, 0);
    assert.equal(fixtureState.writes.length, 3);
});

test('isolated publish writes all nine to an empty fixture and replays without writes', async () => {
    const { options, writes } = isolatedFeedFixture({ empty: true });
    const preflight = await runIsolatedTestFeedPath(options);
    assert.deepEqual(preflight.summary, { writes: 0, absent: COHORT.length });
    const publish = { ...options, mode: 'publish' };
    assert.deepEqual((await runIsolatedTestFeedPath(publish)).summary, { writes: COHORT.length, 'already-identical': COHORT.length });
    assert.deepEqual((await runIsolatedTestFeedPath(publish)).summary, { writes: 0, 'already-identical': COHORT.length });
    assert.deepEqual(writes, COHORT.map(({ name }) => name));
});

test('isolated publish blocks uncorroborated 404, permission failures, and ambiguous inventory before any writes', async t => {
    const name = COHORT[0].name;
    for (const [label, empty, overrides, error] of [
        ['404 with a retained version', false, { readPackageMetadata: packageName => ({ protocol: FIXTURE_PROTOCOL, packageName, status: 404 }) }, /404 disagrees/],
        ['permission denied despite empty inventory', true, { readPackageMetadata: packageName => ({ protocol: FIXTURE_PROTOCOL, packageName, status: 403 }) }, /status 403/],
        ['partial inventory', true, { readPackageInventoryPage: packageName => ({ protocol: FIXTURE_PROTOCOL, packageName, events: [], nextCursor: null, complete: false }) }, /complete terminal/],
        ['deleted release variant', true, { readPackageInventoryPage: packageName => ({ protocol: FIXTURE_PROTOCOL, packageName, events: [{ type: 'deleted', version: `${version}+other` }], nextCursor: null, complete: true }) }, /deleted or upstream/],
        ['duplicate inventory across pages', true, { readPackageInventoryPage: (packageName, cursor) => ({ protocol: FIXTURE_PROTOCOL, packageName, events: [{ type: 'deleted', version: previousVersion }], nextCursor: cursor ? null : 'next', complete: Boolean(cursor) }) }, /duplicate version/],
        ['mismatched authenticated identity', true, { readAuthenticatedFeedIdentity: pinned => ({ ...pinned, id: 'other-feed' }) }, /Authenticated identity mismatch/],
    ]) {
        await t.test(label, async () => {
            const { options, operations, writes } = isolatedFeedFixture({ empty, missing: new Set([COHORT[1].name]) });
            const overridden = { ...operations };
            for (const [method, override] of Object.entries(overrides)) {
                overridden[method] = (...args) => method === 'readAuthenticatedFeedIdentity' || args[0] === name ? override(...args) : operations[method](...args);
            }
            await assert.rejects(runIsolatedTestFeedPath({ ...options, mode: 'publish', openFeedOperations: async () => overridden }), error);
            assert.deepEqual(writes, []);
        });
    }
});

test('isolated publish rejects conflicting metadata and retained bytes before writing missing packages', async t => {
    const missing = new Set([COHORT[0].name]);
    for (const [label, modifyMetadata, corrupt, error] of [
        ['duplicate metadata', metadata => ({ ...metadata, versions: [...metadata.versions, metadata.versions[0]] }), false, /invalid version entries/],
        ['same-precedence metadata', metadata => ({ ...metadata, versions: [...metadata.versions, { ...metadata.versions[0], version: `${version}+other` }] }), false, /same-precedence/],
        ['status or integrity disagreement', metadata => ({ ...metadata, versions: [{ ...metadata.versions[0], integrity: digest(Buffer.from('different')).integrity }] }), false, /disagree/],
        ['wrong retained tarball', metadata => metadata, true, /Download bytes do not match/],
    ]) {
        await t.test(label, async () => {
            const { options, operations, stored, writes } = isolatedFeedFixture({ missing });
            const name = COHORT[1].name;
            if (corrupt) stored.set(name, Buffer.from('not the retained tarball'));
            const readPackageMetadata = async packageName => {
                const metadata = await operations.readPackageMetadata(packageName);
                return packageName === name ? modifyMetadata(metadata) : metadata;
            };
            await assert.rejects(runIsolatedTestFeedPath({ ...options, mode: 'publish', openFeedOperations: async () => ({ ...operations, readPackageMetadata }) }), error);
            assert.deepEqual(writes, []);
        });
    }
});

test('isolated publish stops on a bad download before the next simulated write', async () => {
    const { options, operations, pinnedFeed, writes } = isolatedFeedFixture({ empty: true });
    const downloadPackage = async (...args) => ({
        ...await operations.downloadPackage(...args),
        resolvedUrl: `${pinnedFeed.registry}../other-registry/fake.tgz`,
    });
    await assert.rejects(runIsolatedTestFeedPath({ ...options, mode: 'publish', openFeedOperations: async () => ({ ...operations, downloadPackage }) }), /does not match the pinned registry/);
    assert.deepEqual(writes, [COHORT[0].name]);
});

test('isolated publish rechecks bytes on rerun after an acknowledged or unacknowledged simulated write', async t => {
    for (const landed of [true, false]) {
        await t.test(landed ? 'write landed before failure' : 'write did not land', async () => {
            const { options, operations, writes } = isolatedFeedFixture({ empty: true });
            const writePackage = async (entry, bytes) => {
                if (landed) await operations.writePackage(entry, bytes);
                throw new Error('simulated interruption');
            };
            const publish = { ...options, mode: 'publish' };
            await assert.rejects(runIsolatedTestFeedPath({ ...publish, openFeedOperations: async () => ({ ...operations, writePackage }) }), /simulated interruption/);
            assert.equal(writes.length, Number(landed));
            assert.equal((await runIsolatedTestFeedPath(publish)).summary.writes, COHORT.length - Number(landed));
            assert.equal((await runIsolatedTestFeedPath(publish)).summary.writes, 0);
            assert.deepEqual(writes, COHORT.map(({ name }) => name));
        });
    }
});

test('isolated consumer rejects duplicate records and an unexpected tarball URL', async t => {
    for (const [label, modify, error] of [
        ['duplicate records', entries => [...entries, entries[0]], /exactly one entry/],
        ['unexpected URL', entries => [{ ...entries[0], resolvedUrl: `${entries[0].resolvedUrl}?other=1` }, ...entries.slice(1)], /does not match the pinned registry/],
    ]) {
        await t.test(label, async () => {
            const { options, operations, writes } = isolatedFeedFixture();
            const verifyConsumerInstall = async request => {
                const consumer = await operations.verifyConsumerInstall(request);
                return { ...consumer, entries: modify(consumer.entries) };
            };
            await assert.rejects(runIsolatedTestFeedPath({ ...options, openFeedOperations: async () => ({ ...operations, verifyConsumerInstall }) }), error);
            assert.deepEqual(writes, []);
        });
    }
});

test('branch provenance rejects unreviewed sources and requires the pipeline SHA to match', () => {
    assert.throws(() => branchProvenance({ ...branchEnv, SOURCE_REPOSITORY: 'fork/LogicAppsUX' }), /GitHub repository/);
    assert.throws(() => branchProvenance({ ...branchEnv, SOURCE_BRANCH: 'refs/heads/main' }), /designated test branch/);
    assert.throws(() => branchProvenance({ ...branchEnv, SOURCE_VERSION: 'a'.repeat(40) }), /does not match the reviewed SHA/);
    assert.throws(() => branchProvenance({ ...branchEnv, BUILD_ID: '001' }), /positive Azure Pipelines build ID/);
});

test('branch tarballs pin all intra-cohort dependencies to the test version and cannot override the registry', () => {
    const provenance = branchProvenance(branchEnv);
    const definition = COHORT[1];
    const { source, contract, pack, packed } = fixture(definition, provenance.version);
    const override = { registry: DESTINATION_REGISTRY };
    assert.equal(contract.dependencies[COHORT[0].name], provenance.version);
    assert.throws(() => buildManifestContract(definition, { ...source, publishConfig: override }, provenance.version), /cannot override the registry/);
    assert.throws(() => validateTarballArtifact(pack({ ...packed, publishConfig: override }), definition, provenance.version, contract), /cannot override the registry/);
});

test('branch artifact cannot be reclassified as a release, even at the same commit', () => {
    const provenance = branchProvenance(branchEnv);
    const { dir, contracts, record } = artifactFixture(provenance);
    assert.equal(record.destination, null);
    assert.equal(record.source.version, `0.0.0-ado.${branchEnv.BUILD_ID}.g${commitSha}`);
    assert.throws(() => validateArtifactFiles(dir, { ...verified, version: provenance.version }, contracts), /source provenance mismatch/);
});

test('branch fixture writes nine test-tagged tarballs, then verifies them in a read-only replay', async () => {
    const provenance = branchProvenance(branchEnv);
    const { options, operations, writes } = isolatedFeedFixture({ empty: true, provenance });
    const { writePackage, ...reader } = operations;
    const replay = { ...options, mode: 'replay', openFeedOperations: async () => reader };
    await assert.rejects(runIsolatedTestFeedPath(replay), /requires all nine versions/);
    assert.deepEqual(writes, []);
    assert.deepEqual((await runIsolatedTestFeedPath({ ...options, mode: 'publish' })).summary, { writes: 9, 'already-identical': 9 });
    assert.deepEqual((await runIsolatedTestFeedPath(replay)).summary, { writes: 0, 'already-identical': 9 });
    assert.deepEqual(writes, COHORT.map(({ name }) => name));
});

test('branch fixture rejects a reserved test version already in upstream inventory', async () => {
    const provenance = branchProvenance(branchEnv);
    const { options, writes } = isolatedFeedFixture({ empty: true, provenance, upstream: new Set([COHORT[1].name]) });
    await assert.rejects(runIsolatedTestFeedPath({ ...options, mode: 'publish' }), /deleted or upstream/);
    assert.deepEqual(writes, []);
});

test('branch build is manual and opt-in, uses only self and cannot expand a feed stage', () => {
    const file = path.join(process.cwd(), '.azure-pipelines/npm-publish.yml');
    const yaml = fs.readFileSync(file, 'utf8');
    assert.match(yaml, /- name: requestLocalIsolatedTestFeed[\s\S]*default: false/);
    assert.match(yaml, /- name: runBranchBuild[\s\S]*default: false/);
    assert.match(yaml, /stage: PublicationBlocked[\s\S]*checkout: none[\s\S]*stage: BuildValidation/);
    assert.match(yaml, /checkout: self\s+clean: true\s+persistCredentials: false/);
    assert.doesNotMatch(yaml, /logicAppsUxRelease|sourceRepositoriesToScan|System\.AccessToken|npmAuthenticate|stage: Feed/);
});
