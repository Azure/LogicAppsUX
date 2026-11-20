const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const SOURCE_REPOSITORY = 'Azure/LogicAppsUX';
const SOURCE_API_BASE = `https://api.github.com/repos/${SOURCE_REPOSITORY}`;
const DESTINATION_REGISTRY = 'https://msazure.pkgs.visualstudio.com/One/_packaging/microsoft-logic-apps/npm/registry/';
const DESTINATION_FEED_ID = '44fc6edc-394a-403a-86cd-700a15978af1';
const DIST_TAG = 'latest';
const MANIFEST_FILE_NAME = 'publisher-artifact.json';
const PNPM_PIN = 'pnpm@9.1.3+sha512.7c2ea089e1a6af306409c4fc8c4f0897bdac32b772016196c469d9428f1fe2d5a21daf8ad6512762654ac645b5d9136bb210ec9a00afa8dbc4677843ba362ecd';

const COHORT = [
    { directory: 'libs/logic-apps-shared', name: '@microsoft/logic-apps-shared', runtimeDependencies: [] },
    { directory: 'libs/designer-ui', name: '@microsoft/designer-ui', runtimeDependencies: ['@microsoft/logic-apps-shared'] },
    { directory: 'libs/designer-ui-v2', name: '@microsoft/designer-ui-v2', runtimeDependencies: [] },
    { directory: 'libs/chatbot', name: '@microsoft/logic-apps-chatbot', runtimeDependencies: ['@microsoft/designer-ui', '@microsoft/logic-apps-shared'] },
    { directory: 'libs/designer', name: '@microsoft/logic-apps-designer', runtimeDependencies: ['@microsoft/designer-ui', '@microsoft/logic-apps-chatbot', '@microsoft/logic-apps-shared'] },
    {
        directory: 'libs/designer-v2',
        name: '@microsoft/logic-apps-designer-v2',
        runtimeDependencies: ['@microsoft/designer-ui', '@microsoft/designer-ui-v2', '@microsoft/logic-apps-chatbot', '@microsoft/logic-apps-shared'],
    },
    {
        directory: 'libs/data-mapper',
        name: '@microsoft/logic-apps-data-mapper',
        runtimeDependencies: ['@microsoft/designer-ui', '@microsoft/logic-apps-designer', '@microsoft/logic-apps-shared'],
    },
    {
        directory: 'libs/data-mapper-v2',
        name: '@microsoft/logic-apps-data-mapper-v2',
        runtimeDependencies: ['@microsoft/designer-ui', '@microsoft/logic-apps-shared'],
    },
    {
        directory: 'libs/vscode-extension',
        name: '@microsoft/vscode-extension-logic-apps',
        runtimeDependencies: ['@microsoft/logic-apps-shared'],
    },
];

const COHORT_BY_NAME = new Map(COHORT.map(definition => [definition.name, definition]));
const EXCLUDED_PACKAGES = new Set(['@microsoft/logic-apps-chat', '@microsoft/logic-apps-graph-layout', 'btm-data-mapper']);
const ENTRY_FIELDS = ['main', 'module', 'types', 'typings', 'style', 'exports'];
const DEPENDENCY_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies', 'peerDependenciesMeta'];

function parseReleaseRef(releaseRef) {
    const match = /^refs\/tags\/v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(releaseRef ?? '');
    if (!match || match[0] !== releaseRef || match[0].length > 100) {
        throw new Error('Invalid releaseRef. Expected refs/tags/v<major>.<minor>.<patch>.');
    }
    return { tag: `v${match[1]}.${match[2]}.${match[3]}`, version: `${match[1]}.${match[2]}.${match[3]}` };
}

function normalizeSha(input) {
    const normalized = String(input ?? '').toLowerCase();
    if (normalized.length !== 40 || !/^[0-9a-f]{40}$/.test(normalized)) {
        throw new Error('expectedSha must be a full 40-character hexadecimal commit SHA.');
    }
    return normalized;
}

async function fetchJson(url, fetchImpl = fetch, headers = {}, label = 'GitHub source read') {
    let response;
    try {
        response = await fetchImpl(url, {
            headers: { accept: 'application/json', 'user-agent': 'ado-additive-npm-publisher', ...headers },
            redirect: 'error',
            signal: AbortSignal.timeout(30_000),
        });
    } catch {
        throw new Error(`${label}: network, redirect or timeout failure.`);
    }
    if (response.status !== 200 || response.redirected) {
        throw new Error(`${label}: unexpected HTTP ${response.status}.`);
    }
    try {
        return JSON.parse(await response.text());
    } catch {
        throw new Error(`${label}: invalid JSON.`);
    }
}

