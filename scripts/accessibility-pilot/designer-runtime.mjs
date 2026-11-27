import { createHash } from 'node:crypto';
import dgram from 'node:dgram';
import { lstat, mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';

const launcherEnvironmentKey = 'LAUX_DESIGNER_REPLAY_LAUNCHER';
const launcherTokenEnvironmentKey = 'LAUX_DESIGNER_REPLAY_TOKEN';
const socketProbeHost = '192.0.2.1';
const socketProbePort = 9;
const socketProbeTimeoutMs = 1200;
const expectedPermissionCodes = new Set(['EPERM', 'EACCES']);
const supportedRouteHeaders = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
};
const mimeByExtension = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain',
};
const fixtureSmokeTargets = [
  { fixture: 'All Scope Nodes', expectedCardId: 'Recurrence', screenshot: 'AllScopeNodes.png' },
  { fixture: 'Panel', expectedCardId: 'manual', screenshot: 'Panel.png' },
  { fixture: 'Conditionals (Complex)', expectedCardId: 'Verify_property_changes', screenshot: 'MoreComplex.png' },
];
const pilotJourneyIds = ['nested-graph', 'details-open-close', 'token-editing'];
const cliValueArguments = new Set(['root', 'attempt', 'report', 'digest', 'source-base', 'origin', 'token']);
const cliBooleanArguments = new Set(['pilot']);

const codePointCompare = (left, right) => (left > right ? 1 : left < right ? -1 : 0);
const writeJsonAtomic = async (path, value) => {
  const tempPath = `${path}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(tempPath, path);
};

const parseCli = (argv) => {
  const values = {};
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--') {
      continue;
    }
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument "${token}".`);
    }
    const key = token.slice(2);
    if (cliBooleanArguments.has(key)) {
      if (values[key] !== undefined) {
        throw new Error(`Duplicate argument "--${key}".`);
      }
      values[key] = true;
      continue;
    }
    if (!cliValueArguments.has(key)) {
      throw new Error(`Unexpected argument "${token}".`);
    }
    if (values[key] !== undefined) {
      throw new Error(`Duplicate argument "--${key}".`);
    }
    const value = argv[index + 1];
    if (!value || value === '--' || value.startsWith('--')) {
      throw new Error(`Missing value for argument "${token}".`);
    }
    values[key] = value;
    index += 1;
  }
  return values;
};

const canonicalize = (value) => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort(codePointCompare)
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
};

const digestHex = (value) => createHash('sha256').update(value).digest('hex');

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;

const toForwardSlash = (path) => path.split('\\').join('/');

const isKnownOfficeFont = (request) => {
  try {
    const url = new URL(request.url);
    return (
      request.type === 'font' &&
      /(^|\.)cdn\.office\.net$/i.test(url.hostname) &&
      (/\/assets\/fonts\//i.test(url.pathname) || /\/assets\/icons\/fabric-icons/i.test(url.pathname))
    );
  } catch {
    return false;
  }
};

const serializeError = (error) => {
  if (!error) {
    return 'Unknown error';
  }
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
};

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const verifyLauncherGate = (options) => {
  if (process.env[launcherEnvironmentKey] !== '1') {
    throw new Error('designer-runtime.mjs must be launched by designer-replay.mjs.');
  }
  if (!options.token || options.token !== process.env[launcherTokenEnvironmentKey]) {
    throw new Error('Launcher token mismatch. Refusing to start browser runtime directly.');
  }
};

const verifySandboxNetworkDenied = () =>
  new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    const resolve = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      resolvePromise(value);
    };
    const reject = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      rejectPromise(error);
    };
    const socket = dgram.createSocket('udp4');
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('Network sandbox verification timed out; expected an immediate permission denial from sandbox-exec.'));
    }, socketProbeTimeoutMs);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.close();
      reject(new Error('Network sandbox verification failed: UDP connect unexpectedly succeeded.'));
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      socket.close();
      if (
        expectedPermissionCodes.has(error.code) ||
        (typeof error.message === 'string' && /operation not permitted/i.test(error.message))
      ) {
        resolve({
          host: socketProbeHost,
          port: socketProbePort,
          deniedCode: error.code ?? null,
          message: error.message,
        });
        return;
      }
      reject(
        new Error(`Network sandbox verification failed with ${error.code ?? 'unknown'} (${error.message}). Expected EPERM/EACCES denial.`)
      );
    });
    try {
      socket.connect(socketProbePort, socketProbeHost);
    } catch (error) {
      clearTimeout(timer);
      socket.close();
      if (
        expectedPermissionCodes.has(error.code) ||
        (typeof error.message === 'string' && /operation not permitted/i.test(error.message))
      ) {
        resolve({
          host: socketProbeHost,
          port: socketProbePort,
          deniedCode: error.code ?? null,
          message: error.message,
        });
        return;
      }
      reject(
        new Error(`Network sandbox verification failed with ${error.code ?? 'unknown'} (${error.message}). Expected EPERM/EACCES denial.`)
      );
    }
  });

