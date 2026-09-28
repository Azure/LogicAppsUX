import * as assert from 'assert';
import * as vm from 'vm';
import {
  azureConnectionStatusDomScript,
  getAzureConnectionStatus,
  getScopedAzureConnectionStatus,
  waitForAzureConnectedAction,
} from './azureConnectionStatus';

async function main(): Promise<void> {
  testLoadingThenConnected();
  testPersistentLoading();
  testErrorState();
  testMissingAndUnrelatedConnected();
  testScopedPanelIgnoresHiddenAndUnrelatedConnected();
  testDisconnectedDoesNotMatchConnected();
  testActualDomExtractionRejectsUnrelatedEditableConnected();
  testActualDomExtractionAcceptsProductConnectionStatus();
  testActualDomExtractionAcceptsNodeDetailsPanelConnectionDisplay();
  await testWaitCapturesScreenshotBeforeReturning();
  await testWaitFailsFastOnErrorBeforeConnected();
  console.log('[azureConnectionStatus.unit] all tests passed');
}

function testLoadingThenConnected(): void {
  assert.deepStrictEqual(getAzureConnectionStatus(['Get current weather Loading connection...']).kind, 'loading');
  assert.deepStrictEqual(getAzureConnectionStatus(['Get current weather Connected']).kind, 'connected');
}

function testPersistentLoading(): void {
  const status = getAzureConnectionStatus(['Connection Loading connection...']);
  assert.strictEqual(status.kind, 'loading');
  assert.match(status.matchedText, /Loading connection/);
}

function testErrorState(): void {
  const status = getAzureConnectionStatus(['Get current weather Connection error']);
  assert.strictEqual(status.kind, 'error');
  const invalidConnectionStatus = getAzureConnectionStatus(['Connected to msnweather-1. Change connection Invalid connection']);
  assert.strictEqual(invalidConnectionStatus.kind, 'error');
  assert.strictEqual(getAzureConnectionStatus(['Connected to msnweather-1', 'Invalid connection']).kind, 'error');
  assert.strictEqual(getAzureConnectionStatus(['Connected to msnweather-1', 'Loading connection...']).kind, 'loading');
}

function testMissingAndUnrelatedConnected(): void {
  assert.strictEqual(getAzureConnectionStatus([]).kind, 'missing');
  assert.strictEqual(getAzureConnectionStatus(['Response Connected']).kind, 'connected');
  assert.strictEqual(getAzureConnectionStatus(['']).kind, 'missing');
}

function testScopedPanelIgnoresHiddenAndUnrelatedConnected(): void {
  const status = getScopedAzureConnectionStatus(
    [
      { visible: false, text: 'Get current weather Connected', candidates: ['Connected'] },
      { visible: true, text: 'Response Connected', candidates: ['Connected'] },
      { visible: true, text: 'Get current weather Loading connection...', candidates: ['Loading connection...'] },
    ],
    'Get current weather'
  );
  assert.strictEqual(status.status.kind, 'loading');
  assert.match(status.panelText, /Get current weather/);
}

function testDisconnectedDoesNotMatchConnected(): void {
  assert.strictEqual(getAzureConnectionStatus(['Get current weather Disconnected']).kind, 'disconnected');
  assert.strictEqual(getAzureConnectionStatus(['Get current weather Not connected']).kind, 'disconnected');
}

function testActualDomExtractionRejectsUnrelatedEditableConnected(): void {
  const result = runConnectionStatusDomScript(
    new FakeElement('body', {}, [
      new FakeElement('section', { class: 'msla-panel-container' }, [
        new FakeElement('h2', {}, [], 'Get current weather'),
        new FakeElement('label', {}, [], 'Notes'),
        new FakeElement('div', { contenteditable: 'true', class: 'editor-input' }, [], 'Connected'),
      ]),
    ])
  );
  assert.strictEqual(result.scopedPanelFound, true);
  assert.strictEqual(result.candidates.length, 0);
  assert.strictEqual(getAzureConnectionStatus(result.candidates).kind, 'missing');
}

