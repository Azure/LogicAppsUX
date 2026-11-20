const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const { COHORT, DESTINATION_FEED_ID, DESTINATION_REGISTRY } = require('./ado-npm-publisher-lib.cjs');
const { digest, readRegularFile, validateArtifactFiles } = require('./ado-npm-publisher-artifact.cjs');

const FIXTURE_PROTOCOL = 'logicappsux-isolated-test-feed/v1';
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const SHA512_PATTERN = /^sha512-[A-Za-z0-9+/]{85}[AQgw]==$/;
const MAX_INVENTORY_PAGES = 32;
const MAX_INVENTORY_EVENTS = 10_000;

function normalizeRegistry(registry) {
    let url;
    try {
        url = new URL(registry);
    } catch {
        throw new Error('Pinned registry must be a valid absolute URL.');
    }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
        throw new Error('Pinned registry must be a clean https URL.');
    }
    if (!url.pathname.endsWith('/')) {
        throw new Error('Pinned registry must end with a trailing slash.');
    }
    return url.toString();
}

function assertPinnedIsolatedIdentity(input) {
    if (typeof input?.id !== 'string' || !input.id || typeof input?.name !== 'string' || !input.name) {
        throw new Error('Pinned feed identity must include id and name.');
    }
    const registry = normalizeRegistry(input.registry);
    const host = new URL(registry).hostname.toLowerCase();
    if (!host.endsWith('.invalid')) {
        throw new Error('Pinned feed registry must target a local-only .invalid host.');
    }
    if (registry === DESTINATION_REGISTRY || input.id === DESTINATION_FEED_ID || input.name === 'microsoft-logic-apps') {
        throw new Error('Pinned feed identity cannot target production.');
    }
    return Object.freeze({ id: input.id, name: input.name, registry });
}

function assertIdentityMatch(expected, actual, source) {
    const normalized = assertPinnedIsolatedIdentity(actual);
    for (const field of ['id', 'name', 'registry']) {
        if (normalized[field] !== expected[field]) {
            throw new Error(`${source} identity mismatch for ${field}.`);
        }
    }
}

function parseStableVersion(version, label) {
    if (typeof version !== 'string' || version.length > 256 || !VERSION_PATTERN.test(version)) {
        throw new Error(`${label} must be a stable semver version.`);
    }
    const [major, minor, patch] = version.split(/[.+]/);
    return [BigInt(major), BigInt(minor), BigInt(patch)];
}

function compareStable(left, right) {
    const a = parseStableVersion(left, 'left version');
    const b = parseStableVersion(right, 'right version');
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
    }
    return 0;
}

function normalizeInventoryEvent(event) {
    if (!event || typeof event !== 'object') throw new Error('Inventory event must be an object.');
    const { type, version } = event;
    if (!['version', 'deleted', 'upstream'].includes(type)) throw new Error('Inventory event type is not supported.');
    parseStableVersion(version, 'Inventory event version');
    const normalized = { type, version };
    if (type === 'version') {
        if (typeof event.integrity !== 'string' || !SHA512_PATTERN.test(event.integrity)) {
            throw new Error('Inventory version event must include sha512 integrity.');
        }
        normalized.integrity = event.integrity;
    }
    return normalized;
}

