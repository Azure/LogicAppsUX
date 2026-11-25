export type AzureConnectionStatusKind = 'connected' | 'loading' | 'error' | 'disconnected' | 'missing';

export interface AzureConnectionStatus {
  kind: AzureConnectionStatusKind;
  matchedText: string;
}

export interface AzureConnectionPanelCandidate {
  visible: boolean;
  text: string;
  candidates: string[];
}

export interface ScopedAzureConnectionStatus {
  status: AzureConnectionStatus;
  panelText: string;
  candidates: string[];
}

export interface AzureConnectedActionWaitOptions {
  actionTitle: string;
  label: string;
  settingsStage: string;
  timeoutMs: number;
  pollMs: number;
}

export interface AzureConnectionStatusObservation {
  scopedPanelFound: boolean;
  panelText: string;
  candidates: string[];
  panelSummaries: string[];
  debug?: unknown;
}

export const azureConnectionStatusDomScript = `
(() => {
  const actionTitle = __ACTION_TITLE__;
  const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
  const normalizeIdentifier = (value) => normalize(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const hasVisibleStyle = (element) => {
    let current = element;
    while (current instanceof HTMLElement) {
      if (current.hidden || current.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      const style =
        current.ownerDocument?.defaultView?.getComputedStyle?.(current) ??
        (typeof getComputedStyle === 'function' ? getComputedStyle(current) : undefined);
      if (style) {
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
          return false;
        }
        if (Number.parseFloat(style.opacity || '1') === 0) {
          return false;
        }
      }
      current = current.parentElement;
    }
    return true;
  };
  const isVisible = (element) =>
    !!(element && hasVisibleStyle(element) && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
  const visibleText = (element) => {
    if (!isVisible(element)) {
      return '';
    }
    const ownText = Array.from(element.childNodes || [])
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent || '')
      .join(' ');
    const childText = Array.from(element.children || []).map(visibleText).join(' ');
    return normalize([ownText, childText].filter(Boolean).join(' '));
  };
  const renderedText = (element) => {
    if (!isVisible(element)) {
      return '';
    }
    return visibleText(element);
  };
  const isEditable = (element) =>
    element instanceof HTMLElement &&
    (element.isContentEditable ||
      element.matches('[contenteditable="true"], textarea, input') ||
      !!element.closest('[contenteditable="true"], textarea, input, .editor-input'));
  const hasEditableDescendant = (element) =>
    element instanceof HTMLElement && !!element.querySelector('[contenteditable="true"], textarea, input, .editor-input');
  const statusPattern = /\\b(invalid connection|connected|disconnected|not connected|loading connection|creating connection|connecting|connection error|connection failed|connection failure|failed to connect|unauthorized|forbidden|sign in to connect)\\b/i;
  const safeStyle = (element) => {
    try {
      const style =
        element?.ownerDocument?.defaultView?.getComputedStyle?.(element) ??
        (typeof getComputedStyle === 'function' ? getComputedStyle(element) : undefined);
      return style ? { display: style.display, visibility: style.visibility, opacity: style.opacity } : {};
    } catch {
      return {};
    }
  };
  const summarizeElement = (element, reason) => {
    if (!(element instanceof HTMLElement)) {
      return { reason: reason || 'not HTMLElement' };
    }
    const rect = element.getBoundingClientRect();
    return {
      reason: reason || '',
      tag: element.tagName.toLowerCase(),
      id: element.id || '',
      className: typeof element.className === 'string' ? element.className : '',
      ariaLabel: normalize(element.getAttribute('aria-label') || ''),
      automationId: normalize(element.getAttribute('data-automation-id') || ''),
      visible: isVisible(element),
      rect: {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      style: safeStyle(element),
      renderedText: renderedText(element).slice(0, 240),
      textContent: normalize(element.textContent || '').slice(0, 240),
    };
  };
  const summarizeAncestors = (element) => {
    const ancestors = [];
    let current = element instanceof HTMLElement ? element : undefined;
    for (let depth = 0; current && depth < 5; depth++) {
      ancestors.push(summarizeElement(current, depth === 0 ? 'hit' : 'ancestor'));
      current = current.parentElement || undefined;
    }
    return ancestors;
  };
  const hasConnectionContext = (element, panel) => {
    let current = element;
    let depth = 0;
    while (current && current !== panel && depth < 6) {
      const metadata = [
        current.getAttribute('aria-label') || '',
        current.getAttribute('data-automation-id') || '',
        current.getAttribute('data-testid') || '',
        current.id || '',
        typeof current.className === 'string' ? current.className : '',
      ].join(' ');
      const text = renderedText(current);
      if (
        /connection|connector|authentication|auth/i.test(metadata) ||
        (text.length <= 500 && /\\b(change connection|connection|connected to|loading connection|invalid connection)\\b/i.test(text))
      ) {
        return true;
      }
      current = current.parentElement;
      depth++;
    }
    return false;
  };
  const getPanelNodeIdentities = (panel) => {
    const idPrefix = 'msla-node-details-panel-';
    if (panel.id?.startsWith(idPrefix)) {
      return [panel.id.slice(idPrefix.length)];
    }
    return Array.from(panel.querySelectorAll?.('[id^="msla-node-details-panel-"]') || [])
      .map((nestedPanel) => (nestedPanel.id?.startsWith(idPrefix) ? nestedPanel.id.slice(idPrefix.length) : ''))
      .filter((value, index, all) => value && all.indexOf(value) === index);
  };
  const panelMatchesAction = (panel, text) => {
    const normalizedActionTitle = normalizeIdentifier(actionTitle);
    const nodeIdentities = getPanelNodeIdentities(panel);
    if (nodeIdentities.length > 0) {
      return nodeIdentities.length === 1 && normalizeIdentifier(nodeIdentities[0]) === normalizedActionTitle;
    }
    return text.toLowerCase().includes(actionTitle);
  };
  const panelSelectors = '[id^="msla-node-details-panel"], .msla-node-details-panel, .msla-panel-container, [class*="node-details-panel"]';
  const rawPanels = Array.from(document.querySelectorAll(panelSelectors));
  const panelDebug = rawPanels.slice(0, 30).map((panel) => {
    if (!(panel instanceof HTMLElement)) {
      return summarizeElement(panel, 'not HTMLElement');
    }
    const text = renderedText(panel);
    const rect = panel.getBoundingClientRect();
    const reason = !isVisible(panel)
      ? 'not visible'
      : rect.width <= 250 || rect.height <= 200
        ? 'too small'
        : !panelMatchesAction(panel, text)
          ? 'operation identity mismatch'
          : 'candidate';
    return summarizeElement(panel, reason);
  });
  const textHitPattern = new RegExp(actionTitle.replace(/[.*+?^\\x24{}()|[\\]\\\\]/g, '\\\\$&') + '|connected|connection', 'i');
  const textHits = Array.from(document.querySelectorAll('body *'))
    .filter((element) => {
      const text = normalize((element.textContent || '') + ' ' + (element.getAttribute?.('aria-label') || ''));
      return textHitPattern.test(text);
    })
    .slice(0, 20)
    .map(summarizeAncestors);
  const debug = {
    url: window.location?.href || '',
    title: document.title || '',
    readyState: document.readyState || '',
    actionTitle,
    panelSelectorCount: rawPanels.length,
    panelDebug,
    textHits,
  };
  const panels = rawPanels
    .filter(isVisible)
    .map((panel) => {
      const text = renderedText(panel);
      const rect = panel.getBoundingClientRect();
      return { panel, text, rect };
    })
    .filter(({ panel, text, rect }) => rect.width > 250 && rect.height > 200 && panelMatchesAction(panel, text))
    .sort((a, b) => a.rect.left - b.rect.left);
  const panelSummaries = panels.map(({ text, rect }) => Math.round(rect.left) + ',' + Math.round(rect.top) + ' ' + text.slice(0, 240));
  const scopedPanel = panels.at(-1)?.panel;
  if (!(scopedPanel instanceof HTMLElement)) {
    return { scopedPanelFound: false, panelText: '', candidates: [], panelSummaries, debug };
  }

  const panelText = renderedText(scopedPanel);
  const candidates = Array.from(scopedPanel.querySelectorAll('*'))
    .filter(isVisible)
    .filter((element) => !isEditable(element))
    .filter((element) => !hasEditableDescendant(element))
    .filter((element) => hasConnectionContext(element, scopedPanel))
    .map((element) => {
      const text = renderedText(element);
      const aria = normalize(element.getAttribute('aria-label') || '');
      const automationId = normalize(element.getAttribute('data-automation-id') || '');
      const testId = normalize(element.getAttribute('data-testid') || '');
      return { text, aria, automationId, testId };
    })
    .filter(({ text, aria, automationId, testId }) => {
      const evidence = [text, aria].filter(Boolean).join(' ');
      const metadata = [automationId, testId].filter(Boolean).join(' ');
      return statusPattern.test(evidence) || (/connection|status/i.test(metadata) && statusPattern.test(evidence));
    })
    .map(({ text, aria, automationId, testId }) => [text, aria, automationId, testId].filter(Boolean).join(' | '))
    .filter((value, index, all) => value && all.indexOf(value) === index)
    .slice(0, 30);

  return {
    scopedPanelFound: true,
    panelText,
    candidates,
    panelSummaries,
    debug,
  };
})()
`;