const snapshotDirectory = async (siteRoot) => {
  const files = [];
  const pending = [''];
  while (pending.length > 0) {
    const relativeDirectory = pending.shift();
    const absoluteDirectory = join(siteRoot, relativeDirectory);
    const entries = await readdir(absoluteDirectory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => codePointCompare(left.name, right.name))) {
      const relativePath = toForwardSlash(relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name);
      const absolutePath = join(siteRoot, relativePath);
      const stats = await lstat(absolutePath);
      if (stats.isSymbolicLink()) {
        throw new Error(`Refusing symlink in .ephemeral-site: ${relativePath}`);
      }
      if (stats.isDirectory()) {
        pending.push(relativePath);
        continue;
      }
      if (!stats.isFile()) {
        throw new Error(`Refusing non-regular path in .ephemeral-site: ${relativePath}`);
      }
      const fileBuffer = await readFile(absolutePath);
      const bytes = Uint8Array.from(fileBuffer);
      const sha256 = digestHex(bytes);
      files.push({
        relativePath,
        requestPath: `/${relativePath}`,
        sha256,
        bytes,
        contentType: mimeByExtension[extname(relativePath)] ?? 'application/octet-stream',
      });
    }
  }
  files.sort((left, right) => codePointCompare(left.relativePath, right.relativePath));
  const manifestText = files.map(({ sha256, relativePath }) => `${sha256}  ${relativePath}\n`).join('');
  const manifestDigest = digestHex(manifestText);
  const byRequestPath = new Map(files.map((file) => [file.requestPath, Object.freeze(file)]));
  return Object.freeze({
    filesList: files.map((file) => Object.freeze({ ...file })),
    files: byRequestPath,
    manifestText,
    manifestDigest,
    assetCount: files.length,
  });
};

const createNetworkCapture = () => {
  const capture = {
    fulfilled: [],
    blocked: [],
    blockedKnownOfficeFonts: [],
    blockedUnexpected: [],
    blockedSockets: [],
    requestFailures: [],
    console: [],
    pageErrors: [],
    captureErrors: [],
  };
  return capture;
};

const attachPageCapture = (page, capture) => {
  page.on('console', (message) => {
    capture.console.push({ level: message.type(), text: message.text() });
  });
  page.on('pageerror', (error) => {
    capture.pageErrors.push(error.message);
  });
  page.on('requestfailed', (request) => {
    const item = {
      url: request.url(),
      type: request.resourceType(),
      error: request.failure()?.errorText ?? 'Unknown failure',
    };
    capture.requestFailures.push(item);
  });
};