async function readBoundedInventory(readPage, packageName, maxPages, maxEvents) {
    const visited = new Set();
    const versions = new Map();
    const deleted = new Set();
    const upstream = new Set();
    let cursor = null;
    let pageCount = 0;
    let eventCount = 0;
    let complete = false;
    while (true) {
        if (++pageCount > maxPages) throw new Error(`Inventory exceeded ${maxPages} pages for ${packageName}.`);
        if (visited.has(cursor)) throw new Error(`Inventory cursor loop detected for ${packageName}.`);
        visited.add(cursor);
        const page = await readPage(packageName, cursor);
        if (page?.protocol !== FIXTURE_PROTOCOL || page?.packageName !== packageName || !Array.isArray(page?.events)) {
            throw new Error(`Inventory page does not match fixture protocol for ${packageName}.`);
        }
        for (const raw of page.events) {
            if (++eventCount > maxEvents) throw new Error(`Inventory exceeded ${maxEvents} events for ${packageName}.`);
            const event = normalizeInventoryEvent(raw);
            if (versions.has(event.version) || deleted.has(event.version) || upstream.has(event.version)) {
                throw new Error(`Ambiguous inventory: duplicate version for ${packageName}.`);
            }
            if (event.type === 'version') versions.set(event.version, event.integrity);
            if (event.type === 'deleted') deleted.add(event.version);
            if (event.type === 'upstream') upstream.add(event.version);
        }
        const next = page.nextCursor;
        if (next !== null && (typeof next !== 'string' || next.length === 0 || page.complete !== false)) {
            throw new Error(`Inventory continuation is invalid for ${packageName}.`);
        }
        if (next === null) {
            complete = page.complete === true;
            break;
        }
        cursor = next;
    }
    if (!complete) throw new Error(`Inventory did not provide a complete terminal page for ${packageName}.`);
    return { versions, deleted, upstream };
}

function normalizeMetadata(packageName, metadata, maxVersions) {
    if (metadata?.protocol !== FIXTURE_PROTOCOL || metadata?.packageName !== packageName || typeof metadata?.status !== 'number') {
        throw new Error(`Package metadata does not match fixture protocol for ${packageName}.`);
    }
    if (metadata.status === 404 && metadata.versions === undefined && metadata.latest === undefined) {
        return { status: 'not-found' };
    }
    if (metadata.status !== 200 || !Array.isArray(metadata.versions) || metadata.versions.length > maxVersions || typeof metadata.latest !== 'string') {
        return { status: 'unknown', reason: `Package metadata read failed with status ${metadata.status}.` };
    }
    parseStableVersion(metadata.latest, 'dist-tag latest');
    const versions = new Map();
    for (const item of metadata.versions) {
        if (!item || item.name !== packageName || typeof item.version !== 'string' ||
            typeof item.integrity !== 'string' || !SHA512_PATTERN.test(item.integrity) || versions.has(item.version)) {
            return { status: 'unknown', reason: 'Package metadata contains invalid version entries.' };
        }
        parseStableVersion(item.version, 'Package version');
        versions.set(item.version, item.integrity);
    }
    if (!versions.has(metadata.latest)) {
        return { status: 'unknown', reason: 'Package metadata latest tag is missing from version entries.' };
    }
    return { status: 'ok', latest: metadata.latest, versions };
}

function classifyPackage(entry, metadata, inventory) {
    if (metadata.status === 'unknown') return metadata;
    const sameRelease = v => compareStable(v, entry.version) === 0;
    if ([...inventory.deleted, ...inventory.upstream].some(sameRelease)) {
        return { status: 'conflict', reason: 'Release precedence collides with deleted or upstream inventory.' };
    }
    // A brand-new name can return 404. Only the complete authenticated empty inventory makes it safe to proceed.
    if (metadata.status === 'not-found') {
        return inventory.versions.size === 0 && inventory.deleted.size === 0 && inventory.upstream.size === 0
            ? { status: 'absent', reason: 'Package is absent from complete authenticated inventory.' }
            : { status: 'unknown', reason: 'npm 404 disagrees with authenticated package inventory.' };
    }
    if ([...metadata.versions.keys(), ...inventory.versions.keys()].some(v => v !== entry.version && compareStable(v, entry.version) >= 0)) {
        return { status: 'conflict', reason: 'Inventory or metadata contains a newer or same-precedence release.' };
    }
    // For fixture evidence, omission from one view isn't proof: both views must agree on every live record.
    if (!isDeepStrictEqual(metadata.versions, inventory.versions)) {
        return { status: 'unknown', reason: 'Metadata and inventory disagree on live versions or integrity.' };
    }
    const metadataIntegrity = metadata.versions.get(entry.version);
    if (!metadataIntegrity) {
        return { status: 'absent', reason: 'Release version is absent from metadata and complete inventory.' };
    }
    if (metadataIntegrity !== entry.integrity) {
        return { status: 'conflict', reason: 'Existing release integrity differs from artifact bytes.' };
    }
    if (metadata.latest !== entry.version) {
        return { status: 'conflict', reason: 'Existing identical release is not latest.' };
    }
    return { status: 'already-identical', reason: 'Release identity and integrity match.' };
}