function testActualDomExtractionAcceptsProductConnectionStatus(): void {
  const result = runConnectionStatusDomScript(
    new FakeElement('body', {}, [
      new FakeElement('section', { class: 'msla-panel-container' }, [
        new FakeElement('h2', {}, [], 'Get current weather'),
        new FakeElement('div', { 'data-automation-id': 'msla-connection-status' }, [
          new FakeElement('span', {}, [], 'Connected to msnweather-1'),
        ]),
      ]),
    ])
  );
  assert.strictEqual(result.scopedPanelFound, true);
  assert.strictEqual(getAzureConnectionStatus(result.candidates).kind, 'connected');
}

function testActualDomExtractionAcceptsNodeDetailsPanelConnectionDisplay(): void {
  const result = runConnectionStatusDomScript(
    new FakeElement('body', {}, [
      new FakeElement('div', { class: 'msla-node-details-panel' }, [
        new FakeElement('h2', {}, [], 'Get current weather'),
        new FakeElement('label', {}, [], 'Location *'),
        new FakeElement('div', { contenteditable: 'true', class: 'editor-input' }, [], '98058'),
        new FakeElement('label', {}, [], 'Units *'),
        new FakeElement('button', {}, [], 'Imperial'),
        new FakeElement('div', { class: 'msla-connection-display' }, [
          new FakeElement('span', {}, [], 'Connected to MSN Weather.'),
          new FakeElement('a', {}, [], 'Change connection'),
        ]),
      ]),
    ])
  );
  assert.strictEqual(result.scopedPanelFound, true);
  assert.match(result.panelText, /Get current weather/);
  assert.strictEqual(getAzureConnectionStatus(result.candidates).kind, 'connected');
}

function runConnectionStatusDomScript(root: FakeElement): {
  scopedPanelFound: boolean;
  panelText: string;
  candidates: string[];
  panelSummaries: string[];
} {
  const document = {
    querySelectorAll: (selector: string) => root.querySelectorAll(selector),
  };
  const window = { innerWidth: 1200, innerHeight: 800, devicePixelRatio: 1 };
  return vm.runInNewContext(azureConnectionStatusDomScript.replace('__ACTION_TITLE__', JSON.stringify('get current weather')), {
    document,
    window,
    HTMLElement: FakeElement,
    Node: { TEXT_NODE: 3 },
  });
}

async function testWaitCapturesScreenshotBeforeReturning(): Promise<void> {
  const milestones: string[] = [];
  let now = 0;
  const observations = [
    {
      scopedPanelFound: true,
      panelText: 'Get current weather Loading connection...',
      candidates: ['Loading connection...'],
      panelSummaries: [],
    },
    { scopedPanelFound: true, panelText: 'Get current weather Connected', candidates: ['Connected'], panelSummaries: [] },
  ];

  const result = await waitForAzureConnectedAction(
    {
      actionTitle: 'Get current weather',
      label: 'standard',
      settingsStage: 'after-save',
      timeoutMs: 1000,
      pollMs: 25,
    },
    {
      getStatusState: async () => {
        milestones.push('poll');
        return observations.shift() ?? observations[0];
      },
      captureConnectedScreenshot: async () => {
        milestones.push('screenshot');
        return 'connected.png';
      },
      sleep: async (ms) => {
        now += ms;
        milestones.push('sleep');
      },
      now: () => now,
    }
  );

  milestones.push('returned');
  assert.strictEqual(result.screenshotPath, 'connected.png');
  assert.deepStrictEqual(milestones, ['poll', 'sleep', 'poll', 'screenshot', 'returned']);
}