export interface WaitForAzureConnectedActionResult {
  status: AzureConnectionStatus;
  screenshotPath: string;
  elapsedMs: number;
}

const connectionStatusPatterns: Array<{ kind: Exclude<AzureConnectionStatusKind, 'missing'>; pattern: RegExp }> = [
  {
    kind: 'error',
    pattern: /\b(invalid\s+connection|connection\s+(error|failed|failure)|failed\s+to\s+connect|unauthorized|forbidden)\b/i,
  },
  { kind: 'disconnected', pattern: /\b(disconnected|not\s+connected|sign\s+in\s+to\s+connect)\b/i },
  { kind: 'loading', pattern: /\b(loading\s+connection|creating\s+connection|connecting)\b/i },
  { kind: 'connected', pattern: /\bconnected\b/i },
];

export function getAzureConnectionStatus(texts: string[]): AzureConnectionStatus {
  const normalizedTexts = texts.map(normalizeConnectionText).filter(Boolean);
  for (const { kind, pattern } of connectionStatusPatterns) {
    for (const normalizedText of normalizedTexts) {
      if (pattern.test(normalizedText)) {
        return { kind, matchedText: normalizedText };
      }
    }
  }

  return { kind: 'missing', matchedText: '' };
}

export function getScopedAzureConnectionStatus(panels: AzureConnectionPanelCandidate[], actionTitle: string): ScopedAzureConnectionStatus {
  const normalizedActionTitle = normalizeConnectionText(actionTitle).toLowerCase();
  const panel = panels.find(
    (candidate) => candidate.visible && normalizeConnectionText(candidate.text).toLowerCase().includes(normalizedActionTitle)
  );
  if (!panel) {
    return { status: { kind: 'missing', matchedText: '' }, panelText: '', candidates: [] };
  }

  const candidates = panel.candidates.length > 0 ? panel.candidates : [panel.text];
  return {
    status: getAzureConnectionStatus(candidates),
    panelText: normalizeConnectionText(panel.text),
    candidates,
  };
}