const registerNetworkRoutes = async ({ context, origin, snapshot, responseHeaders, capture }) => {
  const allowedUrlMap = new Map();
  for (const file of snapshot.filesList) {
    if (file.requestPath === '/staticwebapp.config.json') {
      continue;
    }
    const url = `${origin}${file.requestPath}`;
    allowedUrlMap.set(url, file);
    if (file.requestPath === '/index.html') {
      allowedUrlMap.set(`${origin}/`, file);
    }
  }
  if (typeof context.routeWebSocket !== 'function') {
    throw new Error('Playwright context.routeWebSocket is unavailable; cannot enforce websocket closure policy.');
  }
  await context.routeWebSocket('**/*', async (route) => {
    capture.blockedSockets.push({
      url: typeof route.url === 'function' ? route.url() : 'unknown-websocket-url',
      method: 'GET',
      type: 'websocket',
      reason: 'websocket-disabled',
    });
    await route.close();
  });
  await context.route('**/*', async (route) => {
    const request = route.request();
    const item = {
      url: request.url(),
      method: request.method(),
      type: request.resourceType(),
    };
    try {
      if (item.method !== 'GET') {
        capture.blocked.push({ ...item, reason: 'method-not-allowed' });
        capture.blockedUnexpected.push({ ...item, reason: 'method-not-allowed' });
        await route.abort('blockedbyclient');
        return;
      }
      const match = allowedUrlMap.get(item.url);
      if (!match) {
        const blocked = { ...item, reason: 'external-origin' };
        try {
          if (new URL(item.url).origin === origin) {
            blocked.reason = 'url-not-allowlisted';
          }
        } catch {}
        capture.blocked.push(blocked);
        if (isKnownOfficeFont(item)) {
          capture.blockedKnownOfficeFonts.push(blocked);
        } else {
          capture.blockedUnexpected.push(blocked);
        }
        await route.abort('blockedbyclient');
        return;
      }
      capture.fulfilled.push({ ...item });
      await route.fulfill({
        status: 200,
        headers: {
          ...responseHeaders,
          'Content-Type': match.contentType,
          'Content-Length': String(match.bytes.byteLength),
        },
        body: Buffer.from(match.bytes),
      });
    } catch (error) {
      capture.captureErrors.push(serializeError(error));
      await route.abort('failed');
    }
  });
};

const createBrowserContext = async (browser, runtime) => {
  const context = await browser.newContext({ offline: true, serviceWorkers: 'block' });
  const capture = createNetworkCapture();
  await registerNetworkRoutes({
    context,
    origin: runtime.origin,
    snapshot: runtime.snapshot,
    responseHeaders: runtime.responseHeaders,
    capture,
  });
  await context.addInitScript(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
  });
  const page = await context.newPage();
  attachPageCapture(page, capture);
  return { context, page, capture };
};

const openFixture = async (page, runtime, fixture, expectedCardId) => {
  await page.goto(`${runtime.origin}/`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('radio', { name: 'Local', exact: true })).toBeChecked({ timeout: 9000 });
  await expect(page.getByRole('radio', { name: 'Azure', exact: true })).toBeDisabled({ timeout: 9000 });
  const fixturePicker = page.getByRole('combobox', { name: 'Workflow File To Load' });
  await fixturePicker.waitFor({ state: 'visible', timeout: 9000 });
  await fixturePicker.click();
  await page.getByRole('option', { name: fixture, exact: true }).click();
  await page.locator(`#msla-node-${expectedCardId}`).waitFor({ state: 'visible', timeout: 12000 });
  const toolbox = page.getByRole('button', { name: 'Toolbox' });
  if (await toolbox.isVisible().catch(() => false)) {
    await toolbox.click();
    const zoomToFit = page.getByLabel('Zoom view to fit');
    if (await zoomToFit.isVisible().catch(() => false)) {
      await zoomToFit.click();
    }
  }
};

const collectObservedCards = (page) =>
  page.locator('[id^="msla-node-"]').evaluateAll((elements) =>
    elements
      .map((element) => element.id)
      .filter((id) => id.startsWith('msla-node-'))
      .sort()
  );

const captureToPayload = (capture) => ({
  fulfilled: capture.fulfilled,
  blocked: capture.blocked,
  blockedKnownOfficeFonts: capture.blockedKnownOfficeFonts,
  blockedUnexpected: capture.blockedUnexpected,
  blockedSockets: capture.blockedSockets,
  requestFailures: capture.requestFailures,
  console: capture.console,
  pageErrors: capture.pageErrors,
  captureErrors: capture.captureErrors,
});

const contextInvalidReason = (capture) => {
  if (capture.blockedUnexpected.length > 0 || capture.blockedSockets.length > 0) {
    return 'Unexpected blocked network requests were observed, so this context is not credited.';
  }
  const unexpectedRequestFailures = capture.requestFailures.filter((item) => !isKnownOfficeFont(item));
  if (unexpectedRequestFailures.length > 0) {
    return 'Unexpected request failures were observed, so this context is not credited.';
  }
  if (capture.captureErrors.length > 0) {
    return 'Capture instrumentation errors were observed, so this context is not credited.';
  }
  if (capture.pageErrors.length > 0) {
    return 'Runtime page errors were observed, so this context is not credited.';
  }
  return null;
};