async function verifyReleaseMetadata({ releaseRef, expectedSha, fetchImpl = fetch }) {
    const { tag, version } = parseReleaseRef(releaseRef);
    const normalizedExpectedSha = normalizeSha(expectedSha);
    const release = await fetchJson(`${SOURCE_API_BASE}/releases/tags/${encodeURIComponent(tag)}`, fetchImpl,
        { accept: 'application/vnd.github+json' }, 'GitHub release lookup');
    if (release?.tag_name !== tag || release.draft !== false || release.prerelease !== false ||
        !Number.isSafeInteger(release.id) || release.id <= 0 || !Number.isFinite(Date.parse(release.published_at))) {
        throw new Error(`Release '${tag}' is not a verified published stable release.`);
    }

    const tagRef = await fetchJson(`${SOURCE_API_BASE}/git/ref/tags/${encodeURIComponent(tag)}`, fetchImpl);
    if (tagRef?.ref !== `refs/tags/${tag}`) {
        throw new Error(`Release tag reference mismatch. Expected refs/tags/${tag}.`);
    }

    let peeledCommitSha;
    if (tagRef?.object?.type === 'commit') {
        peeledCommitSha = normalizeSha(tagRef.object.sha);
    } else if (tagRef?.object?.type === 'tag') {
        const tagSha = normalizeSha(tagRef.object.sha);
        const tagObject = await fetchJson(`${SOURCE_API_BASE}/git/tags/${tagSha}`, fetchImpl);
        if (tagObject?.sha !== tagSha || tagObject?.tag !== tag || tagObject?.object?.type !== 'commit') {
            throw new Error(`Annotated tag '${tag}' does not point to a commit.`);
        }
        peeledCommitSha = normalizeSha(tagObject.object.sha);
    } else {
        throw new Error(`Unsupported tag object type '${tagRef?.object?.type ?? 'unknown'}' for ${tag}.`);
    }

    if (peeledCommitSha !== normalizedExpectedSha) {
        throw new Error(`Tag commit SHA '${peeledCommitSha}' does not match expectedSha '${normalizedExpectedSha}'.`);
    }
    const commit = await fetchJson(`${SOURCE_API_BASE}/git/commits/${peeledCommitSha}`, fetchImpl);
    if (commit?.sha !== peeledCommitSha) throw new Error('GitHub commit response does not match the peeled tag.');

    return {
        sourceRepository: SOURCE_REPOSITORY,
        releaseTag: tag,
        version,
        commitSha: peeledCommitSha,
        releaseId: release?.id,
        releaseUrl: release?.html_url,
    };
}

function runGit(args, cwd) {
    const result = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {
        encoding: 'utf8',
        cwd,
        timeout: 180_000,
        env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' },
    });
    if (result.status !== 0) throw new Error(`Git ${args[0]} failed (exit ${result.status ?? 'unavailable'}).`);
    return result.stdout;
}

function verifyCheckoutHead(sourceRoot, expectedSha) {
    const head = runGit(['rev-parse', 'HEAD'], sourceRoot).trim().toLowerCase();
    if (head !== normalizeSha(expectedSha)) {
        throw new Error(`Checked out commit '${head}' does not match expectedSha '${expectedSha}'.`);
    }
    return head;
}

function verifyCleanCheckout(sourceRoot) {
    if (runGit(['status', '--porcelain=v1', '--untracked-files=all'], sourceRoot)) {
        throw new Error('Source checkout contains modified or untracked files.');
    }
}

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertSafeManifest(manifest, packageName) {
    if (!isObject(manifest) || manifest.name !== packageName || (manifest.private !== undefined && manifest.private !== false)) {
        throw new Error(`Invalid identity or private package: ${packageName}.`);
    }
    const config = manifest.publishConfig === undefined ? {} : manifest.publishConfig;
    if (!isObject(config) || Object.entries(config).some(([key, value]) =>
        !ENTRY_FIELDS.includes(key) && !(key === 'registry' && value === DESTINATION_REGISTRY))) {
        throw new Error(`${packageName}: unexpected publishConfig.`);
    }
    if (!isObject(manifest.scripts ?? {}) ||
        Object.keys(manifest.scripts ?? {}).some(key => /^(?:(?:pre|post)?(?:install|pack|publish)|prepare|prepublishOnly|preprepare|postprepare)$/i.test(key))) {
        throw new Error(`${packageName}: unexpected lifecycle hook.`);
    }
    if (Object.hasOwn(manifest, 'bundleDependencies') || Object.hasOwn(manifest, 'bundledDependencies')) {
        throw new Error(`${packageName}: bundled dependencies are not supported.`);
    }
}

