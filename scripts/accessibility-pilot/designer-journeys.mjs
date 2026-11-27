import { expect } from '@playwright/test';
import axe from 'axe-core';

const timeout = 4000;
const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];
const focused = (page) =>
  page.evaluate(() => {
    const element = document.activeElement;
    return {
      tag: element?.tagName.toLowerCase(),
      id: element?.id || null,
      label: element?.getAttribute('aria-label'),
      automationId: element?.getAttribute('data-automation-id'),
      role: element?.getAttribute('role'),
    };
  });

async function press(page, evidence, key) {
  const before = await focused(page);
  await page.keyboard.press(key);
  evidence.keyboard.push({ key, before, after: await focused(page) });
}

async function type(page, evidence, text) {
  const before = await focused(page);
  await page.keyboard.type(text);
  evidence.keyboard.push({ key: 'type', text, before, after: await focused(page) });
}

async function tabTo(page, evidence, target, key = 'Tab', limit = 80) {
  await expect(target).toBeVisible({ timeout });
  // Never focus the target programmatically: reaching it by tabbing is part of the evidence.
  for (let step = 0; step <= limit; step++) {
    if (await target.evaluateAll((elements) => elements.includes(document.activeElement))) {
      return;
    }
    if (step < limit) {
      await press(page, evidence, key);
    }
  }
  throw new Error(`Did not reach ${target} after ${limit} ${key} presses`);
}

async function check(evidence, name, verify) {
  try {
    await verify();
    evidence.assertions.push({ name, passed: true });
    return true;
  } catch (error) {
    evidence.assertions.push({ name, passed: false, error: error.message });
    return false;
  }
}

async function scan(page, evidence, state, scope) {
  await expect(page.locator(scope)).toBeVisible({ timeout });
  if (evidence.scans.length === 0) {
    await page.addScriptTag({ content: axe.source });
  }
  const result = await page.evaluate(
    async ({ scope, tags }) => {
      const availableTags = new Set(window.axe.getRules().flatMap(({ tags }) => tags));
      const supportedTags = tags.filter((tag) => availableTags.has(tag));
      if (!supportedTags.length) {
        throw new Error('The pinned axe engine does not support the selected tags');
      }
      const { testEngine, violations, incomplete } = await window.axe.run(scope, {
        runOnly: { type: 'tag', values: supportedTags },
        resultTypes: ['violations', 'incomplete'],
      });
      return { testEngine, supportedTags, violations, incomplete };
    },
    { scope, tags: wcagTags }
  );
  evidence.scans.push({ state, scope, requestedTags: wcagTags, ...result });
}

async function detailsOpenClose(page, evidence) {
  const opener = page.locator('#msla-node-manual');
  const details = '#msla-node-details-panel-manual';
  const panel = page.locator(details);
  const close = page.locator('#msla-panel-header-close-nav');
  // Keep the historical Escape trace separate from this run's supported dismissal path.
  evidence.observations.escapeOnClose = {
    classification: 'advisory-ux',
    priorAttempt: 'attempt-FfmG6U',
    observation: 'Escape on the focused Close button left Details open and focus on Close. Not retested in this journey.',
    interpretation: 'This does not establish a WCAG failure or a focus-restoration defect: no dismissal occurred.',
    sourceAnchors: [
      'libs/designer/src/lib/ui/panel/panelRoot.tsx:128-137',
      'libs/designer-ui/src/lib/panel/panelcontainer.tsx:277-305',
      'libs/designer-ui/src/lib/panel/panelheader/panelheader.tsx:88-115',
      'libs/designer-ui/src/lib/card/index.tsx:165-189',
    ],
  };
  await expect(panel).toBeHidden({ timeout });
  await tabTo(page, evidence, opener);
  await press(page, evidence, 'Enter');
  await expect(panel).toBeVisible({ timeout });
  const closeFocused = await check(evidence, 'Opening the manual node places focus on the details Close button', () =>
    expect(close).toBeFocused({ timeout })
  );
  evidence.observations.openFocus = await focused(page);
  await scan(page, evidence, 'manual details open', '.msla-panel-layout:has(#msla-node-details-panel-manual)');
  if (!closeFocused) {
    return;
  }
  const dismissed = await check(evidence, 'Enter on Close dismisses the manual details', async () => {
    await expect(close).toBeFocused({ timeout });
    await press(page, evidence, 'Enter');
    expect(evidence.keyboard.at(-1).before.id).toBe('msla-panel-header-close-nav');
    await expect(panel).toBeHidden({ timeout });
  });
  // Focus restoration is meaningful only after the panel has dismissed.
  if (!dismissed) {
    return;
  }
  await check(evidence, 'Dismissal restores focus to the manual node', () => expect(opener).toBeFocused({ timeout }));
  evidence.observations.afterDismissal = await focused(page);
}