export function normalizeConnectionText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export async function waitForAzureConnectedAction(
  options: AzureConnectedActionWaitOptions,
  dependencies: {
    getStatusState: () => Promise<AzureConnectionStatusObservation>;
    captureConnectedScreenshot: (screenshotName: string) => Promise<string>;
    sleep: (ms: number) => Promise<void>;
    now: () => number;
    log?: (message: string) => void;
  }
): Promise<WaitForAzureConnectedActionResult> {
  const startedAt = dependencies.now();
  const screenshotName = `workspace-lifecycle-${options.label}-${sanitizeScreenshotSegment(options.actionTitle)}-connected`;
  let lastObserved:
    | { status: AzureConnectionStatus; panelText: string; candidates: string[]; panelSummaries: string[]; debug?: unknown }
    | undefined;
  let lastObservedLog = '';

  while (dependencies.now() - startedAt < options.timeoutMs) {
    const state = await dependencies.getStatusState();
    const status = getAzureConnectionStatus(state.candidates);
    const observed = {
      status,
      panelText: state.panelText,
      candidates: state.candidates,
      panelSummaries: state.panelSummaries,
      debug: state.debug,
    };
    const serializedObserved = JSON.stringify({
      status: status.kind,
      matchedText: status.matchedText,
      elapsedMs: dependencies.now() - startedAt,
      scopedPanelFound: state.scopedPanelFound,
      settingsStage: options.settingsStage,
      candidates: state.candidates.slice(0, 10),
      panelSummaries: state.panelSummaries.slice(0, 5),
    });
    if (serializedObserved !== lastObservedLog) {
      dependencies.log?.(
        `[workspace-lifecycle] ${options.label}: Azure connection status for ${options.actionTitle}: ${serializedObserved}`
      );
      lastObservedLog = serializedObserved;
    }
    lastObserved = observed;

    if (status.kind === 'error' || status.kind === 'disconnected') {
      throw new Error(
        [
          `${options.label} ${options.actionTitle} connection entered ${status.kind} state after ${dependencies.now() - startedAt}ms.`,
          `Matched text: ${status.matchedText}`,
          `Settings validation stage: ${options.settingsStage}`,
          `Scoped panel text: ${state.panelText.slice(0, 1000)}`,
        ].join('\n')
      );
    }

    if (status.kind === 'connected') {
      const screenshotPath = await dependencies.captureConnectedScreenshot(screenshotName);
      dependencies.log?.(
        `[workspace-lifecycle] ${options.label}: milestone azure-action-connected action=${JSON.stringify(
          options.actionTitle
        )} elapsedMs=${dependencies.now() - startedAt} screenshot=${screenshotPath} settingsStage=${options.settingsStage}`
      );
      return { status, screenshotPath, elapsedMs: dependencies.now() - startedAt };
    }

    await dependencies.sleep(options.pollMs);
  }

  throw new Error(
    [
      `${options.label} ${options.actionTitle} did not reach visible Connected status within ${options.timeoutMs}ms.`,
      `Last status: ${lastObserved?.status.kind ?? 'missing'}`,
      `Matched text: ${lastObserved?.status.matchedText ?? ''}`,
      `Settings validation stage: ${options.settingsStage}`,
      `Last candidates: ${JSON.stringify(lastObserved?.candidates.slice(0, 20) ?? [])}`,
      `Last panel summaries: ${JSON.stringify(lastObserved?.panelSummaries.slice(0, 10) ?? [])}`,
      `Last scoped panel text: ${(lastObserved?.panelText ?? '').slice(0, 1000)}`,
      `Last DOM debug: ${JSON.stringify(lastObserved?.debug ?? {})}`,
    ].join('\n')
  );
}

function sanitizeScreenshotSegment(value: string): string {
  return value
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}
