const productReason = 'This pilot runs synthetic checks only; no Designer fixture was opened.';

export const createReport = (inventory, synthetic) => ({
  product: {
    status: 'not_run',
    reason: productReason,
    journeys: inventory.map((journey) => ({ ...journey, status: 'not_run' })),
  },
  synthetic,
});

const asArray = (value) => (Array.isArray(value) ? value : []);

const collectTests = (suites) =>
  asArray(suites).flatMap((suite) => [...asArray(suite?.specs).flatMap((spec) => asArray(spec?.tests)), ...collectTests(suite?.suites)]);

const isBrowserEvidence = (attachment) => {
  if (attachment?.contentType !== 'application/json' || typeof attachment.body !== 'string') {
    return false;
  }
  try {
    const evidence = JSON.parse(Buffer.from(attachment.body, 'base64').toString('utf8'));
    if (!evidence?.browserVersion) {
      return false;
    }
    if (attachment.name === 'synthetic-axe') {
      return Boolean(evidence.testEngine?.version) && Array.isArray(evidence.violations) && Array.isArray(evidence.incomplete);
    }
    return attachment.name === 'synthetic-keyboard' && asArray(evidence.steps).length > 0 && typeof evidence.returnedToOpener === 'boolean';
  } catch {
    // Malformed attachments are missing evidence even when Playwright reports a passing assertion.
    return false;
  }
};

const hasEvidence = (test) => {
  const result = asArray(test?.results).at(-1);
  return result?.status === 'passed' && asArray(result.attachments).some(isBrowserEvidence);
};

export const summarizePlaywright = (processResult, report) => {
  const { status: exitCode, signal, error } = processResult;
  const errors = [...(error ? [error.message] : []), ...(Array.isArray(report?.errors) ? report.errors : [])];
  const { expected, unexpected, flaky, skipped } = report?.stats ?? {};
  const counts = [expected, unexpected, flaky, skipped];
  const hasResults =
    Array.isArray(report?.suites) && report.suites.length > 0 && counts.every((count) => Number.isSafeInteger(count) && count >= 0);

  // A successful process alone is not evidence. Missing, skipped and empty runs cannot pass.
  const tests = collectTests(report?.suites);
  let status = 'incomplete';
  if (exitCode !== 0 || signal || errors.length > 0 || (hasResults && (unexpected > 0 || flaky > 0))) {
    status = 'failed';
  } else if (hasResults && expected > 0 && skipped === 0) {
    if (tests.length === expected && tests.every(hasEvidence)) {
      status = 'passed';
    } else {
      errors.push('One or more passing self-tests lack browser evidence in the Playwright report.');
    }
  }

  return {
    status,
    exitCode,
    signal,
    errors,
    counts: hasResults ? { expected, unexpected, flaky, skipped } : null,
  };
};

export const renderSummary = ({ product, synthetic }) =>
  [
    '# Accessibility pilot',
    '',
    `**No product evidence collected.** ${product.reason}`,
    '',
    '| Designer v1 journey | Mock fixture | Evidence still needed | Status |',
    '| --- | --- | --- | --- |',
    ...product.journeys.map(
      ({ title, fixture, expectedEvidence, status }) => `| ${title} | ${fixture} | ${expectedEvidence} | ${status} |`
    ),
    '',
    `**Synthetic self-tests:** ${synthetic.status}. These results do not establish product accessibility or WCAG conformance.`,
    '',
    'See `report.json` for execution status and diagnostics, and `playwright-report.json` for test results and attachments when available.',
    '',
  ].join('\n');