async function nestedGraph(page, evidence) {
  const branch = page.locator('#msla-node-Conditional_Case');
  const edge = page.getByRole('button', { name: 'Insert a new step between Conditional Case and Condition', exact: true });
  const terminate = page.locator('#msla-node-Terminate');
  const collapse = page.locator('[data-automation-id="Conditional_Case-collapse-toggle"]');
  await tabTo(page, evidence, branch);
  await tabTo(page, evidence, edge, 'Tab', 8);
  await tabTo(page, evidence, terminate, 'Tab', 12);
  await scan(page, evidence, 'Conditional Case expanded', '.react-flow');
  await tabTo(page, evidence, collapse, 'Shift+Tab', 16);
  await press(page, evidence, 'Enter');
  await expect(page.locator('[data-automation-id="subgraph-Conditional_Case-#subgraph-no-actions"]')).toBeVisible({ timeout });
  await check(evidence, 'Nested descendant cards and the insertion edge leave the DOM after collapse', async () => {
    await expect(page.locator('#msla-node-Condition, #msla-node-Terminate, #msla-node-Terminate_2')).toHaveCount(0, { timeout });
    await expect(edge).toHaveCount(0, { timeout });
  });
  await check(evidence, 'The collapse toggle keeps focus and Tab skips the removed descendants', async () => {
    await expect(collapse).toBeFocused({ timeout });
    await press(page, evidence, 'Tab');
    const next = evidence.keyboard.at(-1).after;
    expect(next.tag).not.toBe('body');
    expect(next.id).not.toMatch(/^msla-node-(Condition|Terminate|Terminate_2)$/);
    expect(next.label).not.toBe('Insert a new step between Conditional Case and Condition');
  });
  await scan(page, evidence, 'Conditional Case collapsed', '.react-flow');
}

async function validationRecovery(page, evidence) {
  const node = page.locator('#msla-node-HTTP');
  const panel = page.locator('#msla-node-details-panel-HTTP');
  const uri = panel.getByLabel('URI*', { exact: true });
  const close = page.locator('#msla-panel-header-close-nav');
  const errors = page.getByRole('button', { name: 'Errors', exact: true });
  const errorPanel = '.msla-error-panel-body';
  const message = "'URI' is required.";
  const card = page.locator(`${errorPanel} .msla-error-card`).filter({ hasText: message });

  await tabTo(page, evidence, node);
  await press(page, evidence, 'Enter');
  await tabTo(page, evidence, uri);
  await press(page, evidence, 'ControlOrMeta+a');
  await press(page, evidence, 'Backspace');
  await dismissalByButton(page, evidence, panel, close, 'Shift+Tab');
  await tabTo(page, evidence, errors);
  await press(page, evidence, 'Enter');
  await expect(card.getByText(message, { exact: true })).toBeVisible({ timeout });
  await scan(page, evidence, 'required URI error in Errors', errorPanel);

  await tabTo(page, evidence, card);
  await press(page, evidence, 'Enter');
  await expect(panel).toBeVisible({ timeout });
  await tabTo(page, evidence, uri);
  const corrected = 'https://example.invalid/';
  await type(page, evidence, corrected);
  // Leaving the editor commits the input; reopening Errors makes disappearance meaningful.
  await press(page, evidence, 'Tab');
  await check(evidence, 'The URI field retains the correction after blur', async () => {
    await expect
      .poll(() => uri.evaluate((element) => ('value' in element ? element.value : element.textContent)), { timeout })
      .toBe(corrected);
  });
  await dismissalByButton(page, evidence, panel, close, 'Shift+Tab');
  await tabTo(page, evidence, errors);
  await press(page, evidence, 'Enter');
  await expect(page.locator(errorPanel)).toBeVisible({ timeout });
  await check(evidence, 'Errors no longer lists the specific missing URI error', () => expect(card).toHaveCount(0, { timeout }));
}

async function dismissalByButton(page, evidence, panel, close, key = 'Tab') {
  await tabTo(page, evidence, close, key);
  await press(page, evidence, 'Enter');
  await expect(panel).toBeHidden({ timeout });
}

async function discoveryAndInsertion(page, evidence) {
  const search = page.getByRole('button', { name: 'Search workflow actions', exact: true });
  const selector = '[role="dialog"][aria-label="Go to operation"]';
  const dialog = page.locator(selector);
  const input = dialog.getByPlaceholder('Search for operation', { exact: true });
  const result = dialog.locator('.msla-op-search-card-title').filter({ hasText: /^Verify property changes$/ });
  const operation = page.locator('#msla-node-Verify_property_changes');
  const details = page.locator('#msla-node-details-panel-Verify_property_changes');
  await tabTo(page, evidence, search);
  await press(page, evidence, 'Enter');
  await expect(dialog).toBeVisible({ timeout });
  await tabTo(page, evidence, input);
  await type(page, evidence, 'Verify property changes');
  await expect(result).toBeVisible({ timeout });
  await scan(page, evidence, 'workflow search results', selector);
  await tabTo(page, evidence, result);
  await press(page, evidence, 'Enter');
  // Search can return to the selected canvas node rather than opening its details.
  await expect(dialog).toBeHidden({ timeout });
  if (!(await details.isVisible())) {
    await expect(operation).toBeFocused({ timeout });
    await press(page, evidence, 'Enter');
  }
  await expect(details).toBeVisible({ timeout });
  evidence.observations.existingOperationOpened = true;
  await dismissalByButton(page, evidence, details, page.locator('#msla-panel-header-close-nav'));
  await insertScopeAfterSetVariable(page, evidence);
}