async function testWaitFailsFastOnErrorBeforeConnected(): Promise<void> {
  let now = 0;
  await assert.rejects(
    () =>
      waitForAzureConnectedAction(
        {
          actionTitle: 'Get current weather',
          label: 'standard',
          settingsStage: 'after-save',
          timeoutMs: 1000,
          pollMs: 25,
        },
        {
          getStatusState: async () => ({
            scopedPanelFound: true,
            panelText: 'Get current weather Connected to msnweather Invalid connection',
            candidates: ['Connected to msnweather', 'Invalid connection'],
            panelSummaries: [],
          }),
          captureConnectedScreenshot: async () => {
            throw new Error('should not capture after error');
          },
          sleep: async (ms) => {
            now += ms;
          },
          now: () => now,
        }
      ),
    /entered error state/
  );
}

class FakeElement {
  readonly tagName: string;
  readonly attributes: Record<string, string>;
  readonly children: FakeElement[];
  readonly ownText: string;
  readonly offsetWidth = 400;
  readonly offsetHeight = 300;
  parentElement: FakeElement | null = null;

  constructor(tagName: string, attributes: Record<string, string>, children: FakeElement[], ownText = '') {
    this.tagName = tagName.toLowerCase();
    this.attributes = attributes;
    this.children = children;
    this.ownText = ownText;
    for (const child of children) {
      child.parentElement = this;
    }
  }

  get id(): string {
    return this.attributes.id ?? '';
  }

  get className(): string {
    return this.attributes.class ?? '';
  }

  get textContent(): string {
    return `${this.ownText}${this.children.map((child) => child.textContent).join('')}`;
  }

  get innerText(): string {
    return `${this.ownText}${this.children.map((child) => child.innerText).join(' ')}`.replace(/\s+/g, ' ').trim();
  }

  get childNodes(): Array<{ nodeType: number; textContent: string } | FakeElement> {
    return this.ownText ? [{ nodeType: 3, textContent: this.ownText }, ...this.children] : this.children;
  }

  get isContentEditable(): boolean {
    return this.attributes.contenteditable === 'true';
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  hasAttribute(name: string): boolean {
    return this.attributes[name] !== undefined;
  }

  getClientRects(): unknown[] {
    return [{}];
  }

  getBoundingClientRect(): { left: number; top: number; width: number; height: number } {
    return { left: 100, top: 100, width: 400, height: 300 };
  }

  matches(selector: string): boolean {
    return selector
      .split(',')
      .map((part) => part.trim())
      .some((part) => matchesSimpleSelector(this, part));
  }

  closest(selector: string): FakeElement | null {
    let current: FakeElement | null = this;
    while (current) {
      if (current.matches(selector)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const matches: FakeElement[] = [];
    const visit = (element: FakeElement): void => {
      if (element.matches(selector)) {
        matches.push(element);
      }
      for (const child of element.children) {
        visit(child);
      }
    };
    for (const child of this.children) {
      visit(child);
    }
    return matches;
  }
}

function matchesSimpleSelector(element: FakeElement, selector: string): boolean {
  if (selector === '*') {
    return true;
  }
  if (selector === 'textarea' || selector === 'input') {
    return element.tagName === selector;
  }
  if (selector === '[contenteditable="true"]') {
    return element.attributes.contenteditable === 'true';
  }
  if (selector === '.editor-input') {
    return element.className.split(/\s+/).includes('editor-input');
  }
  if (selector === '.msla-panel-container') {
    return element.className.split(/\s+/).includes('msla-panel-container');
  }
  if (selector === '.msla-node-details-panel') {
    return element.className.split(/\s+/).includes('msla-node-details-panel');
  }
  if (selector === '[class*="node-details-panel"]') {
    return element.className.includes('node-details-panel');
  }
  if (selector === '[id^="msla-node-details-panel"]') {
    return element.id.startsWith('msla-node-details-panel');
  }
  if (selector === '[contenteditable="true"], textarea, input, .editor-input') {
    return (
      element.attributes.contenteditable === 'true' ||
      element.tagName === 'textarea' ||
      element.tagName === 'input' ||
      element.className.split(/\s+/).includes('editor-input')
    );
  }
  return false;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