function dependencyMap(manifest, field) {
    const value = manifest[field];
    if (value === undefined) return {};
    if (!isObject(value)) throw new Error(`${manifest.name}: invalid ${field}.`);
    return value;
}

function assertExternalDependency(name, spec, owner) {
    if (COHORT_BY_NAME.has(name) || EXCLUDED_PACKAGES.has(name) ||
        typeof spec !== 'string' || !spec || spec !== spec.trim() ||
        /^(?:workspace:|file:|link:|portal:|patch:|npm:|[.~][/\\]|[/\\]|[a-z]:[/\\])/i.test(spec)) {
        throw new Error(`${owner}: unexpected external or local dependency '${name}'.`);
    }
}

function buildManifestContract(definition, manifest, version) {
    assertSafeManifest(manifest, definition.name);
    const dependencies = dependencyMap(manifest, 'dependencies');
    for (const name of definition.runtimeDependencies) {
        assert.equal(dependencies[name], 'workspace:*', `${definition.name}: expected workspace:* for ${name}.`);
    }
    const contract = {
        dependencies: { ...dependencies },
        optionalDependencies: dependencyMap(manifest, 'optionalDependencies'),
        peerDependencies: dependencyMap(manifest, 'peerDependencies'),
        peerDependenciesMeta: dependencyMap(manifest, 'peerDependenciesMeta'),
        entrypoints: Object.fromEntries(ENTRY_FIELDS.map(field => [field, manifest.publishConfig?.[field] ?? manifest[field]])
            .filter(([, value]) => value !== undefined)),
    };
    for (const field of DEPENDENCY_FIELDS.slice(0, 3)) {
        for (const [name, spec] of Object.entries(contract[field])) {
            if (field === 'dependencies' && definition.runtimeDependencies.includes(name)) contract[field][name] = version;
            else assertExternalDependency(name, spec, definition.name);
        }
    }
    return contract;
}

function verifyBuildPrerequisites(turbo) {
    // Turbo declares these dependencies on Designer v2's task, not the global build task.
    const dependsOn = (turbo.tasks ?? turbo.pipeline)?.['@microsoft/logic-apps-designer-v2#build:lib']?.dependsOn;
    for (const job of ['@microsoft/designer-ui-v2#build:lib', '@microsoft/logic-apps-graph-layout#build:lib']) {
        assert(Array.isArray(dependsOn) && dependsOn.includes(job), `Missing Turbo prerequisite ${job}.`);
    }
}

function snapshotCheckout(sourceRoot, verified) {
    const head = verifyCheckoutHead(sourceRoot, verified.commitSha);
    verifyCleanCheckout(sourceRoot);
    const read = file => JSON.parse(runGit(['show', `${head}:${file}`], sourceRoot));
    assert.equal(read('package.json').packageManager, PNPM_PIN, 'Source packageManager pin changed.');
    verifyBuildPrerequisites(read('turbo.json'));
    return Object.fromEntries(COHORT.map(item => [
        item.name, buildManifestContract(item, read(`${item.directory}/package.json`), verified.version),
    ]));
}

async function readVerifiedContracts(verified, fetchImpl = fetch) {
    const base = `https://raw.githubusercontent.com/${SOURCE_REPOSITORY}/${normalizeSha(verified.commitSha)}`;
    const contracts = await Promise.all(COHORT.map(async item => {
        const manifest = await fetchJson(`${base}/${item.directory}/package.json`, fetchImpl);
        return [item.name, buildManifestContract(item, manifest, verified.version)];
    }));
    return Object.fromEntries(contracts);
}

module.exports = {
    COHORT,
    DEPENDENCY_FIELDS,
    DESTINATION_FEED_ID,
    DESTINATION_REGISTRY,
    DIST_TAG,
    ENTRY_FIELDS,
    MANIFEST_FILE_NAME,
    SOURCE_REPOSITORY,
    assertSafeManifest,
    buildManifestContract,
    dependencyMap,
    fetchJson,
    isObject,
    normalizeSha,
    parseReleaseRef,
    readVerifiedContracts,
    snapshotCheckout,
    verifyBuildPrerequisites,
    verifyCheckoutHead,
    verifyCleanCheckout,
    verifyReleaseMetadata,
};