async function insertScopeAfterSetVariable(page, evidence) {
  const edge = (label) => page.getByRole('button', { name: label, exact: true });
  const newScope = page.locator('#msla-node-Scope');
  const originalEdge = edge('Insert a new step after Set variable');
  await expect(newScope).toHaveCount(0, { timeout });
  await tabTo(page, evidence, originalEdge);
  await press(page, evidence, 'Enter');
  await tabTo(page, evidence, page.getByRole('menuitem', { name: 'Add an action', exact: true }));
  await press(page, evidence, 'Enter');
  await tabTo(page, evidence, page.getByPlaceholder('Search for an action or', { exact: false }));
  await type(page, evidence, 'scope');
  await tabTo(page, evidence, page.getByRole('button', { name: 'Scope', exact: true }));
  await press(page, evidence, 'Enter');
  // The new card alone is not proof of where it was inserted; verify both edges as well.
  await check(evidence, 'A new Scope connects after Set variable at the selected edge', async () => {
    await expect(newScope).toBeVisible({ timeout });
    await expect(edge('Insert a new step between Set variable and Scope')).toBeAttached({ timeout });
    await expect(originalEdge).toHaveCount(0, { timeout });
  });
}

async function tokenEditing(page, evidence) {
  const node = page.locator('#msla-node-Parse_JSON');
  const panel = page.locator('#msla-node-details-panel-Parse_JSON');
  const content = panel.getByLabel(/^Content\s*\*$/);
  const expression = "length(variables('ArrayVariable'))";
  // Lexical gives the chip wrapper the serialized expression, not its shortened label.
  const committed = content.locator(`[id="@{${expression}}"]`);
  const selector = '.msla-token-picker-container-v3';
  const picker = page.locator(selector);
  const expressionEditor = picker.locator('.cm-content[contenteditable="true"]');
  const insertDynamicContent = page.getByRole('option', { name: 'Insert dynamic content', exact: true });
  const insertExpression = page.getByRole('option', { name: 'Insert expression', exact: true });
  const dynamicTab = picker.getByRole('tab', { name: 'Dynamic content', exact: true });

  await tabTo(page, evidence, node);
  await press(page, evidence, 'Enter');
  await tabTo(page, evidence, content);
  await expect(committed).toHaveCount(0, { timeout });
  // Use the editor's advertised keyboard path rather than its floating icon.
  await press(page, evidence, '/');
  await expect(insertDynamicContent).toHaveAttribute('aria-selected', 'true', { timeout });
  await press(page, evidence, 'ArrowDown');
  await expect(insertExpression).toHaveAttribute('aria-selected', 'true', { timeout });
  await expect(content).toBeFocused({ timeout });
  await press(page, evidence, 'Enter');
  await expect(expressionEditor).toBeFocused({ timeout });
  await tabTo(page, evidence, picker.getByRole('button', { name: /^length\(collection\) Returns/ }));
  await press(page, evidence, 'Enter');
  await expect(expressionEditor).toBeFocused({ timeout });

  // The horizontal Pivot has one Tab stop; arrow keys reach its other tab.
  await tabTo(page, evidence, picker.getByRole('tab', { name: 'Function', exact: true }));
  await press(page, evidence, 'ArrowRight');
  await expect(dynamicTab).toBeFocused({ timeout });
  await press(page, evidence, 'Enter');
  await expect(dynamicTab).toHaveAttribute('aria-selected', 'true', { timeout });
  await tabTo(page, evidence, picker.getByRole('button', { name: 'ArrayVariable', exact: true }));
  await press(page, evidence, 'Enter');
  await expect(expressionEditor).toHaveText(expression, { timeout });
  await scan(page, evidence, 'expression picker with ArrayVariable', selector);
  await tabTo(page, evidence, picker.locator('[data-automation-id="msla-token-picker-expression-addorupdate-button"]'));
  await press(page, evidence, 'Enter');
  await expect(picker).toBeHidden({ timeout });
  await check(evidence, 'Content contains the exact committed ArrayVariable expression', () => expect(committed).toBeVisible({ timeout }));
  await check(evidence, 'Committing the expression returns focus to the Content editor', () => expect(content).toBeFocused({ timeout }));
}

export const journeyChecks = {
  'action-discovery-insertion': discoveryAndInsertion,
  'details-open-close': detailsOpenClose,
  'nested-graph': nestedGraph,
  'token-editing': tokenEditing,
  'validation-recovery': validationRecovery,
};

export const journeyGaps = {};