const runFixtureSmoke = async (browser, runtime, fixtureTarget, attemptDirectory) => {
  const outcome = {
    fixture: fixtureTarget.fixture,
    status: 'failed',
    step: 'render Local-only Designer v1 shell',
    screenshot: fixtureTarget.screenshot,
    observedCards: [],
  };
  const { context, page, capture } = await createBrowserContext(browser, runtime);
  try {
    await openFixture(page, runtime, fixtureTarget.fixture, fixtureTarget.expectedCardId);
    outcome.observedCards = await collectObservedCards(page);
    await page.screenshot({ path: join(attemptDirectory, fixtureTarget.screenshot), fullPage: true });
    const invalidReason = contextInvalidReason(capture);
    if (invalidReason) {
      outcome.error = invalidReason;
    } else {
      outcome.status = 'passed';
    }
  } catch (error) {
    outcome.error = serializeError(error);
    try {
      const failedScreenshot = fixtureTarget.screenshot.replace(/\.png$/i, '.failed.png');
      await page.screenshot({ path: join(attemptDirectory, failedScreenshot), fullPage: true });
      outcome.failedScreenshot = failedScreenshot;
    } catch (screenshotError) {
      outcome.failedScreenshotError = serializeError(screenshotError);
    }
  } finally {
    Object.assign(outcome, captureToPayload(capture));
    await context.close();
  }
  return outcome;
};

const summarizeJourneyStatus = (journeys) => {
  if (journeys.some((journey) => journey.status === 'failed')) {
    return 'failed';
  }
  if (journeys.every((journey) => journey.status === 'passed')) {
    return 'passed';
  }
  return 'not_run';
};

const runJourney = async ({ browser, runtime, journey, journeyCheck, journeyGapReason, fixtureLookup, attemptDirectory }) => {
  const output = {
    id: journey.id,
    title: journey.title,
    fixture: journey.fixture,
    expectedEvidence: journey.expectedEvidence,
    status: 'not_run',
    attempt: { failed: false, error: null },
    evidence: { keyboard: [], scans: [], observations: {}, assertions: [] },
    notes: [],
  };
  if (typeof journeyCheck !== 'function') {
    output.notes.push(journeyGapReason ?? 'No journey check implementation is available for this journey ID.');
    return output;
  }
  const fixtureTarget = fixtureLookup.get(journey.fixture);
  if (!fixtureTarget) {
    output.attempt.failed = true;
    output.attempt.error = `No fixture smoke mapping exists for "${journey.fixture}".`;
    output.notes.push('Cannot execute journey without a verified fixture target.');
    return output;
  }
  const { context, page, capture } = await createBrowserContext(browser, runtime);
  try {
    await openFixture(page, runtime, fixtureTarget.fixture, fixtureTarget.expectedCardId);
    await journeyCheck(page, output.evidence);
    await page.screenshot({ path: join(attemptDirectory, `${journey.id}.png`), fullPage: true });
  } catch (error) {
    output.attempt.failed = true;
    output.attempt.error = serializeError(error);
    try {
      const failedScreenshot = `${journey.id}.failed.png`;
      await page.screenshot({ path: join(attemptDirectory, failedScreenshot), fullPage: true });
      output.failedScreenshot = failedScreenshot;
    } catch (screenshotError) {
      output.failedScreenshotError = serializeError(screenshotError);
    }
  } finally {
    Object.assign(output, captureToPayload(capture));
    await context.close();
  }

  const invalidReason = contextInvalidReason(capture);
  if (invalidReason) {
    output.notes.push(invalidReason);
    output.notes.push('This journey result is held at not_run to avoid false-clean credit.');
    return output;
  }
  if (output.attempt.failed) {
    output.notes.push('Journey callback threw before all evidence could be collected; marked not_run with partial evidence.');
    return output;
  }
  const assertions = Array.isArray(output.evidence.assertions) ? output.evidence.assertions : [];
  if (!Array.isArray(output.evidence.assertions)) {
    output.evidence.assertions = assertions;
  }
  const hasCompleteEvidence = output.evidence.keyboard.length > 0 && output.evidence.scans.length > 0 && assertions.length > 0;
  if (!hasCompleteEvidence) {
    output.notes.push('Insufficient evidence: journey requires non-empty keyboard traces, scans, and assertions.');
    output.notes.push('Result remains not_run to avoid false-clean credit.');
    return output;
  }
  output.notes.push('Axe scan entries are reported as evidence only; this harness does not adjudicate violations into pass/fail.');
  if (assertions.some((assertion) => assertion?.passed !== true)) {
    output.status = 'failed';
    return output;
  }
  output.status = 'passed';
  return output;
};

