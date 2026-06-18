import * as fs from 'fs';
import { Workbench, type WebView, By, until, EditorView, type WebDriver, type WebElement, Key } from 'vscode-extension-tester';
import {
  TEST_TIMEOUT,
  POLL_INTERVAL,
  TYPE_SETTLE,
  WORKSPACE_MANIFEST_PATH,
  appendToWorkspaceManifest,
  buildManifestEntry,
  uniqueName,
  sleep,
  captureScreenshot,
  createTempDir,
  selectCreateWorkspaceCommand,
  waitForExtensionReady,
  dismissNotifications,
  switchToWebviewFrame,
  waitForCreateWorkspaceFormReady,
  toXPathLiteral,
  findInputByLabel,
  findDropdownByLabel,
  selectDropdownOption,
  selectRadioOption,
  clearAndType,
  waitForPathValidation,
  waitForNextButton,
  findButtonByText,
  clickCreateWorkspaceButton,
  deepVerifyWorkspace,
  fillStandardFormFields,
  fillCustomCodeFields,
  dumpFormState,
} from './createWorkspaceShared';

describe('Create Workspace Tests', function () {
  this.timeout(TEST_TIMEOUT);

  let workbench: Workbench;
  let driver: WebDriver;
  const tempDir = createTempDir();

  before(async function () {
    this.timeout(120_000);
    workbench = new Workbench();
    driver = workbench.getDriver();
    console.log('[setup] Waiting for extension to be ready...');
    await waitForExtensionReady(workbench);
    console.log('[setup] Extension is ready');
  });

  after(async () => {
    // NOTE: We intentionally do NOT clean up tempDir here.
    // Created workspaces are recorded in the manifest file at WORKSPACE_MANIFEST_PATH
    // so downstream test suites can load and inspect them.
    // Cleanup should happen in the final test suite that consumes the manifest.
    console.log(`[teardown] Workspace manifest: ${WORKSPACE_MANIFEST_PATH}`);
    try {
      if (fs.existsSync(WORKSPACE_MANIFEST_PATH)) {
        const manifest = JSON.parse(fs.readFileSync(WORKSPACE_MANIFEST_PATH, 'utf-8'));
        console.log(`[teardown] ${manifest.length} workspaces recorded in manifest`);
      }
    } catch {
      // Ignore
    }
  });

  // =========================================================================
  // PRE-CREATION WEBVIEW TESTS — Single shared webview instance.
  // Opens the webview once, runs all read-only checks, validation tests,
  // and interaction tests, then closes. Avoids redundant webview open/close.
  // =========================================================================
  describe('Pre-creation webview tests (single shared webview)', function () {
    this.timeout(TEST_TIMEOUT);

    before(function () {
      if (process.env.LA_E2E_CODEFUL_CREATE_ONLY === '1') {
        this.skip();
      }
    });

    let webview: WebView;

    before(async function () {
      this.timeout(120_000);
      console.log('[readonly] Opening shared webview...');
      await selectCreateWorkspaceCommand(workbench);
      webview = await switchToWebviewFrame(driver);
      console.log('[readonly] Shared webview ready');
      // Switch back so each test can switch in via beforeEach
      await webview.switchBack();
    });

    beforeEach(async () => {
      // Switch into the webview iframe before each test.
      // Use manual iframe switching — ExTester's webview.switchToFrame()
      // depends on .editor-instance / .monaco-workbench which may not
      // be present on slow CI runners.
      await driver.switchTo().defaultContent();
      const outerFrame = await driver.wait(
        until.elementLocated(By.css("iframe[class='webview ready']")),
        30_000,
        'Webview iframe not found in beforeEach'
      );
      await driver.switchTo().frame(outerFrame);
      const innerFrame = await driver.wait(until.elementLocated(By.id('active-frame')), 15_000, '#active-frame not found in beforeEach');
      await driver.switchTo().frame(innerFrame);
      await waitForCreateWorkspaceFormReady(driver);
      await sleep(200);
    });

    afterEach(async () => {
      // Switch back to VS Code chrome after each test
      try {
        await driver.switchTo().defaultContent();
      } catch {
        console.log('[readonly:afterEach] Could not switch to defaultContent');
      }
    });

    after(async () => {
      // Close the shared webview when all read-only tests are done
      try {
        await driver.switchTo().defaultContent();
        // Wait briefly for the VS Code UI to be interactable
        await sleep(2000);
        const editorView = new EditorView();
        await editorView.closeAllEditors();
      } catch {
        console.log('[readonly:after] Warning: could not close editors');
      }
      await sleep(1000);
    });

    // -----------------------------------------------------------------------
    // Test: Verify all form elements on initial render (consolidated)
    // Combines: correct command, dropdown options, step indicator, buttons,
    // radio options, descriptions, browse button, sections, required, nav
    // -----------------------------------------------------------------------
    it('should verify all form elements on initial render', async () => {
      await waitForCreateWorkspaceFormReady(driver);
      const pageText = await driver.findElement(By.css('body')).getText();
      const lowerPageText = pageText.toLowerCase();

      // 1. Correct command selected (not "from package")
      const packagePathLabels = await driver.findElements(By.xpath("//*[contains(text(), 'Package path')]"));
      if (packagePathLabels.length > 0) {
        throw new Error('Wrong webview: found "Package path" label - this is the "from package" flow');
      }
      console.log('[formElements] Correct command opened (no "Package path") ✓');

      // 2. Step indicator
      const hasStep1 = pageText.includes('Step 1 of 2') || pageText.includes('step 1 of 2');
      const hasProjectSetup = lowerPageText.includes('project setup');
      if (!hasStep1 && !hasProjectSetup) {
        throw new Error('Neither step indicator nor "Project setup" header found');
      }
      console.log('[formElements] Step indicator found ✓');

      // 3. Next button disabled when empty
      const nextButtons = await driver.findElements(By.xpath("//button[contains(text(), 'Next')]"));
      if (nextButtons.length === 0) {
        throw new Error('Next button not found on the form');
      }
      const nextDisabled = await nextButtons[0].getAttribute('disabled');
      const nextAriaDisabled = await nextButtons[0].getAttribute('aria-disabled');
      const isNextDisabled = nextDisabled === 'true' || nextDisabled === '' || nextAriaDisabled === 'true';
      if (!isNextDisabled) {
        throw new Error('Next button should be disabled when required fields are empty');
      }
      console.log('[formElements] Next button disabled ✓');

      // 4. Back button disabled or absent on step 0
      const backButtons = await driver.findElements(By.xpath("//button[contains(text(), 'Back')]"));
      if (backButtons.length > 0) {
        const backDisabled = await backButtons[0].getAttribute('disabled');
        const backAriaDisabled = await backButtons[0].getAttribute('aria-disabled');
        const isBackDisabled = backDisabled === 'true' || backDisabled === '' || backAriaDisabled === 'true';
        if (!isBackDisabled) {
          throw new Error('Back button should be disabled on the first step');
        }
      }
      console.log('[formElements] Back button disabled/absent ✓');

      // 5. All 3 radio options present
      const expectedRadioLabels = [
        'Logic app (Standard)',
        'Logic app (codeful)',
        'Logic app with custom code',
        'Logic app with rules engine',
      ];
      const missingLabels: string[] = [];
      for (const label of expectedRadioLabels) {
        if (!pageText.includes(label)) {
          missingLabels.push(label);
        }
      }
      if (missingLabels.length > 0) {
        throw new Error(`Missing radio labels: ${JSON.stringify(missingLabels)}`);
      }
      const radios = await driver.findElements(By.css('input[type="radio"]'));
      if (radios.length < 4) {
        throw new Error(`Expected at least 4 radio inputs, found ${radios.length}`);
      }
      console.log('[formElements] 4 radio options present OK');

      // 6. Radio description keywords
      const descKeywords = [
        { label: 'Standard', keywords: ['workflow'] },
        { label: 'Custom code', keywords: ['custom', 'code'] },
        { label: 'Rules engine', keywords: ['rule'] },
      ];
      for (const desc of descKeywords) {
        const allFound = desc.keywords.every((kw) => lowerPageText.includes(kw));
        if (allFound) {
          console.log(`[formElements] "${desc.label}" description keywords found ✓`);
        } else {
          console.log(`[formElements] Warning: "${desc.label}" description keywords not all found`);
        }
      }

      // 7. Browse button present
      const browseButtons = await driver.findElements(By.xpath("//button[contains(text(), 'Browse')]"));
      if (browseButtons.length === 0) {
        throw new Error('Browse button not found');
      }
      if (!(await browseButtons[0].isDisplayed())) {
        throw new Error('Browse button is not visible');
      }
      console.log('[formElements] Browse button visible ✓');

      // 8. Section headers
      const expectedSections = [
        { name: 'Workspace/Project setup', patterns: ['workspace parent folder path', 'workspace name'] },
        { name: 'Logic App Details', patterns: ['logic app name'] },
        { name: 'Workflow Configuration', patterns: ['workflow name', 'workflow type'] },
      ];
      for (const section of expectedSections) {
        const found = section.patterns.some((p) => lowerPageText.includes(p));
        if (!found) {
          throw new Error(`Section "${section.name}" not found. Patterns: ${JSON.stringify(section.patterns)}`);
        }
      }
      console.log('[formElements] Section headers present ✓');

      // 9. Required field indicators
      const requiredInputs = await driver.findElements(By.css('input[required], input[aria-required="true"]'));
      const requiredLabels = await driver.findElements(By.css('label[class*="required"], span[class*="required"]'));
      if (requiredInputs.length === 0 && requiredLabels.length === 0) {
        const labels = await driver.findElements(By.css('label'));
        let asteriskCount = 0;
        for (const label of labels) {
          const text = await label.getText();
          if (text.includes('*')) {
            asteriskCount++;
          }
        }
        if (asteriskCount === 0) {
          console.log('[formElements] Warning: No required indicators found — may be a Fluent UI rendering difference');
        }
      }
      console.log('[formElements] Required indicators checked ✓');

      // 10. Step navigation labels
      const hasReviewCreate = lowerPageText.includes('review') && (lowerPageText.includes('create') || lowerPageText.includes('+'));
      if (!hasProjectSetup && !hasReviewCreate) {
        console.log('[formElements] Warning: step navigation labels not found');
      }
      console.log('[formElements] Step navigation checked ✓');

      // 11. Workflow type dropdown options
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await wfTypeDropdown.click();
      await sleep(500);
      const options = await driver.findElements(By.css('[role="option"]'));
      const optionTexts: string[] = [];
      for (const opt of options) {
        optionTexts.push((await opt.getText()).trim());
      }
      await driver.actions().sendKeys(Key.ESCAPE).perform();
      await sleep(300);
      const expectedOptions = ['Stateful', 'Stateless', 'Autonomous agents (Preview)', 'Conversational agents (Preview)'];
      for (const expected of expectedOptions) {
        if (!optionTexts.some((opt) => opt.includes(expected))) {
          throw new Error(`Expected dropdown option "${expected}" not found. Available: ${JSON.stringify(optionTexts)}`);
        }
      }
      console.log(`[formElements] Workflow type dropdown options: ${JSON.stringify(optionTexts)} ✓`);

      await captureScreenshot(driver, 'formElements-passed');
      console.log('[formElements] PASSED: All form elements verified');
    });

    // =========================================================================
    // FORM VALIDATION TESTS — Reuses the same shared webview. No
    // close/reopen cycles needed. Helper functions scoped within this block.
    // =========================================================================

    // --- Validation helper functions ---

    // The default 20s ceiling raced the webview render on gen-6 CI
    // (`Pre-creation webview tests › should show validation error for
    // non-existent path` at createWorkspace.test.ts:2230 → 2221). Validation
    // is async (webview postMessage → extension → fs check → reply → render);
    // 45s gives the IPC roundtrip + DOM update enough slack on cold-start
    // Linux runners without masking a real validation regression (a broken
    // validator still fails — just after longer).
    async function findValidationMessage(drv: WebDriver, expectedText: string, timeout = 45_000): Promise<WebElement> {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        const candidates = await drv.findElements(By.xpath(`//*[contains(text(), ${toXPathLiteral(expectedText)})]`));
        for (const el of candidates) {
          try {
            if (await el.isDisplayed()) {
              const text = await el.getText();
              if (text.includes(expectedText)) {
                // Scroll the validation message into view so screenshots capture it
                await drv.executeScript('arguments[0].scrollIntoView({block:"center"});', el);
                await sleep(200);
                return el;
              }
            }
          } catch {
            // Element may have gone stale
          }
        }
        await sleep(POLL_INTERVAL);
      }
      throw new Error(`Validation message not found: "${expectedText}" (waited ${timeout}ms)`);
    }

    async function assertNextButtonDisabled(drv: WebDriver): Promise<void> {
      const timeout = 8_000;
      const deadline = Date.now() + timeout;

      while (Date.now() < deadline) {
        const nextButtons = await drv.findElements(By.xpath("//button[contains(text(), 'Next')]"));
        if (nextButtons.length === 0) {
          await sleep(POLL_INTERVAL);
          continue;
        }

        const disabled = await nextButtons[0].getAttribute('disabled');
        const ariaDisabled = await nextButtons[0].getAttribute('aria-disabled');
        const isDisabled = disabled === 'true' || disabled === '' || ariaDisabled === 'true';
        if (isDisabled) {
          return;
        }

        await sleep(POLL_INTERVAL);
      }

      throw new Error('Expected Next button to be disabled, but it is enabled');
    }

    async function assertCannotProceedToReview(drv: WebDriver): Promise<void> {
      const nextButtons = await drv.findElements(By.xpath("//button[contains(text(), 'Next')]"));
      if (nextButtons.length === 0) {
        throw new Error('Next button not found on the form');
      }

      await nextButtons[0].click();
      await sleep(TYPE_SETTLE);

      const createButtons = await drv.findElements(By.xpath("//button[contains(text(), 'Create workspace')]"));
      for (const button of createButtons) {
        if (await button.isDisplayed()) {
          throw new Error('Expected invalid form to block navigation, but review step was opened');
        }
      }

      const nextStillVisible = await drv.findElements(By.xpath("//button[contains(text(), 'Next')]"));
      if (nextStillVisible.length === 0) {
        throw new Error('Expected invalid form to block navigation, but review step was opened');
      }
    }

    async function assertInputShowsValidationMessage(input: WebElement, expectedContains?: string): Promise<void> {
      const timeout = 10_000;
      const deadline = Date.now() + timeout;
      let lastAriaInvalid: string | null = null;
      let lastDescribedBy: string | null = null;

      while (Date.now() < deadline) {
        const ariaInvalid = await input.getAttribute('aria-invalid');
        const describedBy = await input.getAttribute('aria-describedby');
        lastAriaInvalid = ariaInvalid;
        lastDescribedBy = describedBy;

        // Strategy 1: aria-describedby linkage from input to validation message
        if (describedBy) {
          const messageIds = describedBy.split(/\s+/).filter(Boolean);
          for (const id of messageIds) {
            const els = await driver.findElements(By.id(id));
            for (const el of els) {
              if (!(await el.isDisplayed())) {
                continue;
              }
              const text = (await el.getText()).trim();
              if (!text) {
                continue;
              }
              if (!expectedContains || text.toLowerCase().includes(expectedContains.toLowerCase())) {
                await driver.executeScript('arguments[0].scrollIntoView({block:"center"});', el);
                await sleep(200);
                return;
              }
            }
          }
        }

        // Strategy 2: visible validation text within the same Fluent Field container
        const fieldContainers = await input.findElements(By.xpath("ancestor::*[contains(@class, 'fui-Field')][1]"));
        if (fieldContainers.length > 0) {
          const fieldTextNodes = await fieldContainers[0].findElements(By.xpath(".//*[normalize-space(text())!='']"));
          for (const el of fieldTextNodes) {
            if (!(await el.isDisplayed())) {
              continue;
            }
            const text = (await el.getText()).trim();
            if (!text) {
              continue;
            }
            if (!expectedContains || text.toLowerCase().includes(expectedContains.toLowerCase())) {
              await driver.executeScript('arguments[0].scrollIntoView({block:"center"});', el);
              await sleep(200);
              return;
            }
          }
        }

        // Strategy 3: global fallback when field linkage is not exposed by accessibility attrs
        if (expectedContains) {
          const candidates = await driver.findElements(
            By.xpath(
              `//*[contains(translate(normalize-space(text()), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), ${toXPathLiteral(expectedContains.toLowerCase())})]`
            )
          );
          for (const el of candidates) {
            if (await el.isDisplayed()) {
              const text = (await el.getText()).trim();
              if (text.toLowerCase().includes(expectedContains.toLowerCase())) {
                await driver.executeScript('arguments[0].scrollIntoView({block:"center"});', el);
                await sleep(200);
                return;
              }
            }
          }
        }

        await sleep(POLL_INTERVAL);
      }

      throw new Error(
        `Expected a visible validation message${expectedContains ? ` containing "${expectedContains}"` : ''}. ` +
          `Last state: aria-invalid="${lastAriaInvalid}", aria-describedby="${lastDescribedBy}"`
      );
    }

    async function ensureOnProjectSetupStep(drv: WebDriver): Promise<void> {
      const pageText = (await drv.findElement(By.css('body')).getText()).toLowerCase();
      const onReviewStep = pageText.includes('review your configuration and create your logic app workspace');
      if (!onReviewStep) {
        return;
      }

      const backButtons = await drv.findElements(By.xpath("//button[contains(text(), 'Back')]"));
      if (backButtons.length === 0) {
        throw new Error('Expected Back button on review step, but none was found');
      }

      await backButtons[0].click();
      await sleep(TYPE_SETTLE);
    }

    async function findRulesEngineInputByLabel(drv: WebDriver, labelText: string): Promise<WebElement> {
      const labelXpath =
        labelText === 'Function name'
          ? "contains(text(), 'Function name') and not(contains(text(), 'namespace'))"
          : `contains(text(), ${toXPathLiteral(labelText)})`;

      const scopedLabels = await drv.findElements(
        By.xpath(`//label[contains(text(), 'Rules engine folder name')]/following::label[${labelXpath}]`)
      );

      for (const labelEl of scopedLabels) {
        try {
          if (!(await labelEl.isDisplayed())) {
            continue;
          }

          const forAttr = await labelEl.getAttribute('for');
          if (!forAttr) {
            continue;
          }

          const inputs = await drv.findElements(By.id(forAttr));
          for (const input of inputs) {
            if (await input.isDisplayed()) {
              return input;
            }
          }
        } catch {
          // Try next candidate
        }
      }

      throw new Error(`Could not find rules engine input for label "${labelText}"`);
    }

    async function findCustomCodeInputByLabel(drv: WebDriver, labelText: string): Promise<WebElement> {
      const labelXpath =
        labelText === 'Function name'
          ? "contains(text(), 'Function name') and not(contains(text(), 'namespace'))"
          : `contains(text(), ${toXPathLiteral(labelText)})`;

      const scopedLabels = await drv.findElements(
        By.xpath(`//label[contains(text(), 'Custom code folder name')]/following::label[${labelXpath}]`)
      );

      for (const labelEl of scopedLabels) {
        try {
          if (!(await labelEl.isDisplayed())) {
            continue;
          }

          const forAttr = await labelEl.getAttribute('for');
          if (!forAttr) {
            continue;
          }

          const inputs = await drv.findElements(By.id(forAttr));
          for (const input of inputs) {
            if (await input.isDisplayed()) {
              return input;
            }
          }
        } catch {
          // Try next candidate label.
        }
      }

      throw new Error(`Could not find custom code input for label "${labelText}"`);
    }

    /**
     * Helper: assert that NO validation message containing the given text is visible.
     */
    async function assertNoValidationMessage(drv: WebDriver, text: string): Promise<void> {
      await sleep(TYPE_SETTLE);
      const candidates = await drv.findElements(By.xpath(`//*[contains(text(), ${toXPathLiteral(text)})]`));
      for (const el of candidates) {
        try {
          if (await el.isDisplayed()) {
            const elText = await el.getText();
            if (elText.includes(text)) {
              throw new Error(`Validation message should NOT be visible: "${text}"`);
            }
          }
        } catch (e) {
          if (e instanceof Error && e.message.includes('should NOT be visible')) {
            throw e;
          }
        }
      }
    }

    /**
     * Helper: clear a field by selecting all text and deleting it.
     */
    async function clearField(element: WebElement): Promise<void> {
      await element.sendKeys(Key.chord(Key.CONTROL, 'a'));
      await element.sendKeys(Key.BACK_SPACE);
      await sleep(TYPE_SETTLE);
    }

    // -----------------------------------------------------------------------
    // Path validation
    // -----------------------------------------------------------------------
    it('should show validation error for non-existent path', async () => {
      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');

      // Type a path that cannot exist
      await clearAndType(pathInput, 'Z:\\nonexistent\\fake\\path\\that\\does\\not\\exist');
      await waitForPathValidation(driver);

      // Should show path validation error — async validation posts message to extension
      // The extension replies with path invalid, which triggers the error
      await findValidationMessage(driver, 'not exist');
      console.log('[validPath] Found validation error for non-existent path');

      // Next button should be disabled
      await assertNextButtonDisabled(driver);
      console.log('[validPath] Next button correctly disabled');

      // Fix with a valid path
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);
      await assertNoValidationMessage(driver, 'not exist');
      console.log('[validPath] Validation error cleared for valid path');

      await captureScreenshot(driver, 'validPath-passed');
      console.log('[validPath] PASSED');
    });

    it('should show validation error when path is cleared', async () => {
      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');

      // Ensure we have something typed first
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);

      // Now clear it
      await clearField(pathInput);

      await findValidationMessage(driver, 'cannot be empty');
      console.log('[validPathEmpty] Found "cannot be empty" error for empty path');

      await assertNextButtonDisabled(driver);

      // Restore valid path for subsequent tests
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);

      await captureScreenshot(driver, 'validPathEmpty-passed');
      console.log('[validPathEmpty] PASSED');
    });

    // -----------------------------------------------------------------------
    // Workspace name validation
    // -----------------------------------------------------------------------
    it('should show validation error for invalid workspace name (starts with number)', async () => {
      // Ensure path is valid
      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);

      const wsNameInput = await findInputByLabel(driver, 'Workspace name');
      await clearAndType(wsNameInput, '123invalid');

      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validWsNum] Found validation error for "123invalid"');

      await assertNextButtonDisabled(driver);

      // Fix it
      await clearAndType(wsNameInput, uniqueName('validws'));
      await assertNoValidationMessage(driver, 'must start with a letter');
      await captureScreenshot(driver, 'validWsNum-passed');
      console.log('[validWsNum] PASSED');
    });

    it('should show validation error for workspace name with special characters', async () => {
      const wsNameInput = await findInputByLabel(driver, 'Workspace name');

      // Spaces
      await clearAndType(wsNameInput, 'my workspace');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validWsSpecial] Error shown for spaces');

      // Special chars
      await clearAndType(wsNameInput, 'ws@#$name');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validWsSpecial] Error shown for special chars');

      await assertNextButtonDisabled(driver);

      // Restore valid value
      await clearAndType(wsNameInput, uniqueName('validws'));

      await captureScreenshot(driver, 'validWsSpecial-passed');
      console.log('[validWsSpecial] PASSED');
    });

    it('should show validation error for names with leading/trailing hyphens or underscores', async () => {
      const wsNameInput = await findInputByLabel(driver, 'Workspace name');

      await clearAndType(wsNameInput, '-leadinghyphen');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validLeading] Error for leading hyphen');

      await clearAndType(wsNameInput, '_leadingunderscore');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validLeading] Error for leading underscore');

      await clearAndType(wsNameInput, 'trailinghyphen-');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validLeading] Error for trailing hyphen');

      await assertNextButtonDisabled(driver);

      // Restore
      await clearAndType(wsNameInput, uniqueName('validws'));

      await captureScreenshot(driver, 'validLeading-passed');
      console.log('[validLeading] PASSED');
    });

    it('should show empty error when workspace name is cleared after typing', async () => {
      const wsNameInput = await findInputByLabel(driver, 'Workspace name');
      await clearAndType(wsNameInput, uniqueName('tempws'));
      await sleep(TYPE_SETTLE);

      await clearField(wsNameInput);

      await findValidationMessage(driver, 'cannot be empty');
      console.log('[validWsEmpty] Found "cannot be empty" error');

      await assertNextButtonDisabled(driver);

      // Restore
      await clearAndType(wsNameInput, uniqueName('validws'));

      await captureScreenshot(driver, 'validWsEmpty-passed');
      console.log('[validWsEmpty] PASSED');
    });

    it('should show validation error for workspace name with dots', async () => {
      const wsNameInput = await findInputByLabel(driver, 'Workspace name');

      await clearAndType(wsNameInput, 'my.workspace');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validWsDots] Error shown for "my.workspace"');

      await assertNextButtonDisabled(driver);

      await clearAndType(wsNameInput, uniqueName('validws'));
      await captureScreenshot(driver, 'validWsDots-passed');
      console.log('[validWsDots] PASSED');
    });

    it('should show validation error for workspace name with trailing underscore', async () => {
      const wsNameInput = await findInputByLabel(driver, 'Workspace name');

      await clearAndType(wsNameInput, 'myws_');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validWsTrailUnderscore] Error shown for "myws_"');

      await assertNextButtonDisabled(driver);

      await clearAndType(wsNameInput, uniqueName('validws'));
      await captureScreenshot(driver, 'validWsTrailUnderscore-passed');
      console.log('[validWsTrailUnderscore] PASSED');
    });

    // -----------------------------------------------------------------------
    // Logic app name validation
    // -----------------------------------------------------------------------
    it('should show validation error for invalid logic app name', async () => {
      const appNameInput = await findInputByLabel(driver, 'Logic app name');
      await clearAndType(appNameInput, '999app');

      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validAppName] Found validation error for "999app"');

      await assertNextButtonDisabled(driver);

      // Fix it
      await clearAndType(appNameInput, uniqueName('validapp'));
      await assertNoValidationMessage(driver, 'Logic app name must start');
      await captureScreenshot(driver, 'validAppName-passed');
      console.log('[validAppName] PASSED');
    });

    it('should show empty error when logic app name is cleared', async () => {
      const appNameInput = await findInputByLabel(driver, 'Logic app name');
      await clearAndType(appNameInput, uniqueName('tempapp'));
      await sleep(TYPE_SETTLE);

      await clearField(appNameInput);

      await findValidationMessage(driver, 'cannot be empty');
      console.log('[validAppEmpty] Found "cannot be empty" error');

      await assertNextButtonDisabled(driver);

      // Restore
      await clearAndType(appNameInput, uniqueName('validapp'));

      await captureScreenshot(driver, 'validAppEmpty-passed');
      console.log('[validAppEmpty] PASSED');
    });

    it('should show validation error for logic app name with special characters', async () => {
      const appNameInput = await findInputByLabel(driver, 'Logic app name');

      await clearAndType(appNameInput, 'app@name');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validAppSpecial] Error shown for "app@name"');

      await clearAndType(appNameInput, 'my app');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validAppSpecial] Error shown for "my app"');

      await assertNextButtonDisabled(driver);

      await clearAndType(appNameInput, uniqueName('validapp'));
      await captureScreenshot(driver, 'validAppSpecial-passed');
      console.log('[validAppSpecial] PASSED');
    });

    it('should show validation error for logic app name with leading/trailing separators', async () => {
      const appNameInput = await findInputByLabel(driver, 'Logic app name');

      await clearAndType(appNameInput, '_myapp');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validAppSep] Error for leading underscore');

      await clearAndType(appNameInput, '-myapp');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validAppSep] Error for leading hyphen');

      await clearAndType(appNameInput, 'myapp-');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validAppSep] Error for trailing hyphen');

      await assertNextButtonDisabled(driver);

      await clearAndType(appNameInput, uniqueName('validapp'));
      await captureScreenshot(driver, 'validAppSep-passed');
      console.log('[validAppSep] PASSED');
    });

    // -----------------------------------------------------------------------
    // Workflow name validation
    // -----------------------------------------------------------------------
    it('should show validation error for invalid workflow name', async () => {
      const wfNameInput = await findInputByLabel(driver, 'Workflow name');
      await clearAndType(wfNameInput, '123workflow');

      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validWfName] Found validation error for "123workflow"');

      await assertNextButtonDisabled(driver);

      // Fix it
      await clearAndType(wfNameInput, uniqueName('validwf'));
      await assertNoValidationMessage(driver, 'Workflow name must start');
      await captureScreenshot(driver, 'validWfName-passed');
      console.log('[validWfName] PASSED');
    });

    it('should show empty error when workflow name is cleared after typing', async () => {
      const wfNameInput = await findInputByLabel(driver, 'Workflow name');
      await clearAndType(wfNameInput, uniqueName('tempwf'));
      await sleep(TYPE_SETTLE);

      await clearField(wfNameInput);

      await findValidationMessage(driver, 'cannot be empty');
      console.log('[validWfEmpty] Found "cannot be empty" error');

      await assertNextButtonDisabled(driver);

      // Restore
      await clearAndType(wfNameInput, uniqueName('validwf'));

      await captureScreenshot(driver, 'validWfEmpty-passed');
      console.log('[validWfEmpty] PASSED');
    });

    it('should show validation error for workflow name with special characters', async () => {
      const wfNameInput = await findInputByLabel(driver, 'Workflow name');

      await clearAndType(wfNameInput, 'wf@name');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validWfSpecial] Error shown for "wf@name"');

      await clearAndType(wfNameInput, 'my workflow');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validWfSpecial] Error shown for "my workflow"');

      await assertNextButtonDisabled(driver);

      await clearAndType(wfNameInput, uniqueName('validwf'));
      await captureScreenshot(driver, 'validWfSpecial-passed');
      console.log('[validWfSpecial] PASSED');
    });

    it('should show validation error for workflow name with leading/trailing separators', async () => {
      const wfNameInput = await findInputByLabel(driver, 'Workflow name');

      await clearAndType(wfNameInput, '_workflow');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validWfSep] Error for leading underscore');

      await clearAndType(wfNameInput, '-workflow');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validWfSep] Error for leading hyphen');

      await clearAndType(wfNameInput, 'workflow-');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validWfSep] Error for trailing hyphen');

      await assertNextButtonDisabled(driver);

      await clearAndType(wfNameInput, 'la-trigger-github');
      await assertNoValidationMessage(driver, 'Workflow name must start with a letter and can only contain letters, digits');

      await captureScreenshot(driver, 'validWfSep-passed');
      console.log('[validWfSep] PASSED: invalid separators rejected and "la-trigger-github" accepted');
    });

    // -----------------------------------------------------------------------
    // Next button gating
    // -----------------------------------------------------------------------
    it('should keep Next button disabled until all required fields are valid', async () => {
      // Clear all fields to start fresh
      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      const wsNameInput = await findInputByLabel(driver, 'Workspace name');
      const appNameInput = await findInputByLabel(driver, 'Logic app name');
      const wfNameInput = await findInputByLabel(driver, 'Workflow name');

      await clearField(pathInput);
      await clearField(wsNameInput);
      await clearField(appNameInput);
      await clearField(wfNameInput);

      await assertNextButtonDisabled(driver);
      console.log('[validNext] Next disabled with all empty');

      // Fill path only
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);
      await assertNextButtonDisabled(driver);
      console.log('[validNext] Next disabled with only path');

      // Fill workspace name
      await clearAndType(wsNameInput, uniqueName('vnws'));
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validNext] Next disabled with path + workspace');

      // Fill logic app name
      await clearAndType(appNameInput, uniqueName('vnapp'));
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validNext] Next disabled with path + workspace + app');

      // Select logic app type
      await selectRadioOption(driver, 'Logic app (Standard)');
      await sleep(1000);

      // Fill invalid workflow name — still disabled
      await clearAndType(wfNameInput, '!!!invalid');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validNext] Next disabled with invalid workflow name');

      // Fix workflow name
      await clearAndType(wfNameInput, uniqueName('vnwf'));
      await sleep(TYPE_SETTLE);

      // Select workflow type
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Stateful');
      await sleep(TYPE_SETTLE);

      const nextBtn = await waitForNextButton(driver, 30_000);
      const isEnabled =
        (await nextBtn.getAttribute('disabled')) !== 'true' &&
        (await nextBtn.getAttribute('disabled')) !== '' &&
        (await nextBtn.getAttribute('aria-disabled')) !== 'true';
      if (!isEnabled) {
        await dumpFormState(driver);
        throw new Error('Next button should be enabled when all fields are valid');
      }
      console.log('[validNext] Next enabled when all fields valid');
      await captureScreenshot(driver, 'validNext-passed');
      console.log('[validNext] PASSED');
    });

    // -----------------------------------------------------------------------
    // Custom code validation — select "Logic app with custom code" and
    // test folder name, namespace, and function name fields.
    // Reuses the same shared webview; does NOT retest standard fields.
    // -----------------------------------------------------------------------
    it('should show custom code fields when selecting custom code radio', async () => {
      console.log('[ccSwitch] Selecting "Logic app with custom code"...');
      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(2000);

      // Verify custom code section appeared
      const pageText = await driver.findElement(By.css('body')).getText();
      const hasCustomCode =
        pageText.toLowerCase().includes('custom code') ||
        pageText.toLowerCase().includes('.net version') ||
        pageText.toLowerCase().includes('function');
      if (!hasCustomCode) {
        throw new Error('Custom code configuration fields did not appear after selecting custom code type');
      }
      await captureScreenshot(driver, 'ccSwitch-passed');
      console.log('[ccSwitch] PASSED: Custom code fields visible');
    });

    it('should show error for invalid custom code folder name', async () => {
      let folderInput: WebElement | null = null;
      for (const label of ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        throw new Error('Could not find custom code folder name input');
      }

      await clearAndType(folderInput, '123folder');

      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validCcFolder] Error shown for "123folder"');

      await assertNextButtonDisabled(driver);

      // Fix it
      await clearAndType(folderInput, uniqueName('validfolder'));
      await captureScreenshot(driver, 'validCcFolder-passed');
      console.log('[validCcFolder] PASSED');
    });

    it('should show error when custom code folder name matches logic app name', async () => {
      const appNameInput = await findInputByLabel(driver, 'Logic app name');
      const appName = await appNameInput.getAttribute('value');

      let folderInput: WebElement | null = null;
      for (const label of ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        throw new Error('Could not find custom code folder name input');
      }

      await clearAndType(folderInput, appName);

      await findValidationMessage(driver, 'cannot be the same as the logic app name');
      console.log(`[validCcFolderSame] Error shown when folder name = "${appName}"`);

      await assertNextButtonDisabled(driver);

      // Fix it
      await clearAndType(folderInput, uniqueName('validfolder'));
      await captureScreenshot(driver, 'validCcFolderSame-passed');
      console.log('[validCcFolderSame] PASSED');
    });

    it('should show empty error when custom code folder name is cleared', async () => {
      let folderInput: WebElement | null = null;
      for (const label of ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        throw new Error('Could not find custom code folder name input');
      }

      await clearAndType(folderInput, uniqueName('tempfolder'));
      await sleep(TYPE_SETTLE);

      await clearField(folderInput);

      await findValidationMessage(driver, 'cannot be empty');
      console.log('[validCcFolderEmpty] Error shown for empty folder name');

      await assertNextButtonDisabled(driver);

      // Restore
      await clearAndType(folderInput, uniqueName('validfolder'));
      await captureScreenshot(driver, 'validCcFolderEmpty-passed');
      console.log('[validCcFolderEmpty] PASSED');
    });

    it('should show error for custom code folder name with special characters', async () => {
      let folderInput: WebElement | null = null;
      for (const label of ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        throw new Error('Could not find custom code folder name input');
      }

      await clearAndType(folderInput, 'folder@name');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validCcFolderSpecial] Error shown for "folder@name"');

      await clearAndType(folderInput, 'my folder');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validCcFolderSpecial] Error shown for "my folder"');

      await assertNextButtonDisabled(driver);

      await clearAndType(folderInput, uniqueName('validfolder'));
      await captureScreenshot(driver, 'validCcFolderSpecial-passed');
      console.log('[validCcFolderSpecial] PASSED');
    });

    it('should show error for custom code folder name with leading/trailing separators', async () => {
      let folderInput: WebElement | null = null;
      for (const label of ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        throw new Error('Could not find custom code folder name input');
      }

      await clearAndType(folderInput, '_folder');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validCcFolderSep] Error for leading underscore');

      await clearAndType(folderInput, 'folder-');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validCcFolderSep] Error for trailing hyphen');

      await assertNextButtonDisabled(driver);

      await clearAndType(folderInput, uniqueName('validfolder'));
      await captureScreenshot(driver, 'validCcFolderSep-passed');
      console.log('[validCcFolderSep] PASSED');
    });

    it('should disable Next for invalid custom code function namespace', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(1000);

      const nsInput = await findCustomCodeInputByLabel(driver, 'Function namespace');

      await clearAndType(nsInput, '123.Bad.Namespace');
      await sleep(TYPE_SETTLE);

      await assertInputShowsValidationMessage(nsInput, 'valid C# namespace');
      await assertNextButtonDisabled(driver);
      console.log('[validCcNs] Next button disabled for invalid namespace "123.Bad.Namespace"');

      await clearAndType(nsInput, 'Invalid-Namespace');
      await sleep(TYPE_SETTLE);

      await assertInputShowsValidationMessage(nsInput, 'valid C# namespace');
      await assertNextButtonDisabled(driver);
      console.log('[validCcNs] Next button disabled for invalid namespace "Invalid-Namespace"');

      await clearAndType(nsInput, 'Valid.Namespace');
      await captureScreenshot(driver, 'validCcNs-passed');
      console.log('[validCcNs] PASSED');
    });

    it('should enable Next for dotted namespace like MyCompany.Functions', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(1000);

      const nsInput = await findCustomCodeInputByLabel(driver, 'Function namespace');

      // Dotted namespace must be accepted and Next button must enable
      await clearAndType(nsInput, 'MyCompany.Functions');
      await sleep(TYPE_SETTLE);

      // Verify no validation error appears
      const parent = await nsInput.findElement(By.xpath('ancestor::*[contains(@class, "fui-Field")]'));
      const errorMessages = await parent.findElements(By.css('[id*="error"], [role="alert"]'));
      const visibleErrors = [];
      for (const msg of errorMessages) {
        if (await msg.isDisplayed()) {
          visibleErrors.push(await msg.getText());
        }
      }
      if (visibleErrors.length > 0) {
        throw new Error(`Unexpected validation error for dotted namespace "MyCompany.Functions": ${visibleErrors.join(', ')}`);
      }

      // Restore a simple namespace for subsequent tests
      await clearAndType(nsInput, 'ValidNamespace');
      await captureScreenshot(driver, 'validCcNsDotted-passed');
      console.log('[validCcNsDotted] PASSED: Dotted namespace "MyCompany.Functions" accepted');
    });

    it('should disable Next when custom code function namespace is cleared', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(1000);

      const nsInput = await findCustomCodeInputByLabel(driver, 'Function namespace');

      await clearAndType(nsInput, 'TempNamespace');
      await sleep(TYPE_SETTLE);

      await clearField(nsInput);

      await assertInputShowsValidationMessage(nsInput, 'cannot be empty');
      await assertNextButtonDisabled(driver);
      console.log('[validCcNsEmpty] Next button disabled for empty namespace');

      await clearAndType(nsInput, 'ValidNamespace');
      await captureScreenshot(driver, 'validCcNsEmpty-passed');
      console.log('[validCcNsEmpty] PASSED');
    });

    it('should disable Next for invalid custom code function name', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(1000);

      const fnInput = await findCustomCodeInputByLabel(driver, 'Function name');

      await clearAndType(fnInput, '999func');
      await sleep(TYPE_SETTLE);

      await assertInputShowsValidationMessage(fnInput, 'must start with a letter');
      await assertNextButtonDisabled(driver);
      console.log('[validCcFnName] Next button disabled for invalid function name "999func"');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validCcFnName-passed');
      console.log('[validCcFnName] PASSED');
    });

    it('should disable Next when custom code function name is cleared', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(1000);

      const fnInput = await findCustomCodeInputByLabel(driver, 'Function name');

      await clearAndType(fnInput, uniqueName('tempfn'));
      await sleep(TYPE_SETTLE);

      await clearField(fnInput);

      await assertInputShowsValidationMessage(fnInput, 'cannot be empty');
      await assertNextButtonDisabled(driver);
      console.log('[validCcFnEmpty] Next button disabled for empty function name');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validCcFnEmpty-passed');
      console.log('[validCcFnEmpty] PASSED');
    });

    it('should disable Next for hyphenated custom code function name', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(1000);

      const fnInput = await findCustomCodeInputByLabel(driver, 'Function name');

      await clearAndType(fnInput, 'my-func');
      await sleep(TYPE_SETTLE);

      await assertInputShowsValidationMessage(fnInput, 'must start with a letter');
      await assertNextButtonDisabled(driver);
      console.log('[validCcFnHyphen] Next button disabled for hyphenated function name "my-func"');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validCcFnHyphen-passed');
      console.log('[validCcFnHyphen] PASSED');
    });

    it('should disable Next for custom code function name with special characters', async () => {
      let fnInput: WebElement | null = null;
      const fnLabels = await driver.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await driver.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
        if (!fnInput) {
          const parent = await fnLabels[0].findElement(By.xpath('..'));
          const inputs = await parent.findElements(By.css('input'));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
      }
      if (!fnInput) {
        fnInput = await findInputByLabel(driver, 'Function name');
      }

      await clearAndType(fnInput, 'func@name');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validCcFnSpecial] Next disabled for "func@name"');

      await clearAndType(fnInput, 'my func');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validCcFnSpecial] Next disabled for "my func"');

      await clearAndType(fnInput, 'my.func');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validCcFnSpecial] Next disabled for "my.func"');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validCcFnSpecial-passed');
      console.log('[validCcFnSpecial] PASSED');
    });

    it('should disable Next for custom code function name with leading underscore', async () => {
      let fnInput: WebElement | null = null;
      const fnLabels = await driver.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await driver.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
        if (!fnInput) {
          const parent = await fnLabels[0].findElement(By.xpath('..'));
          const inputs = await parent.findElements(By.css('input'));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
      }
      if (!fnInput) {
        fnInput = await findInputByLabel(driver, 'Function name');
      }

      await clearAndType(fnInput, '_func');
      await sleep(TYPE_SETTLE);

      await assertNextButtonDisabled(driver);
      console.log('[validCcFnUnderscore] Next button disabled for leading underscore "_func"');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validCcFnUnderscore-passed');
      console.log('[validCcFnUnderscore] PASSED');
    });

    it('should keep Next disabled for all partial-fill combinations of custom code fields', async () => {
      // Helper to find CC inputs
      const findCcFolderInput = async () => {
        for (const label of ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name']) {
          try {
            return await findInputByLabel(driver, label);
          } catch {
            // Try next
          }
        }
        throw new Error('Could not find custom code folder name input');
      };
      const findCcNsInput = async () => {
        for (const label of ['Function namespace', 'Namespace', 'namespace']) {
          try {
            return await findInputByLabel(driver, label);
          } catch {
            // Try next
          }
        }
        throw new Error('Could not find function namespace input');
      };
      const findCcFnInput = async () => {
        let fnInput: WebElement | null = null;
        const fnLabels = await driver.findElements(
          By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
        );
        if (fnLabels.length > 0) {
          const forAttr = await fnLabels[0].getAttribute('for');
          if (forAttr) {
            const inputs = await driver.findElements(By.id(forAttr));
            if (inputs.length > 0) {
              fnInput = inputs[0];
            }
          }
          if (!fnInput) {
            const parent = await fnLabels[0].findElement(By.xpath('..'));
            const inputs = await parent.findElements(By.css('input'));
            if (inputs.length > 0) {
              fnInput = inputs[0];
            }
          }
        }
        if (!fnInput) {
          fnInput = await findInputByLabel(driver, 'Function name');
        }
        return fnInput;
      };

      // Ensure custom code is selected and .NET Version is set (prerequisite)
      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(1000);
      const dotNetDropdown = await findDropdownByLabel(driver, '.NET Version');
      await selectDropdownOption(driver, dotNetDropdown, '.NET 8');
      await sleep(TYPE_SETTLE);

      const folderInput = await findCcFolderInput();
      const nsInput = await findCcNsInput();
      const fnInput = await findCcFnInput();

      // --- Combo 1: all empty ---
      await clearField(folderInput);
      await clearField(nsInput);
      await clearField(fnInput);
      await sleep(TYPE_SETTLE);
      await findValidationMessage(driver, 'cannot be empty');
      await assertNextButtonDisabled(driver);
      console.log('[ccPartial] Combo 1 (all empty): Next disabled ✓');

      // --- Combo 2: folder valid, namespace empty, fn empty ---
      await clearAndType(folderInput, uniqueName('ccfolder'));
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[ccPartial] Combo 2 (folder valid, ns empty, fn empty): Next disabled ✓');

      // --- Combo 3: folder empty, namespace valid, fn empty ---
      await clearField(folderInput);
      await clearAndType(nsInput, 'Valid.Namespace');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[ccPartial] Combo 3 (folder empty, ns valid, fn empty): Next disabled ✓');

      // --- Combo 4: folder empty, namespace empty, fn valid ---
      await clearField(nsInput);
      await clearAndType(fnInput, uniqueName('validfn'));
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[ccPartial] Combo 4 (folder empty, ns empty, fn valid): Next disabled ✓');

      // --- Combo 5: folder valid, namespace valid, fn empty ---
      await clearAndType(folderInput, uniqueName('ccfolder'));
      await clearAndType(nsInput, 'Valid.Namespace');
      await clearField(fnInput);
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[ccPartial] Combo 5 (folder valid, ns valid, fn empty): Next disabled ✓');

      // --- Combo 6: folder valid, namespace empty, fn valid ---
      await clearField(nsInput);
      await clearAndType(fnInput, uniqueName('validfn'));
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[ccPartial] Combo 6 (folder valid, ns empty, fn valid): Next disabled ✓');

      // --- Combo 7: folder empty, namespace valid, fn valid ---
      await clearField(folderInput);
      await clearAndType(nsInput, 'Valid.Namespace');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[ccPartial] Combo 7 (folder empty, ns valid, fn valid): Next disabled ✓');

      // --- Combo 8: all valid → Next should be ENABLED ---
      await clearAndType(folderInput, uniqueName('validfolder'));
      await clearAndType(nsInput, 'ValidNamespace');
      await clearAndType(fnInput, uniqueName('validfn'));
      await sleep(TYPE_SETTLE);

      const nextBtn = await waitForNextButton(driver, 30_000);
      const isEnabled =
        (await nextBtn.getAttribute('disabled')) !== 'true' &&
        (await nextBtn.getAttribute('disabled')) !== '' &&
        (await nextBtn.getAttribute('aria-disabled')) !== 'true';
      if (!isEnabled) {
        await dumpFormState(driver);
        throw new Error('Next button should be enabled when all custom code fields are valid');
      }
      console.log('[ccPartial] Combo 8 (all valid): Next enabled ✓');

      await captureScreenshot(driver, 'ccPartial-passed');
      console.log('[ccPartial] PASSED: All 8 combos verified (7 disabled + 1 enabled)');
    });

    // -----------------------------------------------------------------------
    // Rules engine validation — switch to "Logic app with rules engine" and
    // test folder name, namespace, and function name fields.
    // Rules engine has the same fields as custom code but with a different
    // folder label ("Rules engine folder name") and no .NET Version dropdown.
    // -----------------------------------------------------------------------
    it('should show rules engine fields when selecting rules engine radio', async () => {
      console.log('[reSwitch] Selecting "Logic app with rules engine"...');
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(2000);

      // Verify rules engine section appeared
      const pageText = await driver.findElement(By.css('body')).getText();
      const hasRulesEngine = pageText.toLowerCase().includes('rules engine');
      if (!hasRulesEngine) {
        throw new Error('Rules engine configuration fields did not appear after selecting rules engine type');
      }
      await captureScreenshot(driver, 'reSwitch-passed');
      console.log('[reSwitch] PASSED: Rules engine fields visible');
    });

    it('should show error for invalid rules engine folder name', async () => {
      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        throw new Error('Could not find rules engine folder name input');
      }

      await clearAndType(folderInput, '123folder');

      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validReFolder] Error shown for "123folder"');

      await assertNextButtonDisabled(driver);

      // Fix it
      await clearAndType(folderInput, uniqueName('validrefolder'));
      await captureScreenshot(driver, 'validReFolder-passed');
      console.log('[validReFolder] PASSED');
    });

    it('should show error when rules engine folder name matches logic app name', async () => {
      const appNameInput = await findInputByLabel(driver, 'Logic app name');
      const appName = await appNameInput.getAttribute('value');

      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        throw new Error('Could not find rules engine folder name input');
      }

      await clearAndType(folderInput, appName);

      await findValidationMessage(driver, 'cannot be the same as the logic app name');
      console.log(`[validReFolderSame] Error shown when folder name = "${appName}"`);

      await assertNextButtonDisabled(driver);

      await clearAndType(folderInput, uniqueName('validrefolder'));
      await captureScreenshot(driver, 'validReFolderSame-passed');
      console.log('[validReFolderSame] PASSED');
    });

    it('should show empty error when rules engine folder name is cleared', async () => {
      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        throw new Error('Could not find rules engine folder name input');
      }

      await clearAndType(folderInput, uniqueName('temprefolder'));
      await sleep(TYPE_SETTLE);

      await clearField(folderInput);

      await findValidationMessage(driver, 'cannot be empty');
      console.log('[validReFolderEmpty] Error shown for empty folder name');

      await assertNextButtonDisabled(driver);

      await clearAndType(folderInput, uniqueName('validrefolder'));
      await captureScreenshot(driver, 'validReFolderEmpty-passed');
      console.log('[validReFolderEmpty] PASSED');
    });

    it('should show error for rules engine folder name with special characters', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        throw new Error('Could not find rules engine folder name input');
      }

      await clearAndType(folderInput, 'folder@name');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validReFolderSpecial] Error shown for "folder@name"');

      await clearAndType(folderInput, 'my folder');
      await findValidationMessage(driver, 'must start with a letter and can only contain letters, digits');
      console.log('[validReFolderSpecial] Error shown for "my folder"');

      await assertNextButtonDisabled(driver);

      await clearAndType(folderInput, uniqueName('validrefolder'));
      await captureScreenshot(driver, 'validReFolderSpecial-passed');
      console.log('[validReFolderSpecial] PASSED');
    });

    it('should show error for rules engine folder name with leading/trailing separators', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        throw new Error('Could not find rules engine folder name input');
      }

      await clearAndType(folderInput, '_folder');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validReFolderSep] Error for leading underscore');

      await clearAndType(folderInput, 'folder-');
      await findValidationMessage(driver, 'must start with a letter');
      console.log('[validReFolderSep] Error for trailing hyphen');

      await assertNextButtonDisabled(driver);

      await clearAndType(folderInput, uniqueName('validrefolder'));
      await captureScreenshot(driver, 'validReFolderSep-passed');
      console.log('[validReFolderSep] PASSED');
    });

    it('should disable Next for invalid rules engine function namespace', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      const nsInput = await findRulesEngineInputByLabel(driver, 'Function namespace');

      await clearAndType(nsInput, 'Valid.Namespace');
      await sleep(TYPE_SETTLE);

      await clearAndType(nsInput, 'Invalid-Namespace');
      await sleep(TYPE_SETTLE);

      await assertInputShowsValidationMessage(nsInput, 'valid C# namespace');
      await assertNextButtonDisabled(driver);
      console.log('[validReNs] Next button disabled for invalid namespace with hyphen');

      await clearAndType(nsInput, 'Valid.Namespace');
      await captureScreenshot(driver, 'validReNs-passed');
      console.log('[validReNs] PASSED');
    });

    it('should disable Next for rules engine function namespace starting with digit', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      const nsInput = await findRulesEngineInputByLabel(driver, 'Function namespace');

      await clearAndType(nsInput, '123.Bad.Namespace');
      await sleep(TYPE_SETTLE);

      await assertInputShowsValidationMessage(nsInput, 'valid C# namespace');
      await assertNextButtonDisabled(driver);
      console.log('[validReNsDigit] Next button disabled for namespace starting with digit');

      await clearAndType(nsInput, 'Valid.Namespace');
      await captureScreenshot(driver, 'validReNsDigit-passed');
      console.log('[validReNsDigit] PASSED');
    });

    it('should disable Next when rules engine function namespace is cleared', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      const nsInput = await findRulesEngineInputByLabel(driver, 'Function namespace');

      await clearAndType(nsInput, 'TempNamespace');
      await sleep(TYPE_SETTLE);

      await clearField(nsInput);

      await assertInputShowsValidationMessage(nsInput, 'cannot be empty');
      await assertNextButtonDisabled(driver);
      console.log('[validReNsEmpty] Next button disabled for empty namespace');

      await clearAndType(nsInput, 'ValidNamespace');
      await captureScreenshot(driver, 'validReNsEmpty-passed');
      console.log('[validReNsEmpty] PASSED');
    });

    it('should disable Next for invalid rules engine function name', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      const fnInput = await findRulesEngineInputByLabel(driver, 'Function name');

      await clearAndType(fnInput, '999func');
      await sleep(TYPE_SETTLE);

      await assertInputShowsValidationMessage(fnInput, 'must start with a letter');
      await assertNextButtonDisabled(driver);
      console.log('[validReFnName] Next button disabled for invalid function name');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validReFnName-passed');
      console.log('[validReFnName] PASSED');
    });

    it('should disable Next when rules engine function name is cleared', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      const fnInput = await findRulesEngineInputByLabel(driver, 'Function name');

      await clearAndType(fnInput, uniqueName('tempfn'));
      await sleep(TYPE_SETTLE);

      await clearField(fnInput);

      await assertInputShowsValidationMessage(fnInput, 'cannot be empty');
      await assertNextButtonDisabled(driver);
      console.log('[validReFnEmpty] Next button disabled for empty function name');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validReFnEmpty-passed');
      console.log('[validReFnEmpty] PASSED');
    });

    it('should disable Next for hyphenated rules engine function name', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      const fnInput = await findRulesEngineInputByLabel(driver, 'Function name');

      await clearAndType(fnInput, 'my-func');
      await sleep(TYPE_SETTLE);

      await assertInputShowsValidationMessage(fnInput, 'must start with a letter');
      await assertNextButtonDisabled(driver);
      console.log('[validReFnHyphen] Next button disabled for hyphenated function name "my-func"');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validReFnHyphen-passed');
      console.log('[validReFnHyphen] PASSED');
    });

    it('should disable Next for rules engine function name with special characters', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      const fnInput = await findRulesEngineInputByLabel(driver, 'Function name');

      await clearAndType(fnInput, 'func@name');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validReFnSpecial] Next disabled for "func@name"');

      await clearAndType(fnInput, 'my func');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validReFnSpecial] Next disabled for "my func"');

      await clearAndType(fnInput, 'my.func');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[validReFnSpecial] Next disabled for "my.func"');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validReFnSpecial-passed');
      console.log('[validReFnSpecial] PASSED');
    });

    it('should disable Next for rules engine function name with leading underscore', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      const fnInput = await findRulesEngineInputByLabel(driver, 'Function name');

      await clearAndType(fnInput, '_func');
      await sleep(TYPE_SETTLE);

      await assertNextButtonDisabled(driver);
      console.log('[validReFnUnderscore] Next button disabled for leading underscore "_func"');

      await clearAndType(fnInput, uniqueName('validfn'));
      await captureScreenshot(driver, 'validReFnUnderscore-passed');
      console.log('[validReFnUnderscore] PASSED');
    });

    it('should keep Next disabled for all partial-fill combinations of rules engine fields', async () => {
      await ensureOnProjectSetupStep(driver);
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(1000);

      // Helper to find RE inputs
      const findReFolderInput = async () => {
        for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
          try {
            return await findInputByLabel(driver, label);
          } catch {
            // Try next
          }
        }
        throw new Error('Could not find rules engine folder name input');
      };

      const folderInput = await findReFolderInput();
      const nsInput = await findRulesEngineInputByLabel(driver, 'Function namespace');
      const fnInput = await findRulesEngineInputByLabel(driver, 'Function name');

      // --- Combo 1: all empty ---
      await clearField(folderInput);
      await clearField(nsInput);
      await clearField(fnInput);
      await sleep(TYPE_SETTLE);
      await findValidationMessage(driver, 'cannot be empty');
      await assertNextButtonDisabled(driver);
      console.log('[rePartial] Combo 1 (all empty): Next disabled ✓');

      // --- Combo 2: folder valid, namespace empty, fn empty ---
      await clearAndType(folderInput, uniqueName('refolder'));
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[rePartial] Combo 2 (folder valid, ns empty, fn empty): Next disabled ✓');

      // --- Combo 3: folder empty, namespace valid, fn empty ---
      await clearField(folderInput);
      await clearAndType(nsInput, 'Valid.Namespace');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[rePartial] Combo 3 (folder empty, ns valid, fn empty): Next disabled ✓');

      // --- Combo 4: folder empty, namespace empty, fn valid ---
      await clearField(nsInput);
      await clearAndType(fnInput, uniqueName('validfn'));
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[rePartial] Combo 4 (folder empty, ns empty, fn valid): Next disabled ✓');

      // --- Combo 5: folder valid, namespace valid, fn empty ---
      await clearAndType(folderInput, uniqueName('refolder'));
      await clearAndType(nsInput, 'Valid.Namespace');
      await clearField(fnInput);
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[rePartial] Combo 5 (folder valid, ns valid, fn empty): Next disabled ✓');

      // --- Combo 6: folder valid, namespace empty, fn valid ---
      await clearField(nsInput);
      await clearAndType(fnInput, uniqueName('validfn'));
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[rePartial] Combo 6 (folder valid, ns empty, fn valid): Next disabled ✓');

      // --- Combo 7: folder empty, namespace valid, fn valid ---
      await clearField(folderInput);
      await clearAndType(nsInput, 'Valid.Namespace');
      await sleep(TYPE_SETTLE);
      await assertNextButtonDisabled(driver);
      console.log('[rePartial] Combo 7 (folder empty, ns valid, fn valid): Next disabled ✓');

      // --- Combo 8: all valid → Next should be ENABLED ---
      await clearAndType(folderInput, uniqueName('validrefolder'));
      await clearAndType(nsInput, 'ValidNamespace');
      await clearAndType(fnInput, uniqueName('validfn'));
      await sleep(TYPE_SETTLE);

      const nextBtn = await waitForNextButton(driver, 30_000);
      const isEnabled =
        (await nextBtn.getAttribute('disabled')) !== 'true' &&
        (await nextBtn.getAttribute('disabled')) !== '' &&
        (await nextBtn.getAttribute('aria-disabled')) !== 'true';
      if (!isEnabled) {
        await dumpFormState(driver);
        throw new Error('Next button should be enabled when all rules engine fields are valid');
      }
      console.log('[rePartial] Combo 8 (all valid): Next enabled ✓');

      await captureScreenshot(driver, 'rePartial-passed');
      console.log('[rePartial] PASSED: All 8 combos verified (7 disabled + 1 enabled)');
    });

    // =========================================================================
    // FORM INTERACTION TESTS — Reuses the same shared webview.
    // Each test builds on the shared form state, navigating to Review to
    // verify entered data, then pressing Back to continue testing.
    // =========================================================================

    // --- Interaction helper functions ---
    // (findValidationMessage and assertNextButtonDisabled already defined above)

    function assertNextDisabled(drv: WebDriver): Promise<void> {
      // Thin wrapper — reuses assertNextButtonDisabled with same behavior
      return assertNextButtonDisabled(drv);
    }

    async function goToReviewAndBack(drv: WebDriver, expectedValues: { label: string; value: string }[]): Promise<string> {
      // Click Next to go to review
      const nextBtn = await waitForNextButton(drv);
      await nextBtn.click();

      // Poll for review step content instead of static sleep
      const reviewDeadline = Date.now() + 5000;
      let reviewText = '';
      while (Date.now() < reviewDeadline) {
        reviewText = await drv.findElement(By.css('body')).getText();
        const lower = reviewText.toLowerCase();
        if (lower.includes('create workspace') && (lower.includes('review') || lower.includes('step 2'))) {
          break;
        }
        await sleep(300);
      }
      if (!reviewText) {
        reviewText = await drv.findElement(By.css('body')).getText();
      }
      console.log(`[review] Review text (first 1500 chars): ${reviewText.substring(0, 1500)}`);

      // Verify all expected values are present
      const missing: string[] = [];
      for (const { label, value } of expectedValues) {
        if (reviewText.includes(value)) {
          console.log(`[review] ✓ ${label}: "${value}"`);
        } else {
          missing.push(`${label}: "${value}"`);
        }
      }

      if (missing.length > 0) {
        throw new Error(`Review page missing values:\n${missing.join('\n')}\nReview text:\n${reviewText.substring(0, 2000)}`);
      }

      // Click Back to return to the form
      const backBtn = await findButtonByText(drv, 'Back');
      await backBtn.click();

      // Poll for form step content instead of static sleep
      const formDeadline = Date.now() + 5000;
      while (Date.now() < formDeadline) {
        const formText = (await drv.findElement(By.css('body')).getText()).toLowerCase();
        if (formText.includes('workspace parent folder path') || formText.includes('project setup')) {
          break;
        }
        await sleep(300);
      }

      return reviewText;
    }

    async function clearFormField(element: WebElement): Promise<void> {
      await element.sendKeys(Key.chord(Key.CONTROL, 'a'));
      await element.sendKeys(Key.BACK_SPACE);
      await sleep(TYPE_SETTLE);
    }

    async function findFunctionNameInput(drv: WebDriver): Promise<WebElement> {
      const fnLabels = await drv.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await drv.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            return inputs[0];
          }
        }
        const parent = await fnLabels[0].findElement(By.xpath('..'));
        const inputs = await parent.findElements(By.css('input'));
        if (inputs.length > 0) {
          return inputs[0];
        }
      }
      return findInputByLabel(drv, 'Function name');
    }

    async function findFolderNameInput(drv: WebDriver, type: 'customCode' | 'rulesEngine'): Promise<WebElement> {
      const labels =
        type === 'customCode'
          ? ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name']
          : ['Rules engine folder name', 'rules engine folder', 'Folder name'];
      for (const label of labels) {
        try {
          return await findInputByLabel(drv, label);
        } catch {
          /* try next */
        }
      }
      throw new Error(`Could not find ${type} folder name input`);
    }

    async function findNamespaceInput(drv: WebDriver): Promise<WebElement> {
      for (const label of ['Function namespace', 'Namespace', 'namespace']) {
        try {
          return await findInputByLabel(drv, label);
        } catch {
          /* try next */
        }
      }
      throw new Error('Could not find function namespace input');
    }

    // -----------------------------------------------------------------------
    // Test: Fill standard fields as Stateful, verify review, then Back
    // -----------------------------------------------------------------------
    it('should fill Stateful standard form, verify review shows all values, and navigate back', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('stfulws');
      const appName = uniqueName('stfulapp');
      const wfName = uniqueName('stfulwf');

      // Fill all standard fields
      await fillStandardFormFields(driver, tempDir, { wsName, appName, wfName, wfType: 'Stateful' });

      // Navigate to review, verify all entered values, and come back
      const reviewText = await goToReviewAndBack(driver, [
        { label: 'Workspace name', value: wsName },
        { label: 'Logic app name', value: appName },
        { label: 'Workflow name', value: wfName },
        { label: 'Workflow type', value: 'Stateful' },
      ]);

      // Verify review section headers
      const lowerReview = reviewText.toLowerCase();
      for (const section of ['project setup', 'logic app', 'workflow']) {
        if (lowerReview.includes(section)) {
          console.log(`[stfulReview] Section "${section}" found`);
        } else {
          console.log(`[stfulReview] Warning: Section "${section}" not found`);
        }
      }

      // After Back, verify form values are preserved
      const wsValue = await (await findInputByLabel(driver, 'Workspace name')).getAttribute('value');
      const appValue = await (await findInputByLabel(driver, 'Logic app name')).getAttribute('value');
      const wfValue = await (await findInputByLabel(driver, 'Workflow name')).getAttribute('value');
      if (wsValue !== wsName) {
        throw new Error(`Workspace name not preserved: expected "${wsName}", got "${wsValue}"`);
      }
      if (appValue !== appName) {
        throw new Error(`Logic app name not preserved: expected "${appName}", got "${appValue}"`);
      }
      if (wfValue !== wfName) {
        throw new Error(`Workflow name not preserved: expected "${wfName}", got "${wfValue}"`);
      }

      await captureScreenshot(driver, 'stfulReview-passed');
      console.log('[stfulReview] PASSED: Stateful review verified, values preserved after Back');
    });

    // -----------------------------------------------------------------------
    // Test: Change workflow type to Stateless, verify description & review
    // -----------------------------------------------------------------------
    it('should change to Stateless workflow type, verify description and review', async function () {
      this.timeout(180_000);

      // Select Stateless from dropdown
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Stateless');
      await sleep(1000);

      // Verify Stateless description is shown
      const pageText = await driver.findElement(By.css('body')).getText();
      if (!pageText.toLowerCase().includes('stateless')) {
        throw new Error('Stateless description text not found after selecting Stateless');
      }
      console.log('[slReview] Stateless description visible');

      // Check the description keywords from intl: "low latency" or "request-response" or "IoT"
      if (
        pageText.toLowerCase().includes('latency') ||
        pageText.toLowerCase().includes('request-response') ||
        pageText.toLowerCase().includes('iot')
      ) {
        console.log('[slReview] Stateless description keywords found');
      }

      // Navigate to review and verify Stateless appears
      await goToReviewAndBack(driver, [{ label: 'Workflow type', value: 'Stateless' }]);

      await captureScreenshot(driver, 'slReview-passed');
      console.log('[slReview] PASSED: Stateless workflow type verified in description and review');
    });

    // -----------------------------------------------------------------------
    // Test: Change to Autonomous Agents workflow, verify description & review
    // -----------------------------------------------------------------------
    it('should change to Autonomous Agents workflow type, verify description and review', async function () {
      this.timeout(180_000);

      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Autonomous agents (Preview)');
      await sleep(1000);

      // Verify Autonomous Agents description: "AI agents" or "automate complex tasks"
      const pageText = await driver.findElement(By.css('body')).getText();
      const lower = pageText.toLowerCase();
      if (!lower.includes('autonom')) {
        throw new Error('Autonomous Agents description text not found');
      }
      console.log('[aaReview] Autonomous Agents description visible');
      if (lower.includes('ai agent') || lower.includes('complex task') || lower.includes('automate')) {
        console.log('[aaReview] Autonomous Agents description keywords found');
      }

      // Navigate to review — the display text should show "Autonomous agents (Preview)"
      const reviewText = await goToReviewAndBack(driver, [{ label: 'Workflow type (Autonomous)', value: 'utonomous' }]);

      // Check that "Agentic" or "Autonomous" appears in review
      if (reviewText.includes('Autonomous') || reviewText.includes('autonomous') || reviewText.includes('Agentic')) {
        console.log('[aaReview] Autonomous agent type confirmed in review');
      }

      await captureScreenshot(driver, 'aaReview-passed');
      console.log('[aaReview] PASSED: Autonomous Agents verified in description and review');
    });

    // -----------------------------------------------------------------------
    // Test: Change to Conversational Agents workflow, verify description & review
    // -----------------------------------------------------------------------
    it('should change to Conversational Agents workflow type, verify description and review', async function () {
      this.timeout(180_000);

      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Conversational agents (Preview)');
      await sleep(1000);

      // Verify Conversational Agents description: "natural language" or "human interaction" or "LLMs"
      const pageText = await driver.findElement(By.css('body')).getText();
      const lower = pageText.toLowerCase();
      if (!lower.includes('conversation')) {
        throw new Error('Conversational Agents description text not found');
      }
      console.log('[caReview] Conversational Agents description visible');
      if (lower.includes('natural language') || lower.includes('human interaction') || lower.includes('llm')) {
        console.log('[caReview] Conversational Agents description keywords found');
      }

      // Navigate to review
      const reviewText = await goToReviewAndBack(driver, [{ label: 'Workflow type (Conversational)', value: 'onversational' }]);

      if (reviewText.includes('Conversational') || reviewText.includes('conversational') || reviewText.includes('Agent')) {
        console.log('[caReview] Conversational agent type confirmed in review');
      }

      // Reset workflow type back to Stateful for subsequent tests
      const wfTypeDropdown2 = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown2, 'Stateful');
      await sleep(500);

      await captureScreenshot(driver, 'caReview-passed');
      console.log('[caReview] PASSED: Conversational Agents verified in description and review');
    });

    // -----------------------------------------------------------------------
    // Test: Switch to Custom Code type, verify fields appear, test each
    // field's validation errors, fill valid values, verify review, Back
    // -----------------------------------------------------------------------
    it('should switch to custom code, fill valid values, verify review, and navigate back', async function () {
      this.timeout(180_000);

      console.log('[ccFields] Selecting "Logic app with custom code"...');
      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(2000);

      // --- Verify custom code fields appeared ---
      const pageText = await driver.findElement(By.css('body')).getText();
      const lowerText = pageText.toLowerCase();
      const hasCustomCodeFields =
        lowerText.includes('.net version') || lowerText.includes('function namespace') || lowerText.includes('function name');
      if (!hasCustomCodeFields) {
        throw new Error('Custom code configuration fields not visible after selecting custom code type');
      }
      console.log('[ccFields] Custom code configuration fields visible');

      // --- .NET Version dropdown: verify options and select .NET 8 ---
      let dotNetDropdown: WebElement | null = null;
      try {
        dotNetDropdown = await findDropdownByLabel(driver, '.NET Version');
      } catch {
        for (const alt of ['.NET version', 'NET Version']) {
          try {
            dotNetDropdown = await findDropdownByLabel(driver, alt);
            break;
          } catch {
            /* next */
          }
        }
      }
      if (!dotNetDropdown) {
        const comboboxes = await driver.findElements(By.css('button[role="combobox"]'));
        if (comboboxes.length >= 1) {
          dotNetDropdown = comboboxes[0];
        }
      }
      if (!dotNetDropdown) {
        throw new Error('.NET Version dropdown not found');
      }

      await dotNetDropdown.click();
      await sleep(500);
      const options = await driver.findElements(By.css('[role="option"]'));
      const optionTexts: string[] = [];
      for (const opt of options) {
        optionTexts.push((await opt.getText()).trim());
      }
      console.log(`[ccFields] .NET Version options: ${JSON.stringify(optionTexts)}`);
      await driver.actions().sendKeys(Key.ESCAPE).perform();
      await sleep(300);

      if (!optionTexts.some((o) => o.includes('.NET 8'))) {
        throw new Error(`.NET 8 not found in dropdown. Available: ${JSON.stringify(optionTexts)}`);
      }

      await selectDropdownOption(driver, dotNetDropdown, '.NET 8');
      await sleep(500);
      console.log('[ccFields] Selected .NET 8');

      // --- Fill valid custom code field values (validation already tested above) ---
      const folderInput = await findFolderNameInput(driver, 'customCode');
      const ccFolderName = uniqueName('ccfolder');
      await clearAndType(folderInput, ccFolderName);
      console.log(`[ccFields] Folder name set to "${ccFolderName}"`);

      const nsInput = await findNamespaceInput(driver);
      const ccNamespace = 'ValidCcNamespace';
      await clearAndType(nsInput, ccNamespace);
      console.log(`[ccFields] Namespace set to "${ccNamespace}"`);

      const fnInput = await findFunctionNameInput(driver);
      const ccFnName = uniqueName('ccfunc');
      await clearAndType(fnInput, ccFnName);
      console.log(`[ccFields] Function name set to "${ccFnName}"`);

      // --- Navigate to Review and verify all custom code values ---
      const reviewText = await goToReviewAndBack(driver, [
        { label: 'Custom code folder', value: ccFolderName },
        { label: 'Function namespace', value: ccNamespace },
        { label: 'Function name', value: ccFnName },
      ]);

      if (reviewText.toLowerCase().includes('custom code')) {
        console.log('[ccFields] "Custom Code Configuration" section found in review ✓');
      }
      if (reviewText.toLowerCase().includes('.net 8') || reviewText.toLowerCase().includes('net8')) {
        console.log('[ccFields] .NET 8 framework shown in review ✓');
      }

      await captureScreenshot(driver, 'ccFields-passed');
      console.log('[ccFields] PASSED: Custom code fields filled, review verified');
    });

    // -----------------------------------------------------------------------
    // Test: Switch to Rules Engine type, verify fields, fill valid values,
    // verify review, Back (validation already tested in validation section)
    // -----------------------------------------------------------------------
    it('should switch to rules engine, fill valid values, verify review, and navigate back', async function () {
      this.timeout(180_000);

      console.log('[reFields] Selecting "Logic app with rules engine"...');
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(2000);

      // --- Verify rules engine fields appeared ---
      const pageText = await driver.findElement(By.css('body')).getText();
      const lowerText = pageText.toLowerCase();
      if (!lowerText.includes('rules engine')) {
        throw new Error('Rules engine configuration fields not visible after selecting rules engine type');
      }
      console.log('[reFields] Rules engine configuration fields visible');

      // --- Verify NO .NET Version dropdown ---
      const dotNetLabels = await driver.findElements(By.xpath("//label[contains(text(), '.NET Version')]"));
      if (dotNetLabels.length > 0) {
        console.log('[reFields] Warning: .NET Version label still visible in rules engine mode');
      } else {
        console.log('[reFields] Confirmed: No .NET Version dropdown in rules engine mode ✓');
      }

      // --- Fill valid rules engine field values (validation already tested above) ---
      const folderInput = await findFolderNameInput(driver, 'rulesEngine');
      const reFolderName = uniqueName('refolder');
      await clearAndType(folderInput, reFolderName);
      console.log(`[reFields] Folder name set to "${reFolderName}"`);

      const nsInput = await findNamespaceInput(driver);
      const reNamespace = 'RulesEngineNs';
      await clearAndType(nsInput, reNamespace);
      console.log(`[reFields] Namespace set to "${reNamespace}"`);

      const fnInput = await findFunctionNameInput(driver);
      const reFnName = uniqueName('rulesfunc');
      await clearAndType(fnInput, reFnName);
      console.log(`[reFields] Function name set to "${reFnName}"`);

      // --- Navigate to Review and verify all rules engine values ---
      const reviewText = await goToReviewAndBack(driver, [
        { label: 'Rules engine folder', value: reFolderName },
        { label: 'Function namespace', value: reNamespace },
        { label: 'Function name', value: reFnName },
      ]);

      if (reviewText.toLowerCase().includes('function configuration') || reviewText.toLowerCase().includes('rules engine')) {
        console.log('[reFields] "Function Configuration" / "Rules Engine" section found in review ✓');
      }

      await captureScreenshot(driver, 'reFields-passed');
      console.log('[reFields] PASSED: Rules engine fields filled, review verified');
    });

    // -----------------------------------------------------------------------
    // Test: Switch back to Standard, verify custom code/rules engine
    // fields disappear, fill valid Stateful values, verify comprehensive
    // review with all section headers and paths
    // -----------------------------------------------------------------------
    it('should switch back to standard, verify cleanup, and do comprehensive review check', async function () {
      this.timeout(180_000);

      console.log('[stdComprehensive] Switching back to Logic app (Standard)...');
      await selectRadioOption(driver, 'Logic app (Standard)');
      await sleep(1500);

      // Verify extra config sections are gone
      const pageText = await driver.findElement(By.css('body')).getText();
      const lowerText = pageText.toLowerCase();
      if (lowerText.includes('.net version') || lowerText.includes('function namespace')) {
        console.log('[stdComprehensive] Warning: Custom code / rules engine fields still visible in Standard mode');
      } else {
        console.log('[stdComprehensive] Confirmed: No custom code / rules engine fields in Standard mode ✓');
      }

      // Fill all standard fields with fresh unique names
      const wsName = uniqueName('compws');
      const appName = uniqueName('compapp');
      const wfName = uniqueName('compwf');

      await fillStandardFormFields(driver, tempDir, { wsName, appName, wfName, wfType: 'Stateful' });

      // Navigate to review and do a comprehensive check
      const reviewText = await goToReviewAndBack(driver, [
        { label: 'Workspace name', value: wsName },
        { label: 'Logic app name', value: appName },
        { label: 'Workflow name', value: wfName },
        { label: 'Workflow type', value: 'Stateful' },
      ]);

      const lowerReview = reviewText.toLowerCase();

      // Verify review section headers (from reviewCreateStep.tsx)
      const expectedSections = [
        { name: 'Project Setup', pattern: 'project setup' },
        { name: 'Logic App Details', pattern: 'logic app' },
        { name: 'Workflow Configuration', pattern: 'workflow' },
      ];
      for (const section of expectedSections) {
        if (lowerReview.includes(section.pattern)) {
          console.log(`[stdComprehensive] Section "${section.name}" found ✓`);
        } else {
          console.log(`[stdComprehensive] Warning: Section header "${section.name}" not found`);
        }
      }

      // Verify review labels (from intl messages)
      const expectedLabels = [
        'Workspace name',
        'Workspace folder',
        'Workspace file',
        'Logic app name',
        'Logic app type',
        'Workflow name',
        'Workflow type',
      ];
      for (const label of expectedLabels) {
        if (reviewText.includes(label)) {
          console.log(`[stdComprehensive] Review label "${label}" found ✓`);
        } else {
          console.log(`[stdComprehensive] Warning: Review label "${label}" not found`);
        }
      }

      // Verify the review shows "Logic app (Standard)" as the type
      if (reviewText.includes('Logic app (Standard)') || reviewText.includes('Standard')) {
        console.log('[stdComprehensive] Logic app type "Standard" confirmed in review ✓');
      }

      // Verify workspace file path format: <parent>/<wsName>/<wsName>.code-workspace
      const expectedWsFile = `${wsName}.code-workspace`;
      if (reviewText.includes(expectedWsFile)) {
        console.log(`[stdComprehensive] Workspace file path contains "${expectedWsFile}" ✓`);
      }

      // Verify that custom code / rules engine sections are NOT in review
      if (!lowerReview.includes('custom code configuration') && !lowerReview.includes('function configuration')) {
        console.log('[stdComprehensive] No custom code / rules engine sections in Standard review ✓');
      }

      await captureScreenshot(driver, 'stdComprehensive-passed');
      console.log('[stdComprehensive] PASSED: Standard comprehensive review verified');
    });
  }); // end pre-creation webview tests (single shared webview)

  // =========================================================================
  // CODEFUL DEBUG CREATION TESTS - D-001 Phase A for Phase 4.10.
  // Creates real codeful workspaces through the Create Workspace webview, then
  // records them in the shared manifest for a fresh debug phase to reopen.
  // =========================================================================
  describe('Codeful debug workspace creation tests', function () {
    this.timeout(360_000);

    before(function () {
      if (process.env.LA_E2E_CODEFUL_CREATE_ONLY !== '1') {
        this.skip();
      }
      try {
        if (fs.existsSync(WORKSPACE_MANIFEST_PATH)) {
          fs.unlinkSync(WORKSPACE_MANIFEST_PATH);
          console.log(`[codefulCreation:before] Cleared stale manifest at ${WORKSPACE_MANIFEST_PATH}`);
        }
      } catch {
        // Ignore stale manifest cleanup failures.
      }
    });

    afterEach(async function () {
      if (this.currentTest?.state === 'failed') {
        try {
          const failName = (this.currentTest.title || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 80);
          await captureScreenshot(driver, `FAIL-codeful-${failName}`);
        } catch {
          /* screenshot failed - don't mask the real error */
        }
      }
      try {
        await driver.switchTo().defaultContent();
        await dismissNotifications(driver);
        await new EditorView().closeAllEditors();
      } catch {
        console.log('[codefulCreation:afterEach] Warning: could not reset workbench');
      }
      await sleep(1000);
    });

    async function createCodefulWorkspace(label: string, prefix: string): Promise<void> {
      const wsName = uniqueName(`${prefix}ws`);
      const appName = uniqueName(`${prefix}app`);
      const wfName = uniqueName(`${prefix}wf`);

      console.log(`[${label}] Opening Create Workspace command...`);
      await selectCreateWorkspaceCommand(workbench);
      const webview = await switchToWebviewFrame(driver);

      console.log(`[${label}] Filling codeful workspace fields...`);
      await fillStandardFormFields(driver, tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'Logic app (codeful)',
        wfType: 'Stateful',
      });

      const nextButton = await waitForNextButton(driver);
      await nextButton.click();
      await sleep(2000);

      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[${label}] Review page text (first 800 chars): ${reviewText.substring(0, 800)}`);
      for (const expected of [wsName, appName, wfName]) {
        if (!reviewText.includes(expected)) {
          await webview.switchBack();
          throw new Error(`[${label}] Review page missing expected value: ${expected}`);
        }
      }
      if (!reviewText.toLowerCase().includes('codeful')) {
        await webview.switchBack();
        throw new Error(`[${label}] Review page did not show codeful project type`);
      }

      await clickCreateWorkspaceButton(driver, webview);

      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'codeful',
        wfType: 'Stateful',
      });

      appendToWorkspaceManifest(
        buildManifestEntry(label, tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'codeful',
          wfType: 'Stateful',
        })
      );

      await captureScreenshot(driver, `${prefix}-codeful-passed`);
      console.log(`[${label}] PASSED: real codeful workspace created and verified`);
    }

    it('should create modern codeful workspace through Create Workspace webview', async function () {
      this.timeout(240_000);
      await createCodefulWorkspace('CodefulDebug + Modern', 'cfmodern');
    });

    it('should create legacy-control codeful workspace through Create Workspace webview', async function () {
      this.timeout(240_000);
      await createCodefulWorkspace('CodefulDebug + Legacy', 'cflegacy');
    });
  });

  // =========================================================================
  // CREATION TESTS - These run last because vscode.openFolder may disrupt
  // the test VS Code instance after workspace creation.
  // =========================================================================
  describe('Workspace creation tests', function () {
    this.timeout(180_000);

    before(function () {
      if (process.env.LA_E2E_CODEFUL_CREATE_ONLY === '1') {
        this.skip();
      }
    });

    before(() => {
      // Clear any stale manifest from a previous run so this run starts fresh
      try {
        if (fs.existsSync(WORKSPACE_MANIFEST_PATH)) {
          fs.unlinkSync(WORKSPACE_MANIFEST_PATH);
          console.log(`[creation:before] Cleared stale manifest at ${WORKSPACE_MANIFEST_PATH}`);
        }
      } catch {
        // Ignore
      }
    });

    afterEach(async function () {
      // Capture screenshot on failure for CI debugging
      if (this.currentTest?.state === 'failed') {
        try {
          const failName = (this.currentTest.title || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 80);
          await captureScreenshot(driver, `FAIL-${failName}`);
        } catch {
          /* screenshot failed — don't mask the real error */
        }
      }
      try {
        await driver.switchTo().defaultContent();
      } catch {
        console.log('[creation:afterEach] Could not switch to defaultContent');
      }
      // Aggressively dismiss all notifications that accumulated during workspace creation
      try {
        await dismissNotifications(driver);
        await driver.executeScript(`
          document.querySelectorAll('.notification-toast-container, .notifications-toasts').forEach(el => el.remove());
        `);
      } catch {
        /* ignore */
      }
      try {
        await sleep(2000);
        const editorView = new EditorView();
        await editorView.closeAllEditors();
      } catch {
        console.log('[creation:afterEach] Warning: could not close editors');
      }
      await sleep(1000);
    });

    // =========================================================================
    // Standard flow: fill all fields, create workspace, verify on disk
    // =========================================================================
    it('should fill all form fields, create workspace, and verify on disk', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('testws');
      const appName = uniqueName('testapp');
      const wfName = uniqueName('testwf');

      // Step 1: Open the Create Workspace command
      console.log('[createStandard] Opening Create Workspace command...');
      await captureScreenshot(driver, 'createStandard-step1-before-command');
      await selectCreateWorkspaceCommand(workbench);
      await captureScreenshot(driver, 'createStandard-step1-after-command');

      // Step 2: Switch to webview
      console.log('[createStandard] Switching to webview...');
      const webview = await switchToWebviewFrame(driver);
      await captureScreenshot(driver, 'createStandard-step2-webview-loaded');

      // Step 3: Fill all standard form fields
      console.log('[createStandard] Filling all form fields...');
      await fillStandardFormFields(driver, tempDir, { wsName, appName, wfName });
      await captureScreenshot(driver, 'createStandard-step3-fields-filled');

      // Step 4: Wait for Next button to be enabled and click it
      console.log('[createStandard] Waiting for Next button...');
      const nextButton = await waitForNextButton(driver);
      await captureScreenshot(driver, 'createStandard-step4-before-next');
      console.log('[createStandard] Clicking Next...');
      await nextButton.click();
      await sleep(2000);
      await captureScreenshot(driver, 'createStandard-step5-review-page');

      // Step 5: Verify we're on the Review step
      console.log('[createStandard] Verifying Review step...');
      const reviewHeaders = await driver.findElements(By.xpath("//*[contains(text(), 'Review') or contains(text(), 'review')]"));
      console.log(`[createStandard] Found ${reviewHeaders.length} review-related elements`);

      if (reviewHeaders.length === 0) {
        await webview.switchBack();
        throw new Error('Review step not displayed after clicking Next');
      }

      // Step 6: Verify our values are shown in the review
      const pageText = await driver.findElement(By.css('body')).getText();
      console.log(`[createStandard] Review page text (first 500 chars): ${pageText.substring(0, 500)}`);
      const hasWorkspaceName = pageText.includes(wsName);
      const hasAppName = pageText.includes(appName);
      const hasWorkflowName = pageText.includes(wfName);
      console.log(`[createStandard] Review shows workspace name "${wsName}": ${hasWorkspaceName}`);
      console.log(`[createStandard] Review shows app name "${appName}": ${hasAppName}`);
      console.log(`[createStandard] Review shows workflow name "${wfName}": ${hasWorkflowName}`);

      if (!hasWorkspaceName) {
        await webview.switchBack();
        throw new Error(`Workspace name "${wsName}" not found in review`);
      }
      if (!hasAppName) {
        await webview.switchBack();
        throw new Error(`App name "${appName}" not found in review`);
      }
      if (!hasWorkflowName) {
        await webview.switchBack();
        throw new Error(`Workflow name "${wfName}" not found in review`);
      }

      // Step 7: Click "Create workspace" to actually create the workspace
      await captureScreenshot(driver, 'createStandard-step6-before-create');
      await clickCreateWorkspaceButton(driver, webview);
      await captureScreenshot(driver, 'createStandard-step7-after-create');

      // Step 8: Deep-verify workspace on disk
      console.log('[createStandard] Verifying workspace on disk...');
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'standard',
        wfType: 'Stateful',
      });

      appendToWorkspaceManifest(
        buildManifestEntry('Standard + Stateful', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'standard',
          wfType: 'Stateful',
        })
      );

      await captureScreenshot(driver, 'createStandard-passed');
      console.log('[createStandard] PASSED: Workspace created and verified on disk');
    });

    // =========================================================================
    // Custom code flow: fill ALL fields, create workspace, verify on disk
    // =========================================================================
    it('should fill all custom code fields, create workspace, and verify on disk', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('ccws');
      const appName = uniqueName('ccapp');
      const wfName = uniqueName('ccwf');
      const ccFolderName = uniqueName('ccfolder');
      const fnNamespace = 'MyCompany.Functions';
      const fnName = uniqueName('myfunc');

      // Step 1: Open the Create Workspace command
      console.log('[createCustomCode] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);

      // Step 2: Switch to webview
      console.log('[createCustomCode] Switching to webview...');
      const webview = await switchToWebviewFrame(driver);

      // Step 3: Fill workspace path and name
      console.log('[createCustomCode] Filling workspace parent folder path...');
      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);

      console.log('[createCustomCode] Filling workspace name...');
      const wsNameInput = await findInputByLabel(driver, 'Workspace name');
      await clearAndType(wsNameInput, wsName);

      // Step 4: Fill logic app name
      console.log('[createCustomCode] Filling logic app name...');
      const appNameInput = await findInputByLabel(driver, 'Logic app name');
      await clearAndType(appNameInput, appName);

      // Step 5: Select "Logic app with custom code" radio
      console.log('[createCustomCode] Selecting "Logic app with custom code"...');
      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(2000); // Wait for conditional fields to render

      // Step 6: Verify custom code fields are visible
      const pageTextAfterRadio = await driver.findElement(By.css('body')).getText();
      const hasCustomCodeSection =
        pageTextAfterRadio.toLowerCase().includes('custom code') ||
        pageTextAfterRadio.toLowerCase().includes('.net version') ||
        pageTextAfterRadio.toLowerCase().includes('.net') ||
        pageTextAfterRadio.toLowerCase().includes('function');
      console.log(`[createCustomCode] Custom code section visible: ${hasCustomCodeSection}`);
      if (!hasCustomCodeSection) {
        await webview.switchBack();
        throw new Error('Custom code configuration fields did not appear after selecting custom code type');
      }

      // Step 7: Fill all custom code fields
      console.log('[createCustomCode] Filling custom code configuration fields...');
      await fillCustomCodeFields(driver, {
        dotNetVersion: '.NET 8',
        folderName: ccFolderName,
        namespace: fnNamespace,
        functionName: fnName,
      });

      // Step 8: Fill workflow name and type
      console.log('[createCustomCode] Filling workflow name...');
      const wfNameInput = await findInputByLabel(driver, 'Workflow name');
      await clearAndType(wfNameInput, wfName);

      console.log('[createCustomCode] Selecting workflow type...');
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Stateful');

      // Step 9: Dump form state for debugging, then wait for Next button
      console.log('[createCustomCode] Dumping form state before Next...');
      await dumpFormState(driver);

      console.log('[createCustomCode] Waiting for Next button...');
      const nextButton = await waitForNextButton(driver);
      console.log('[createCustomCode] Clicking Next...');
      await nextButton.click();
      await sleep(2000);

      // Step 10: Verify Review step shows all values including custom code fields
      console.log('[createCustomCode] Verifying Review step...');
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createCustomCode] Review page text (first 800 chars): ${reviewText.substring(0, 800)}`);

      const hasWsName = reviewText.includes(wsName);
      const hasApp = reviewText.includes(appName);
      const hasWf = reviewText.includes(wfName);
      const hasCcFolder = reviewText.includes(ccFolderName);
      const hasNs = reviewText.includes(fnNamespace);
      const hasFn = reviewText.includes(fnName);
      const hasNet8 = reviewText.toLowerCase().includes('.net 8') || reviewText.toLowerCase().includes('net8');

      console.log(`[createCustomCode] Review has workspace name: ${hasWsName}`);
      console.log(`[createCustomCode] Review has app name: ${hasApp}`);
      console.log(`[createCustomCode] Review has workflow name: ${hasWf}`);
      console.log(`[createCustomCode] Review has custom code folder: ${hasCcFolder}`);
      console.log(`[createCustomCode] Review has function namespace: ${hasNs}`);
      console.log(`[createCustomCode] Review has function name: ${hasFn}`);
      console.log(`[createCustomCode] Review has .NET 8: ${hasNet8}`);

      if (!hasWsName) {
        await webview.switchBack();
        throw new Error(`Workspace name "${wsName}" not found in review`);
      }
      if (!hasApp) {
        await webview.switchBack();
        throw new Error(`App name "${appName}" not found in review`);
      }

      // Step 11: Click "Create workspace" to actually create the workspace
      await clickCreateWorkspaceButton(driver, webview);

      // Step 12: Deep-verify workspace on disk
      console.log('[createCustomCode] Verifying workspace on disk...');
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'customCode',
        wfType: 'Stateful',
        ccFolderName,
        fnName,
        fnNamespace: fnNamespace,
      });

      appendToWorkspaceManifest(
        buildManifestEntry('CustomCode + Stateful', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'customCode',
          wfType: 'Stateful',
          ccFolderName,
          fnName,
          fnNamespace,
        })
      );

      await captureScreenshot(driver, 'createCustomCode-passed');
      console.log('[createCustomCode] PASSED: Custom code workspace created and verified on disk');
    });

    // =========================================================================
    // Stateless workflow: fill all fields, create workspace, verify on disk
    // =========================================================================
    it('should create workspace with Stateless workflow type', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('slws');
      const appName = uniqueName('slapp');
      const wfName = uniqueName('slwf');

      console.log('[createStateless] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);

      console.log('[createStateless] Switching to webview...');
      const webview = await switchToWebviewFrame(driver);

      console.log('[createStateless] Filling form fields with Stateless workflow...');
      await fillStandardFormFields(driver, tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'Logic app (Standard)',
        wfType: 'Stateless',
      });

      console.log('[createStateless] Waiting for Next button...');
      const nextButton = await waitForNextButton(driver);
      console.log('[createStateless] Clicking Next...');
      await nextButton.click();
      await sleep(2000);

      // Verify review step shows Stateless
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createStateless] Review text (first 500 chars): ${reviewText.substring(0, 500)}`);

      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error(`Workspace name "${wsName}" not found in review`);
      }
      if (!reviewText.includes('Stateless')) {
        console.log('[createStateless] Warning: "Stateless" not explicitly shown in review');
      }

      // Click create
      await clickCreateWorkspaceButton(driver, webview);

      // Deep-verify on disk
      console.log('[createStateless] Verifying workspace on disk...');
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'standard',
        wfType: 'Stateless',
      });

      appendToWorkspaceManifest(
        buildManifestEntry('Standard + Stateless', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'standard',
          wfType: 'Stateless',
        })
      );

      await captureScreenshot(driver, 'createStateless-passed');
      console.log('[createStateless] PASSED: Stateless workspace created and verified on disk');
    });

    // =========================================================================
    // Autonomous Agents workflow: fill all fields, create workspace, verify
    // =========================================================================
    it('should create workspace with Autonomous Agents workflow type', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('aaws');
      const appName = uniqueName('aaapp');
      const wfName = uniqueName('aawf');

      console.log('[createAutonomousAgent] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);

      console.log('[createAutonomousAgent] Switching to webview...');
      const webview = await switchToWebviewFrame(driver);

      console.log('[createAutonomousAgent] Filling form fields with Autonomous Agents workflow...');
      await fillStandardFormFields(driver, tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'Logic app (Standard)',
        wfType: 'Autonomous agents (Preview)',
      });

      console.log('[createAutonomousAgent] Waiting for Next button...');
      const nextButton = await waitForNextButton(driver);
      console.log('[createAutonomousAgent] Clicking Next...');
      await nextButton.click();
      await sleep(2000);

      // Verify review step
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createAutonomousAgent] Review text (first 500 chars): ${reviewText.substring(0, 500)}`);

      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error(`Workspace name "${wsName}" not found in review`);
      }
      if (reviewText.includes('Autonomous') || reviewText.includes('autonomous') || reviewText.includes('Agentic')) {
        console.log('[createAutonomousAgent] Autonomous Agents type shown in review');
      } else {
        console.log('[createAutonomousAgent] Warning: Autonomous Agents type not explicitly shown in review');
      }

      // Click create
      await clickCreateWorkspaceButton(driver, webview);

      // Deep-verify on disk
      console.log('[createAutonomousAgent] Verifying workspace on disk...');
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'standard',
        wfType: 'Autonomous agents (Preview)',
      });

      appendToWorkspaceManifest(
        buildManifestEntry('Standard + Autonomous Agents', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'standard',
          wfType: 'Autonomous agents (Preview)',
        })
      );

      await captureScreenshot(driver, 'createAutonomousAgent-passed');
      console.log('[createAutonomousAgent] PASSED: Autonomous Agents workspace created and verified');
    });

    // =========================================================================
    // Conversational Agents workflow: fill all fields, create workspace, verify
    // =========================================================================
    it('should create workspace with Conversational Agents workflow type', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('caws');
      const appName = uniqueName('caapp');
      const wfName = uniqueName('cawf');

      console.log('[createConversationalAgent] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);

      console.log('[createConversationalAgent] Switching to webview...');
      const webview = await switchToWebviewFrame(driver);

      console.log('[createConversationalAgent] Filling form fields with Conversational Agents workflow...');
      await fillStandardFormFields(driver, tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'Logic app (Standard)',
        wfType: 'Conversational agents (Preview)',
      });

      console.log('[createConversationalAgent] Waiting for Next button...');
      const nextButton = await waitForNextButton(driver);
      console.log('[createConversationalAgent] Clicking Next...');
      await nextButton.click();
      await sleep(2000);

      // Verify review step
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createConversationalAgent] Review text (first 500 chars): ${reviewText.substring(0, 500)}`);

      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error(`Workspace name "${wsName}" not found in review`);
      }
      if (reviewText.includes('Conversational') || reviewText.includes('conversational') || reviewText.includes('Agent')) {
        console.log('[createConversationalAgent] Conversational Agents type shown in review');
      } else {
        console.log('[createConversationalAgent] Warning: Conversational Agents type not explicitly shown in review');
      }

      // Click create
      await clickCreateWorkspaceButton(driver, webview);

      // Deep-verify on disk
      console.log('[createConversationalAgent] Verifying workspace on disk...');
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'standard',
        wfType: 'Conversational agents (Preview)',
      });

      appendToWorkspaceManifest(
        buildManifestEntry('Standard + Conversational Agents', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'standard',
          wfType: 'Conversational agents (Preview)',
        })
      );

      await captureScreenshot(driver, 'createConversationalAgent-passed');
      console.log('[createConversationalAgent] PASSED: Conversational Agents workspace created and verified');
    });

    // =========================================================================
    // Rules engine flow: fill ALL fields, create workspace, verify on disk
    // =========================================================================
    it('should fill all rules engine fields, create workspace, and verify on disk', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('rews');
      const appName = uniqueName('reapp');
      const wfName = uniqueName('rewf');
      const reFolderName = uniqueName('refolder');
      const fnNamespace = 'RulesEngineNamespace';
      const fnName = uniqueName('rulesfn');

      // Step 1: Open the Create Workspace command
      console.log('[createRulesEngine] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);

      // Step 2: Switch to webview
      console.log('[createRulesEngine] Switching to webview...');
      const webview = await switchToWebviewFrame(driver);

      // Step 3: Fill workspace path and name
      console.log('[createRulesEngine] Filling workspace parent folder path...');
      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);

      console.log('[createRulesEngine] Filling workspace name...');
      const wsNameInput = await findInputByLabel(driver, 'Workspace name');
      await clearAndType(wsNameInput, wsName);

      // Step 4: Fill logic app name
      console.log('[createRulesEngine] Filling logic app name...');
      const appNameInput = await findInputByLabel(driver, 'Logic app name');
      await clearAndType(appNameInput, appName);

      // Step 5: Select "Logic app with rules engine" radio
      console.log('[createRulesEngine] Selecting "Logic app with rules engine"...');
      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(2000); // Wait for conditional fields to render

      // Step 6: Verify rules engine fields are visible
      const pageTextAfterRadio = await driver.findElement(By.css('body')).getText();
      const hasRulesEngineSection =
        pageTextAfterRadio.toLowerCase().includes('rules engine') || pageTextAfterRadio.toLowerCase().includes('function');
      console.log(`[createRulesEngine] Rules engine section visible: ${hasRulesEngineSection}`);
      if (!hasRulesEngineSection) {
        await webview.switchBack();
        throw new Error('Rules engine configuration fields did not appear after selecting rules engine type');
      }

      // Step 7: Fill rules engine folder name
      console.log(`[createRulesEngine] Filling rules engine folder name: "${reFolderName}"...`);
      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!folderInput) {
        await webview.switchBack();
        throw new Error('Could not find rules engine folder name input');
      }
      await clearAndType(folderInput, reFolderName);

      // Step 8: Fill function namespace
      console.log(`[createRulesEngine] Filling function namespace: "${fnNamespace}"...`);
      let nsInput: WebElement | null = null;
      for (const label of ['Function namespace', 'Namespace']) {
        try {
          nsInput = await findInputByLabel(driver, label);
          break;
        } catch {
          // Try next
        }
      }
      if (!nsInput) {
        await webview.switchBack();
        throw new Error('Could not find function namespace input');
      }
      await clearAndType(nsInput, fnNamespace);

      // Step 9: Fill function name
      console.log(`[createRulesEngine] Filling function name: "${fnName}"...`);
      let fnInput: WebElement | null = null;
      const fnLabels = await driver.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await driver.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
        if (!fnInput) {
          const parent = await fnLabels[0].findElement(By.xpath('..'));
          const inputs = await parent.findElements(By.css('input'));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
      }
      if (!fnInput) {
        fnInput = await findInputByLabel(driver, 'Function name');
      }
      await clearAndType(fnInput, fnName);

      // Step 10: Fill workflow name and type
      console.log('[createRulesEngine] Filling workflow name...');
      const wfNameInput = await findInputByLabel(driver, 'Workflow name');
      await clearAndType(wfNameInput, wfName);

      console.log('[createRulesEngine] Selecting workflow type...');
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Stateful');

      // Step 11: Dump form state before proceeding
      console.log('[createRulesEngine] Dumping form state before Next...');
      await dumpFormState(driver);

      console.log('[createRulesEngine] Waiting for Next button...');
      const nextButton = await waitForNextButton(driver);
      console.log('[createRulesEngine] Clicking Next...');
      await nextButton.click();
      await sleep(2000);

      // Step 12: Verify Review step
      console.log('[createRulesEngine] Verifying Review step...');
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createRulesEngine] Review page text (first 800 chars): ${reviewText.substring(0, 800)}`);

      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error(`Workspace name "${wsName}" not found in review`);
      }
      if (!reviewText.includes(appName)) {
        await webview.switchBack();
        throw new Error(`App name "${appName}" not found in review`);
      }

      // Verify rules engine specific values in review
      const hasReFolder = reviewText.includes(reFolderName);
      const hasReNs = reviewText.includes(fnNamespace);
      const hasReFn = reviewText.includes(fnName);
      console.log(`[createRulesEngine] Review has rules engine folder: ${hasReFolder}`);
      console.log(`[createRulesEngine] Review has function namespace: ${hasReNs}`);
      console.log(`[createRulesEngine] Review has function name: ${hasReFn}`);

      // Step 13: Click "Create workspace"
      await clickCreateWorkspaceButton(driver, webview);

      // Step 14: Deep-verify workspace on disk
      console.log('[createRulesEngine] Verifying workspace on disk...');
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'rulesEngine',
        wfType: 'Stateful',
        ccFolderName: reFolderName,
        fnName,
        fnNamespace: fnNamespace,
      });

      appendToWorkspaceManifest(
        buildManifestEntry('RulesEngine + Stateful', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'rulesEngine',
          wfType: 'Stateful',
          ccFolderName: reFolderName,
          fnName,
          fnNamespace,
        })
      );

      await captureScreenshot(driver, 'createRulesEngine-passed');
      console.log('[createRulesEngine] PASSED: Rules engine workspace created and verified on disk');
    });

    // =========================================================================
    // Custom Code + Stateless: fill custom code fields, Stateless workflow, verify
    // =========================================================================
    it('should create custom code workspace with Stateless workflow', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('ccslws');
      const appName = uniqueName('ccslapp');
      const wfName = uniqueName('ccslwf');
      const ccFolderName = uniqueName('ccslf');
      const fnNamespace = 'CcStatelessNs';
      const fnName = uniqueName('ccslfn');

      console.log('[createCcStateless] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);
      const webview = await switchToWebviewFrame(driver);

      // Fill workspace setup
      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);
      await clearAndType(await findInputByLabel(driver, 'Workspace name'), wsName);
      await clearAndType(await findInputByLabel(driver, 'Logic app name'), appName);

      // Select custom code
      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(2000);
      await fillCustomCodeFields(driver, {
        dotNetVersion: '.NET 8',
        folderName: ccFolderName,
        namespace: fnNamespace,
        functionName: fnName,
      });

      // Fill workflow
      await clearAndType(await findInputByLabel(driver, 'Workflow name'), wfName);
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Stateless');

      // Navigate to review
      const nextButton = await waitForNextButton(driver);
      await nextButton.click();
      await sleep(2000);
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createCcStateless] Review (first 500 chars): ${reviewText.substring(0, 500)}`);
      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error('wsName not in review');
      }
      if (!reviewText.includes('Stateless')) {
        console.log('[createCcStateless] Warning: Stateless not in review');
      }

      await clickCreateWorkspaceButton(driver, webview);
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'customCode',
        wfType: 'Stateless',
        ccFolderName,
        fnName,
        fnNamespace,
      });

      appendToWorkspaceManifest(
        buildManifestEntry('CustomCode + Stateless', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'customCode',
          wfType: 'Stateless',
          ccFolderName,
          fnName,
          fnNamespace,
        })
      );

      await captureScreenshot(driver, 'createCcStateless-passed');
      console.log('[createCcStateless] PASSED');
    });

    // =========================================================================
    // Custom Code + Autonomous Agents: verify
    // =========================================================================
    it('should create custom code workspace with Autonomous Agents workflow', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('ccaaws');
      const appName = uniqueName('ccaaapp');
      const wfName = uniqueName('ccaawf');
      const ccFolderName = uniqueName('ccaaf');
      const fnNamespace = 'CcAgenticNs';
      const fnName = uniqueName('ccaafn');

      console.log('[createCcAgentic] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);
      const webview = await switchToWebviewFrame(driver);

      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);
      await clearAndType(await findInputByLabel(driver, 'Workspace name'), wsName);
      await clearAndType(await findInputByLabel(driver, 'Logic app name'), appName);

      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(2000);
      await fillCustomCodeFields(driver, {
        dotNetVersion: '.NET 8',
        folderName: ccFolderName,
        namespace: fnNamespace,
        functionName: fnName,
      });

      await clearAndType(await findInputByLabel(driver, 'Workflow name'), wfName);
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Autonomous agents (Preview)');

      const nextButton = await waitForNextButton(driver);
      await nextButton.click();
      await sleep(2000);
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createCcAgentic] Review (first 500 chars): ${reviewText.substring(0, 500)}`);
      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error('wsName not in review');
      }

      await clickCreateWorkspaceButton(driver, webview);
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'customCode',
        wfType: 'Autonomous agents (Preview)',
        ccFolderName,
        fnName,
        fnNamespace,
      });

      appendToWorkspaceManifest(
        buildManifestEntry('CustomCode + Autonomous Agents', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'customCode',
          wfType: 'Autonomous agents (Preview)',
          ccFolderName,
          fnName,
          fnNamespace,
        })
      );

      await captureScreenshot(driver, 'createCcAgentic-passed');
      console.log('[createCcAgentic] PASSED');
    });

    // =========================================================================
    // Custom Code + Conversational Agents: verify
    // =========================================================================
    it('should create custom code workspace with Conversational Agents workflow', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('cccaws');
      const appName = uniqueName('cccaapp');
      const wfName = uniqueName('cccawf');
      const ccFolderName = uniqueName('cccaf');
      const fnNamespace = 'CcConvAgentNs';
      const fnName = uniqueName('cccafn');

      console.log('[createCcConvAgent] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);
      const webview = await switchToWebviewFrame(driver);

      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);
      await clearAndType(await findInputByLabel(driver, 'Workspace name'), wsName);
      await clearAndType(await findInputByLabel(driver, 'Logic app name'), appName);

      await selectRadioOption(driver, 'Logic app with custom code');
      await sleep(2000);
      await fillCustomCodeFields(driver, {
        dotNetVersion: '.NET 8',
        folderName: ccFolderName,
        namespace: fnNamespace,
        functionName: fnName,
      });

      await clearAndType(await findInputByLabel(driver, 'Workflow name'), wfName);
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Conversational agents (Preview)');

      const nextButton = await waitForNextButton(driver);
      await nextButton.click();
      await sleep(2000);
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createCcConvAgent] Review (first 500 chars): ${reviewText.substring(0, 500)}`);
      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error('wsName not in review');
      }

      await clickCreateWorkspaceButton(driver, webview);
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'customCode',
        wfType: 'Conversational agents (Preview)',
        ccFolderName,
        fnName,
        fnNamespace,
      });

      appendToWorkspaceManifest(
        buildManifestEntry('CustomCode + Conversational Agents', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'customCode',
          wfType: 'Conversational agents (Preview)',
          ccFolderName,
          fnName,
          fnNamespace,
        })
      );

      await captureScreenshot(driver, 'createCcConvAgent-passed');
      console.log('[createCcConvAgent] PASSED');
    });

    // =========================================================================
    // Rules Engine + Stateless: verify
    // =========================================================================
    it('should create rules engine workspace with Stateless workflow', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('reslws');
      const appName = uniqueName('reslapp');
      const wfName = uniqueName('reslwf');
      const reFolderName = uniqueName('reslf');
      const fnNamespace = 'ReStatelessNs';
      const fnName = uniqueName('reslfn');

      console.log('[createReStateless] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);
      const webview = await switchToWebviewFrame(driver);

      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);
      await clearAndType(await findInputByLabel(driver, 'Workspace name'), wsName);
      await clearAndType(await findInputByLabel(driver, 'Logic app name'), appName);

      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(2000);

      // Rules engine fields (no .NET dropdown)
      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          /* next */
        }
      }
      if (!folderInput) {
        throw new Error('Could not find rules engine folder name input');
      }
      await clearAndType(folderInput, reFolderName);

      let nsInput: WebElement | null = null;
      for (const label of ['Function namespace', 'Namespace']) {
        try {
          nsInput = await findInputByLabel(driver, label);
          break;
        } catch {
          /* next */
        }
      }
      if (!nsInput) {
        throw new Error('Could not find function namespace input');
      }
      await clearAndType(nsInput, fnNamespace);

      const fnLabels = await driver.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      let fnInput: WebElement | null = null;
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await driver.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
        if (!fnInput) {
          const parent = await fnLabels[0].findElement(By.xpath('..'));
          const inputs = await parent.findElements(By.css('input'));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
      }
      if (!fnInput) {
        fnInput = await findInputByLabel(driver, 'Function name');
      }
      await clearAndType(fnInput, fnName);

      await clearAndType(await findInputByLabel(driver, 'Workflow name'), wfName);
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Stateless');

      const nextButton = await waitForNextButton(driver);
      await nextButton.click();
      await sleep(2000);
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createReStateless] Review (first 500 chars): ${reviewText.substring(0, 500)}`);
      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error('wsName not in review');
      }

      await clickCreateWorkspaceButton(driver, webview);
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'rulesEngine',
        wfType: 'Stateless',
        ccFolderName: reFolderName,
        fnName,
        fnNamespace,
      });

      appendToWorkspaceManifest(
        buildManifestEntry('RulesEngine + Stateless', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'rulesEngine',
          wfType: 'Stateless',
          ccFolderName: reFolderName,
          fnName,
          fnNamespace,
        })
      );

      await captureScreenshot(driver, 'createReStateless-passed');
      console.log('[createReStateless] PASSED');
    });

    // =========================================================================
    // Rules Engine + Autonomous Agents: verify
    // =========================================================================
    it('should create rules engine workspace with Autonomous Agents workflow', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('reaaws');
      const appName = uniqueName('reaaapp');
      const wfName = uniqueName('reaawf');
      const reFolderName = uniqueName('reaaf');
      const fnNamespace = 'ReAgenticNs';
      const fnName = uniqueName('reaafn');

      console.log('[createReAgentic] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);
      const webview = await switchToWebviewFrame(driver);

      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);
      await clearAndType(await findInputByLabel(driver, 'Workspace name'), wsName);
      await clearAndType(await findInputByLabel(driver, 'Logic app name'), appName);

      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(2000);

      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          /* next */
        }
      }
      if (!folderInput) {
        throw new Error('Could not find rules engine folder name input');
      }
      await clearAndType(folderInput, reFolderName);

      let nsInput: WebElement | null = null;
      for (const label of ['Function namespace', 'Namespace']) {
        try {
          nsInput = await findInputByLabel(driver, label);
          break;
        } catch {
          /* next */
        }
      }
      if (!nsInput) {
        throw new Error('Could not find function namespace input');
      }
      await clearAndType(nsInput, fnNamespace);

      const fnLabels = await driver.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      let fnInput: WebElement | null = null;
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await driver.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
        if (!fnInput) {
          const parent = await fnLabels[0].findElement(By.xpath('..'));
          const inputs = await parent.findElements(By.css('input'));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
      }
      if (!fnInput) {
        fnInput = await findInputByLabel(driver, 'Function name');
      }
      await clearAndType(fnInput, fnName);

      await clearAndType(await findInputByLabel(driver, 'Workflow name'), wfName);
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Autonomous agents (Preview)');

      const nextButton = await waitForNextButton(driver);
      await nextButton.click();
      await sleep(2000);
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createReAgentic] Review (first 500 chars): ${reviewText.substring(0, 500)}`);
      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error('wsName not in review');
      }

      await clickCreateWorkspaceButton(driver, webview);
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'rulesEngine',
        wfType: 'Autonomous agents (Preview)',
        ccFolderName: reFolderName,
        fnName,
        fnNamespace,
      });

      appendToWorkspaceManifest(
        buildManifestEntry('RulesEngine + Autonomous Agents', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'rulesEngine',
          wfType: 'Autonomous agents (Preview)',
          ccFolderName: reFolderName,
          fnName,
          fnNamespace,
        })
      );

      await captureScreenshot(driver, 'createReAgentic-passed');
      console.log('[createReAgentic] PASSED');
    });

    // =========================================================================
    // Rules Engine + Conversational Agents: verify
    // =========================================================================
    it('should create rules engine workspace with Conversational Agents workflow', async function () {
      this.timeout(180_000);

      const wsName = uniqueName('recaws');
      const appName = uniqueName('recaapp');
      const wfName = uniqueName('recawf');
      const reFolderName = uniqueName('recaf');
      const fnNamespace = 'ReConvAgentNs';
      const fnName = uniqueName('recafn');

      console.log('[createReConvAgent] Opening Create Workspace command...');
      await selectCreateWorkspaceCommand(workbench);
      const webview = await switchToWebviewFrame(driver);

      const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
      await clearAndType(pathInput, tempDir);
      await waitForPathValidation(driver);
      await clearAndType(await findInputByLabel(driver, 'Workspace name'), wsName);
      await clearAndType(await findInputByLabel(driver, 'Logic app name'), appName);

      await selectRadioOption(driver, 'Logic app with rules engine');
      await sleep(2000);

      let folderInput: WebElement | null = null;
      for (const label of ['Rules engine folder name', 'rules engine folder', 'Folder name']) {
        try {
          folderInput = await findInputByLabel(driver, label);
          break;
        } catch {
          /* next */
        }
      }
      if (!folderInput) {
        throw new Error('Could not find rules engine folder name input');
      }
      await clearAndType(folderInput, reFolderName);

      let nsInput: WebElement | null = null;
      for (const label of ['Function namespace', 'Namespace']) {
        try {
          nsInput = await findInputByLabel(driver, label);
          break;
        } catch {
          /* next */
        }
      }
      if (!nsInput) {
        throw new Error('Could not find function namespace input');
      }
      await clearAndType(nsInput, fnNamespace);

      const fnLabels = await driver.findElements(
        By.xpath("//label[contains(text(), 'Function name') and not(contains(text(), 'namespace'))]")
      );
      let fnInput: WebElement | null = null;
      if (fnLabels.length > 0) {
        const forAttr = await fnLabels[0].getAttribute('for');
        if (forAttr) {
          const inputs = await driver.findElements(By.id(forAttr));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
        if (!fnInput) {
          const parent = await fnLabels[0].findElement(By.xpath('..'));
          const inputs = await parent.findElements(By.css('input'));
          if (inputs.length > 0) {
            fnInput = inputs[0];
          }
        }
      }
      if (!fnInput) {
        fnInput = await findInputByLabel(driver, 'Function name');
      }
      await clearAndType(fnInput, fnName);

      await clearAndType(await findInputByLabel(driver, 'Workflow name'), wfName);
      const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
      await selectDropdownOption(driver, wfTypeDropdown, 'Conversational agents (Preview)');

      const nextButton = await waitForNextButton(driver);
      await nextButton.click();
      await sleep(2000);
      const reviewText = await driver.findElement(By.css('body')).getText();
      console.log(`[createReConvAgent] Review (first 500 chars): ${reviewText.substring(0, 500)}`);
      if (!reviewText.includes(wsName)) {
        await webview.switchBack();
        throw new Error('wsName not in review');
      }

      await clickCreateWorkspaceButton(driver, webview);
      deepVerifyWorkspace(tempDir, {
        wsName,
        appName,
        wfName,
        appType: 'rulesEngine',
        wfType: 'Conversational agents (Preview)',
        ccFolderName: reFolderName,
        fnName,
        fnNamespace,
      });

      appendToWorkspaceManifest(
        buildManifestEntry('RulesEngine + Conversational Agents', tempDir, {
          wsName,
          appName,
          wfName,
          appType: 'rulesEngine',
          wfType: 'Conversational agents (Preview)',
          ccFolderName: reFolderName,
          fnName,
          fnNamespace,
        })
      );

      await captureScreenshot(driver, 'createReConvAgent-passed');
      console.log('[createReConvAgent] PASSED');
    });
  }); // end creation describe
});