function assertResolvedUrl(entry, url, pinned) {
    // Fixture protocol uses an exact canonical URL for each package. A prefix does not confine URL dot segments.
    const expected = new URL(`${encodeURIComponent(entry.name)}/-/${entry.file}`, pinned.registry).href;
    if (url !== expected) {
        throw new Error(`Resolved URL does not match the pinned registry tarball for ${entry.name}@${entry.version}.`);
    }
}

function assertDownloadMatches(entry, download, pinned) {
    if (download?.protocol !== FIXTURE_PROTOCOL || download?.status !== 200 || !Buffer.isBuffer(download?.bytes) ||
        typeof download?.resolvedUrl !== 'string' || typeof download?.integrity !== 'string') {
        throw new Error(`Download payload is invalid for ${entry.name}@${entry.version}.`);
    }
    assertResolvedUrl(entry, download.resolvedUrl, pinned);
    const actual = digest(download.bytes);
    if (download.integrity !== entry.integrity || actual.integrity !== entry.integrity || actual.bytes !== entry.bytes || actual.sha256 !== entry.sha256) {
        throw new Error(`Download bytes do not match artifact for ${entry.name}@${entry.version}.`);
    }
}

function assertConsumerResult(consumer, artifact, pinned) {
    if (consumer?.protocol !== FIXTURE_PROTOCOL || consumer?.scriptsDisabled !== true || !Array.isArray(consumer?.entries)) {
        throw new Error('Consumer verification did not use the fixture protocol with scripts disabled.');
    }
    const byName = new Map(consumer.entries.map(entry => [entry?.name, entry]));
    if (byName.size !== artifact.packages.length || consumer.entries.length !== byName.size) {
        throw new Error('Consumer verification must return exactly one entry per cohort package.');
    }
    for (const pkg of artifact.packages) {
        const actual = byName.get(pkg.name);
        if (!actual || actual.version !== pkg.version || actual.integrity !== pkg.integrity || typeof actual.resolvedUrl !== 'string') {
            throw new Error(`Consumer entry mismatch for ${pkg.name}@${pkg.version}.`);
        }
        assertResolvedUrl(pkg, actual.resolvedUrl, pinned);
    }
}

async function classifyWithOperations(entry, operations, limits) {
    const metadata = normalizeMetadata(entry.name, await operations.readPackageMetadata(entry.name), limits.maxInventoryEvents);
    const inventory = await readBoundedInventory(
        (name, cursor) => operations.readPackageInventoryPage(name, cursor), entry.name, limits.maxInventoryPages, limits.maxInventoryEvents
    );
    return classifyPackage(entry, metadata, inventory);
}

function readRetainedBytes(artifactRoot, entry) {
    const buffer = readRegularFile(path.join(artifactRoot, entry.file), entry.bytes);
    const actual = digest(buffer);
    if (actual.bytes !== entry.bytes || actual.sha256 !== entry.sha256 || actual.integrity !== entry.integrity) {
        throw new Error(`Retained bytes changed before simulated publication for ${entry.name}@${entry.version}.`);
    }
    return buffer;
}

async function writeAndVerify(entry, artifactRoot, operations, limits, verifyDownload) {
    const before = await classifyWithOperations(entry, operations, limits);
    if (before.status !== 'absent') {
        throw new Error(`Pre-publication recheck failed for ${entry.name}@${entry.version}: ${before.reason}`);
    }
    // Never retry an interrupted write in the same run. A replay rechecks the same artifact before writing.
    await operations.writePackage(Object.freeze({ ...entry }), readRetainedBytes(artifactRoot, entry));
    const after = await classifyWithOperations(entry, operations, limits);
    if (after.status !== 'already-identical') {
        throw new Error(`Publication outcome unresolved for ${entry.name}@${entry.version}: ${after.reason}`);
    }
    await verifyDownload(entry);
    return after;
}