const createScope = (inventory, pilotMode) => {
  const catalogJourneyIds = inventory.map(({ id }) => id);
  const catalogJourneyIdSet = new Set(catalogJourneyIds);
  const requiredJourneyIds = pilotMode ? pilotJourneyIds : catalogJourneyIds;
  const requiredJourneySet = new Set(requiredJourneyIds);
  return {
    mode: pilotMode ? 'pilot' : 'full',
    requiredJourneyIds,
    excludedJourneyIds: catalogJourneyIds.filter((id) => !requiredJourneySet.has(id)),
    requiredFixtures: [...new Set(inventory.filter(({ id }) => requiredJourneySet.has(id)).map(({ fixture }) => fixture))],
    missingRequiredJourneyIds: requiredJourneyIds.filter((id) => !catalogJourneyIdSet.has(id)),
  };
};

const productCoverage = (scope) => ({
  mode: scope.mode,
  requiredJourneyIds: scope.requiredJourneyIds,
  excludedJourneyIds: scope.excludedJourneyIds,
});

const buildProduct = (journeys, scope) => ({
  status: summarizeJourneyStatus(journeys),
  journeys,
  coverage: productCoverage(scope),
  note: 'Axe results are captured as evidence. This report does not adjudicate WCAG compliance from scans alone.',
});

const buildReportSkeleton = (inventory, options, scope) => ({
  attemptId: basename(options.attempt),
  status: 'in_progress',
  startedAt: new Date().toISOString(),
  expectedDigest: options.digest,
  sourceBase: options.sourceBase,
  scope: {
    mode: scope.mode,
    requiredJourneyIds: scope.requiredJourneyIds,
    excludedJourneyIds: scope.excludedJourneyIds,
    requiredFixtures: scope.requiredFixtures,
  },
  controls: {
    browserOffline: true,
    serviceWorkers: 'block',
    navigatorOnlineSignalOverride: true,
    allow: 'GET to exact verified static URLs only',
    webSockets: 'close without connecting',
    liveNetworkFallback: false,
    processNetworkPolicy: 'macOS sandbox-exec deny network*',
  },
  fixtureSmoke: [],
  product: {
    status: 'not_run',
    coverage: productCoverage(scope),
    journeys: inventory.map(({ id, title, fixture }) => ({ id, title, fixture, status: 'not_run' })),
  },
});

