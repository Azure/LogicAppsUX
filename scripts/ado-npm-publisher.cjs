const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { COHORT, branchProvenance, buildManifestContract, parseReleaseRef, readVerifiedContracts, snapshotCheckout, verifyCheckoutHead, verifyCleanCheckout, verifyReleaseMetadata } =
    require('./ado-npm-publisher-lib.cjs');
const { authenticateFeed, classifyPackageState, createRegistry, npmRunner, publishPackage, readNpmAuthorization, validateArtifactFiles } =
    require('./ado-npm-publisher-artifact.cjs');

function sanitizeAgentOutput(value) {
    return String(value).replace(/#/g, '# ');
}

async function prepareArtifact(env, log) {
    const snapshot = JSON.parse(fs.readFileSync(env.CONTRACT_FILE, 'utf8'));
    verifyCheckoutHead(env.SOURCE_ROOT, snapshot.verified.commitSha);
    const artifact = validateArtifactFiles(env.ARTIFACT_ROOT, snapshot.verified, snapshot.contracts, { prepare: true });
    log(`Validated ${artifact.packages.length} tarballs; feed authentication and publication were not attempted.`);
}

function buildCohort(env, snapshot, run = spawnSync, writeOutput = text => process.stdout.write(text), childEnv) {
    const { verified } = snapshot;
    if (verified.kind === 'branch-e2e') {
        assert.deepEqual(verified, branchProvenance(env), 'Verified branch provenance mismatch.');
    } else {
        assert.equal(verified.version, parseReleaseRef(`refs/tags/${verified.releaseTag}`).version, 'Verified release version mismatch.');
    }
    const { version } = verified;
    fs.mkdirSync(env.ARTIFACT_ROOT);
    const exec = (command, args) => {
        const result = run(command, args, {
            cwd: env.SOURCE_ROOT, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8',
            timeout: 1_800_000, maxBuffer: 64 * 1024 * 1024, env: childEnv,
        });
        // Source and dependency output must not become Azure Pipelines logging commands.
        for (const output of [result.stdout, result.stderr]) {
            if (output) writeOutput(sanitizeAgentOutput(output));
        }
        if (result.error || result.status !== 0) {
            throw new Error(`${command} failed: ${result.error?.message ?? `exit ${result.status ?? 'unavailable'}`}.`);
        }
    };
    if (childEnv) {
        // Nested package builds invoke pnpm by name; keep its shim off the shared tool installation.
        exec('corepack', ['enable', '--install-directory', path.join(childEnv.HOME, 'bin'), 'pnpm']);
    }
    exec('corepack', ['pnpm', 'install', '--recursive', '--frozen-lockfile', '--strict-peer-dependencies']);
    exec(process.execPath, ['scripts/update-versions.js', version]);
    // The source rewrite logs individual file failures, so verify all nine before building.
    for (const item of COHORT) {
        const manifest = JSON.parse(fs.readFileSync(path.join(env.SOURCE_ROOT, item.directory, 'package.json'), 'utf8'));
        assert.equal(manifest.version, version, `${item.name}: version rewrite failed.`);
        assert.deepEqual(buildManifestContract(item, manifest, version), snapshot.contracts[item.name], `${item.name}: source contract changed.`);
    }
    exec('corepack', ['pnpm', 'run', 'build:lib']);
    for (const item of COHORT) {
        exec('corepack', ['pnpm', '--dir', path.join(env.SOURCE_ROOT, item.directory), 'pack', '--pack-destination', env.ARTIFACT_ROOT]);
    }
}

function buildBranchArtifact(env, log, run = spawnSync) {
    const verified = branchProvenance(env);
    const contracts = snapshotCheckout(env.SOURCE_ROOT, verified);
    const home = fs.mkdtempSync(path.join(env.AGENT_TMP, 'npm-branch-home-'));
    try {
        const bin = path.join(home, 'bin');
        fs.mkdirSync(bin);
        // This limits credential inheritance, but is not an agent/job isolation boundary.
        buildCohort(env, { verified, contracts }, run, undefined, {
            PATH: `${bin}${path.delimiter}${env.PATH}`,
            HOME: home,
            CI: 'true',
            HUSKY: '0',
            GIT_CONFIG_NOSYSTEM: '1',
            GIT_CONFIG_GLOBAL: '/dev/null',
            GIT_TERMINAL_PROMPT: '0',
            NPM_CONFIG_USERCONFIG: '/dev/null',
            NPM_CONFIG_GLOBALCONFIG: path.join(home, 'global.npmrc'),
        });
        verifyCheckoutHead(env.SOURCE_ROOT, verified.commitSha);
        const artifact = validateArtifactFiles(env.ARTIFACT_ROOT, verified, contracts, { prepare: true });
        log(`Validated ${artifact.packages.length} test tarballs at ${verified.version}; publication was not attempted.`);
    } finally {
        fs.rmSync(home, { force: true, recursive: true });
    }
}

async function verifyArtifact(env, fetchImpl) {
    // Neither provenance nor the contract used by the privileged job comes from the tarballs.
    const verified = await verifyReleaseMetadata({ releaseRef: env.RELEASE_REF, expectedSha: env.EXPECTED_SHA, fetchImpl });
    const contracts = await readVerifiedContracts(verified, fetchImpl);
    return validateArtifactFiles(env.ARTIFACT_ROOT, verified, contracts);
}

async function processCohort(artifact, registry, write, log) {
    const distTag = artifact.destination.distTag;
    if (distTag !== 'latest') throw new Error('Invalid publication tag; expected latest.');
    const results = [];
    for (const entry of artifact.packages) {
        results.push({ ...entry, ...await classifyPackageState(registry, entry) });
    }
    const report = () => results.forEach(result => log(`${result.name}@${result.version} ${result.integrity}: ${result.status} (${result.reason})${result.warning ? ` Warning: ${result.warning}` : ''}`));
    if (results.some(result => ['unknown', 'conflict'].includes(result.status))) {
        report();
        throw new Error('Preflight blocked; zero package writes.');
    }
    let stopped = false;
    if (write) {
        for (const result of results.filter(item => item.status === 'absent')) {
            let outcome = { status: 'not-attempted', reason: 'Blocked by earlier unresolved write.' };
            if (!stopped) {
                // This narrows the race window but cannot serialize independent writers.
                const current = await classifyPackageState(registry, result);
                if (current.warning) result.warning = current.warning;
                if (current.status === 'absent') {
                    outcome = await publishPackage({ entry: result, registry, write: () => write(result.file, distTag) });
                } else if (current.status === 'already-identical') {
                    outcome = current;
                } else {
                    outcome = { status: 'failed', reason: `Pre-publication check blocked: ${current.reason}` };
                }
            }
            Object.assign(result, outcome);
            stopped ||= result.status === 'failed';
        }
    }
    report();
    if (stopped) throw new Error('Publication stopped. Retain and reconcile this exact pipeline artifact before retrying.');
}

function dryRunCohort(artifact, artifactRoot, npm, log) {
    for (const entry of artifact.packages) {
        const result = npm(path.join(artifactRoot, entry.file), 'latest', true);
        if (result.error || result.status !== 0) {
            throw new Error(`npm dry run failed for ${entry.name}@${entry.version}: ${result.error?.message ?? `exit ${result.status ?? 'unavailable'}`}.`);
        }
        log(`npm dry run succeeded for ${entry.name}@${entry.version}; no package was published.`);
    }
}

async function main([command, ...args] = process.argv.slice(2), env = process.env, fetchImpl = fetch, log = console.log) {
    const writeLog = log;
    log = message => writeLog(sanitizeAgentOutput(message));
    if (args.length) throw new Error('Publisher commands only accept inputs from their environment.');
    if (command === 'isolated-test-feed') {
        throw new Error('Isolated test-feed attempts are fixture-only and are rejected before environment, provenance, or network reads.');
    }
    if (command === 'build-branch-artifact') return buildBranchArtifact(env, log);
    if (command === 'prepare-artifact') return prepareArtifact(env, log);
    if (command === 'build-cohort') {
        const snapshot = JSON.parse(fs.readFileSync(env.CONTRACT_FILE, 'utf8'));
        verifyCheckoutHead(env.SOURCE_ROOT, snapshot.verified.commitSha);
        verifyCleanCheckout(env.SOURCE_ROOT);
        buildCohort(env, snapshot);
        return;
    }
    if (command === 'verify-source') {
        const verified = await verifyReleaseMetadata({ releaseRef: env.RELEASE_REF, expectedSha: env.EXPECTED_SHA, fetchImpl });
        fs.writeFileSync(env.PROVENANCE_FILE, JSON.stringify(verified), { flag: 'wx', mode: 0o600 });
        log(`Verified ${verified.releaseTag} at ${verified.commitSha} before checkout.`);
        return;
    }
    if (command === 'snapshot-source') {
        const previous = JSON.parse(fs.readFileSync(env.PROVENANCE_FILE, 'utf8'));
        const verified = await verifyReleaseMetadata({ releaseRef: env.RELEASE_REF, expectedSha: env.EXPECTED_SHA, fetchImpl });
        for (const field of ['releaseTag', 'version', 'commitSha', 'releaseId']) {
            assert.equal(previous[field], verified[field], 'Release metadata changed during checkout.');
        }
        const contracts = snapshotCheckout(env.SOURCE_ROOT, verified);
        fs.writeFileSync(env.CONTRACT_FILE, JSON.stringify({ verified, contracts }), { flag: 'wx', mode: 0o600 });
        log(`Verified ${verified.releaseTag} at ${verified.commitSha}; snapshotted ${COHORT.length} source manifests before lifecycle execution.`);
        return;
    }
    if (command === 'validate-artifact') {
        const artifact = await verifyArtifact(env, fetchImpl);
        log(`Validated artifact provenance and ${artifact.packages.length} tarballs.`);
        return;
    }
    if (command !== 'feed') throw new Error('Unknown publisher command.');

    const mode = env.PUBLISHER_MODE;
    if (!['publish', 'preflight', 'dry-run'].includes(mode)) throw new Error('Invalid publisher mode.');
    // Independent writers can race between preflight and publish; keep this stop until their coordination is verified.
    if (mode === 'publish') throw new Error('Publication blocked: public-source controls and Azure Artifacts publication behavior have not been verified.');
    const artifact = await verifyArtifact(env, fetchImpl);
    const authorization = readNpmAuthorization(env.PUBLISH_NPMRC);
    const npm = npmRunner(env.PUBLISH_NPMRC, env.NPM_CWD);
    log(`${mode} ${artifact.source.releaseRef} ${artifact.source.verifiedSha} ${artifact.destination.registry} tag=${artifact.destination.distTag}`);
    await authenticateFeed(env.ADO_FEED_TOKEN, fetchImpl);
    const registry = createRegistry(authorization, fetchImpl);
    await processCohort(artifact, registry, undefined, log);
    if (mode === 'dry-run') dryRunCohort(artifact, env.ARTIFACT_ROOT, npm, log);
}

if (require.main === module) {
    main().catch(error => {
        console.error(sanitizeAgentOutput(error.message));
        process.exitCode = 1;
    });
}

module.exports = { buildBranchArtifact, buildCohort, dryRunCohort, main, prepareArtifact, processCohort, sanitizeAgentOutput };