async function runIsolatedTestFeedPath(options) {
    const {
        artifactRoot, verified, contracts, pinnedFeed, readFeedIdentity, openFeedOperations,
        mode = 'preflight', maxInventoryPages = MAX_INVENTORY_PAGES, maxInventoryEvents = MAX_INVENTORY_EVENTS,
    } = options ?? {};
    if (!['preflight', 'publish'].includes(mode)) throw new Error('Isolated test-feed mode must be preflight or publish.');
    if (typeof readFeedIdentity !== 'function' || typeof openFeedOperations !== 'function') {
        throw new Error('Isolated test-feed path requires injected feed adapter callbacks.');
    }
    if (!Number.isInteger(maxInventoryPages) || maxInventoryPages < 1 || maxInventoryPages > MAX_INVENTORY_PAGES ||
        !Number.isInteger(maxInventoryEvents) || maxInventoryEvents < 1 || maxInventoryEvents > MAX_INVENTORY_EVENTS) {
        throw new Error('Invalid fixture inventory limits.');
    }

    const pinned = assertPinnedIsolatedIdentity(pinnedFeed);
    const artifact = validateArtifactFiles(artifactRoot, verified, contracts);
    if (artifact.packages.length !== COHORT.length) throw new Error(`Expected ${COHORT.length} packages in artifact cohort.`);
    assertIdentityMatch(pinned, await readFeedIdentity(pinned), 'Unauthenticated');
    const operations = await openFeedOperations(pinned);
    const requiredOperations = ['readAuthenticatedFeedIdentity', 'readPackageMetadata', 'readPackageInventoryPage', 'downloadPackage', 'verifyConsumerInstall'];
    if (mode === 'publish') requiredOperations.push('writePackage');
    if (requiredOperations.some(method => typeof operations?.[method] !== 'function')) {
        throw new Error('Isolated test-feed fixture adapter is missing required operations.');
    }
    assertIdentityMatch(pinned, await operations.readAuthenticatedFeedIdentity(pinned), 'Authenticated');

    const limits = { maxInventoryPages, maxInventoryEvents };

    const states = new Map();
    for (const entry of artifact.packages) {
        const state = await classifyWithOperations(entry, operations, limits);
        if (!['absent', 'already-identical'].includes(state.status)) {
            throw new Error(`Preflight blocked for ${entry.name}@${entry.version}: ${state.reason}`);
        }
        states.set(entry.name, state);
    }

    let writes = 0;
    const verifyDownload = async entry => assertDownloadMatches(entry, await operations.downloadPackage(entry.name, entry.version), pinned);
    for (const entry of artifact.packages) {
        // Verify retained versions before a single missing version is written.
        if (states.get(entry.name).status === 'already-identical') await verifyDownload(entry);
    }
    if (mode === 'publish') {
        for (const entry of artifact.packages) {
            if (states.get(entry.name).status !== 'absent') continue;
            states.set(entry.name, await writeAndVerify(entry, artifactRoot, operations, limits, verifyDownload));
            writes++;
        }
    }

    if ([...states.values()].every(state => state.status === 'already-identical')) {
        assertConsumerResult(await operations.verifyConsumerInstall({
            protocol: FIXTURE_PROTOCOL,
            registry: pinned.registry,
            scriptsDisabled: true,
            packages: artifact.packages.map(item => ({ name: item.name, version: item.version })),
        }), artifact, pinned);
    }

    const summary = [...states.values()].reduce((counts, state) => {
        counts[state.status] = (counts[state.status] ?? 0) + 1;
        return counts;
    }, { writes });
    return { summary, states: Object.fromEntries(states), protocol: FIXTURE_PROTOCOL };
}

module.exports = {
    FIXTURE_PROTOCOL,
    assertPinnedIsolatedIdentity,
    runIsolatedTestFeedPath,
};