const runDesignerRuntime = async (options) => {
  verifyLauncherGate(options);
  const inventoryPath = join(options.root, 'accessibility-pilot', 'journey-inventory.json');
  const inventory = await readJson(inventoryPath);
  const scope = createScope(inventory, options.pilot === true);
  const report = buildReportSkeleton(inventory, options, scope);
  const requiredJourneySet = new Set(scope.requiredJourneyIds);
  const knownFixtureSet = new Set(fixtureSmokeTargets.map((fixture) => fixture.fixture));
  const smokeTargets = fixtureSmokeTargets.filter((fixture) => scope.requiredFixtures.includes(fixture.fixture));
  const missingRequiredFixtureTargets = scope.requiredFixtures.filter((fixture) => !knownFixtureSet.has(fixture));
  for (const [index, journey] of inventory.entries()) {
    if (requiredJourneySet.has(journey.id)) {
      continue;
    }
    report.product.journeys[index] = {
      ...report.product.journeys[index],
      notes: [`Excluded from ${scope.mode} scope; no attempt was made and no credit is applied.`],
    };
  }
  const interruptState = { requested: false, signal: null };
  const onSignal = (signal) => {
    interruptState.requested = true;
    interruptState.signal = signal;
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  let browser;
  try {
    await writeJsonAtomic(options.report, report);
    if (scope.missingRequiredJourneyIds.length > 0) {
      throw new Error(
        `Missing required journey IDs in accessibility-pilot/journey-inventory.json: ${scope.missingRequiredJourneyIds.join(', ')}`
      );
    }
    if (missingRequiredFixtureTargets.length > 0) {
      throw new Error(`Missing fixture smoke mappings for required fixtures: ${missingRequiredFixtureTargets.join(', ')}`);
    }
    const siteRoot = join(options.root, '.ephemeral-site');
    await mkdir(options.attempt, { recursive: true });
    const trustedPolicyPath = join(options.root, 'scripts', 'ephemeral', 'staticwebapp.config.json');
    const trustedPolicy = await readJson(trustedPolicyPath);
    const localPolicy = await readJson(join(siteRoot, 'staticwebapp.config.json'));
    if (JSON.stringify(canonicalize(localPolicy)) !== JSON.stringify(canonicalize(trustedPolicy))) {
      throw new Error('Local staticwebapp.config.json does not match scripts/ephemeral/staticwebapp.config.json.');
    }
    const responseHeaders = {
      ...supportedRouteHeaders,
      ...trustedPolicy.globalHeaders,
    };
    report.sandboxVerification = await verifySandboxNetworkDenied();
    const snapshot = await snapshotDirectory(siteRoot);
    report.actualDigest = snapshot.manifestDigest;
    report.assetCount = snapshot.assetCount;
    if (snapshot.manifestDigest !== options.digest) {
      throw new Error(
        `Digest mismatch for .ephemeral-site. Expected ${options.digest}, received ${snapshot.manifestDigest}. Refusing to run.`
      );
    }
    await writeFile(join(options.attempt, 'artifact.sha256'), snapshot.manifestText);
    await writeJsonAtomic(options.report, report);

    const runtime = {
      origin: options.origin,
      snapshot,
      responseHeaders,
    };
    browser = await chromium.launch({ headless: true });
    report.browserVersion = browser.version();
    await writeJsonAtomic(options.report, report);

    for (const fixtureTarget of smokeTargets) {
      if (interruptState.requested) {
        break;
      }
      report.fixtureSmoke.push(await runFixtureSmoke(browser, runtime, fixtureTarget, options.attempt));
      await writeJsonAtomic(options.report, report);
    }

    const journeyModuleUrl = pathToFileURL(join(options.root, 'scripts', 'accessibility-pilot', 'designer-journeys.mjs')).href;
    const journeyModule = await import(journeyModuleUrl);
    const checks = journeyModule.journeyChecks ?? {};
    const gaps = journeyModule.journeyGaps ?? {};
    if (!isPlainObject(checks)) {
      throw new Error('journeyChecks must be a plain object keyed by journey ID.');
    }
    if (!isPlainObject(gaps)) {
      throw new Error('journeyGaps must be a plain object keyed by journey ID.');
    }
    const fixtureLookup = new Map(smokeTargets.map((fixture) => [fixture.fixture, fixture]));
    const journeyOutcomes = report.product.journeys;
    for (const [index, journey] of inventory.entries()) {
      if (!requiredJourneySet.has(journey.id)) {
        continue;
      }
      if (interruptState.requested) {
        journeyOutcomes[index] = {
          ...journeyOutcomes[index],
          notes: [`Interrupted by ${interruptState.signal}; journey was not started and no credit is applied.`],
        };
        continue;
      }
      if (!report.fixtureSmoke.some(({ fixture, status }) => fixture === journey.fixture && status === 'passed')) {
        journeyOutcomes[index] = {
          ...journeyOutcomes[index],
          notes: ['Fixture smoke did not pass; journey was not started.'],
        };
        continue;
      }
      const check = checks[journey.id];
      const gapReason = typeof gaps[journey.id] === 'string' ? gaps[journey.id] : null;
      const outcome = await runJourney({
        browser,
        runtime,
        journey,
        journeyCheck: check,
        journeyGapReason: gapReason,
        fixtureLookup,
        attemptDirectory: options.attempt,
      });
      if (interruptState.requested) {
        outcome.status = 'not_run';
        outcome.notes.push(`Interrupted by ${interruptState.signal}; partial evidence is not credited.`);
      }
      journeyOutcomes[index] = outcome;
      report.product = buildProduct(journeyOutcomes, scope);
      await writeJsonAtomic(options.report, report);
    }
    report.product = buildProduct(journeyOutcomes, scope);
    const journeyById = new Map(journeyOutcomes.map((journey) => [journey.id, journey]));
    const requiredJourneyOutcomes = scope.requiredJourneyIds.map((id) => journeyById.get(id)).filter(Boolean);
    const missingRequiredJourneyResults = scope.requiredJourneyIds.filter((id) => !journeyById.has(id));
    const fixtureByName = new Map(report.fixtureSmoke.map((fixture) => [fixture.fixture, fixture]));
    const requiredFixtureOutcomes = scope.requiredFixtures.map((fixture) => fixtureByName.get(fixture)).filter(Boolean);
    const missingRequiredFixtureResults = scope.requiredFixtures.filter((fixture) => !fixtureByName.has(fixture));
    const failingRequiredFixtures = requiredFixtureOutcomes.some((fixture) => fixture.status === 'failed');
    const failingRequiredJourneys = requiredJourneyOutcomes.some((journey) => journey.status === 'failed');
    const failedRequiredAttempts = requiredJourneyOutcomes.some((journey) => journey.attempt?.failed === true);
    const incompleteRequiredFixtures = requiredFixtureOutcomes.some((fixture) => fixture.status !== 'passed');
    const incompleteRequiredJourneys = requiredJourneyOutcomes.some((journey) => journey.status !== 'passed');
    const missingRequiredJourneyIds = [...new Set([...scope.missingRequiredJourneyIds, ...missingRequiredJourneyResults])];
    const missingRequiredFixtures = [...new Set([...missingRequiredFixtureTargets, ...missingRequiredFixtureResults])];
    report.scope.validation = {
      missingRequiredJourneyIds,
      missingRequiredFixtures,
    };
    if (failingRequiredFixtures || failingRequiredJourneys || failedRequiredAttempts || missingRequiredJourneyIds.length > 0) {
      report.status = 'failed';
    } else if (interruptState.requested || incompleteRequiredFixtures || incompleteRequiredJourneys || missingRequiredFixtures.length > 0) {
      report.status = 'incomplete';
    } else {
      report.status = 'passed';
    }
    const allKnownBlockedFonts = [
      ...new Set(
        [...report.fixtureSmoke, ...journeyOutcomes].flatMap((item) => item.blockedKnownOfficeFonts ?? []).map((entry) => `${entry.url}`)
      ),
    ];
    report.limitations = {
      blockedKnownOfficeFonts: allKnownBlockedFonts,
      note: 'Blocked Office CDN font/icon requests are replay limitations, not product accessibility findings.',
    };
  } catch (error) {
    report.status = 'failed';
    report.error = serializeError(error);
  } finally {
    if (browser) {
      await browser.close();
    }
    report.finishedAt = new Date().toISOString();
    await writeJsonAtomic(options.report, report);
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
  }
  return report.status === 'passed' ? 0 : 1;
};

const maybeRunCli = async () => {
  const selfPath = fileURLToPath(import.meta.url);
  const entryPath = process.argv[1] ? resolve(process.argv[1]) : null;
  if (!entryPath || entryPath !== selfPath) {
    return;
  }
  const args = parseCli(process.argv);
  const required = ['root', 'attempt', 'report', 'digest', 'source-base', 'origin', 'token'];
  for (const key of required) {
    if (!args[key]) {
      throw new Error(`Missing required argument: --${key}`);
    }
  }
  const exitCode = await runDesignerRuntime({
    root: args.root,
    attempt: args.attempt,
    report: args.report,
    digest: args.digest,
    sourceBase: args['source-base'],
    origin: args.origin,
    token: args.token,
    pilot: args.pilot === true,
  });
  process.exitCode = exitCode;
};

export { runDesignerRuntime };

maybeRunCli().catch((error) => {
  console.error('Designer replay runtime failed:', error.message);
  process.exitCode = 1;
});
