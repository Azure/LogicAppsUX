import * as assert from 'assert';
import type { CdpConnection } from './cdpClient';
import { clickPoint, type CdpEvaluator, type Point } from './cdpFormHelpers';
import { ProvenDesignerCdpActions } from './designerCdpActions';
import {
  assembleHttpTimeoutComposeCode,
  type HttpTimeoutComposeContext,
  type HttpTimeoutComposeErrorObservation,
  type HttpTimeoutComposeRenderedPage,
  pollHttpTimeoutCompose,
} from './httpTimeoutComposeOracle';
import { boundedCdp } from './workbenchCdpActions';

// Shared CLI input dispatch (native CDP mouse/key events), not DOM .click(),
// React handler invocation, editor-model writes, or extension save-message injection.
const visibleDom = `
  const bounds = (element) => {
    let left = 0, top = 0, right = innerWidth, bottom = innerHeight;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.opacity === '0' || style.visibility === 'hidden' || style.display === 'none') return null;
      const rect = parent.getBoundingClientRect();
      if (/(hidden|clip|auto|scroll)/.test(style.overflowX)) {
        left = Math.max(left, rect.left); right = Math.min(right, rect.right);
      }
      if (/(hidden|clip|auto|scroll)/.test(style.overflowY)) {
        top = Math.max(top, rect.top); bottom = Math.min(bottom, rect.bottom);
      }
    }
    return { left, top, right, bottom };
  };
  const visible = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const clip = bounds(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' &&
      style.visibility !== 'hidden' && style.opacity !== '0' && element.getClientRects().length > 0 &&
      clip && rect.bottom > clip.top && rect.right > clip.left && rect.top < clip.bottom && rect.left < clip.right;
  };
  const fullyVisible = (element) => {
    if (!visible(element)) return false;
    const rect = element.getBoundingClientRect(), clip = bounds(element);
    return clip && rect.left >= clip.left && rect.top >= clip.top && rect.right <= clip.right && rect.bottom <= clip.bottom;
  };
  const normalize = (text) => (text || '').replace(/\\s+/g, ' ').trim();
`;

const httpPanelIdentityDom = `
  const readPanelIdentity = (layout) => {
    const nodePanels = Array.from(layout.querySelectorAll('[id^="msla-node-details-panel-"]')).filter(visible);
    const titleInputs = Array.from(layout.querySelectorAll(
      '.msla-panel-header input[aria-label="Card title"], .msla-panel-header input[id$="-title"]'
    )).filter(visible);
    const nodeId = nodePanels.length === 1
      ? normalize(nodePanels[0].id || '').replace(/^msla-node-details-panel-/, '')
      : '';
    const titleInput = titleInputs.length === 1 ? titleInputs[0] : undefined;
    const title = normalize(
      titleInput instanceof HTMLInputElement ? titleInput.value : titleInput?.getAttribute('value') || ''
    );
    return {
      nodeId,
      title,
      values: [nodeId, title].filter(Boolean),
      isHttp:
        nodePanels.length === 1 &&
        titleInputs.length === 1 &&
        nodeId.toLowerCase() === 'http' &&
        title.toLowerCase() === 'http',
    };
  };
`;

const httpSettingsPanelTimeoutMs = 45_000;
const httpMethodControlSelector = 'input[role="combobox"][aria-label="Method"]';
const httpTimeoutFieldSelector = '[aria-label="Action timeout"], [aria-label="Request options - Timeout"]';
const asyncPatternSwitchSelector = 'input[role="switch"][aria-label="Asynchronous pattern"]';

interface HttpMethodControlObservation {
  selectedNodeIdentity: string[];
  panelCount: number;
  controlCount: number;
  enabled?: boolean;
  value?: string;
  point?: Point;
  reason?: string;
  obstruction?: string;
  fatal?: boolean;
}

interface HttpMethodOptionObservation {
  controlCount: number;
  expandedControlCount: number;
  listboxCount: number;
  optionCount: number;
  options: string[];
  point?: Point;
  reason?: string;
  obstruction?: string;
  fatal?: boolean;
}

interface HttpSettingsPanelObservation {
  httpPanelOpen: boolean;
  selectedNodeIdentity: string[];
  panelText: string;
  tabText: string[];
  settingsPoint?: Point;
  settingsSelected: boolean;
  overlays: string[];
}

interface AsyncPatternSwitchObservation {
  inputCount: number;
  checked?: boolean;
  targetKind?: 'label' | 'indicator';
  targetCount?: number;
  targetText?: string;
  point?: Point;
  reason?: string;
  fatal?: boolean;
}

export class HttpTimeoutComposeDriver extends ProvenDesignerCdpActions {
  private codeEditorObjectId?: string;
  private errorObservationSignature?: string;

  constructor(
    cdp: CdpEvaluator,
    contextId: number,
    deadline: number,
    assertActive: () => void = () => undefined,
    private readonly settingsPanelTimeoutMs = httpSettingsPanelTimeoutMs
  ) {
    super(cdp, contextId, deadline, assertActive);
  }

  override async replaceFocused(value: string): Promise<void> {
    await this.key('KeyA', 'a', 65, 2);
    await this.send('Input.insertText', { text: value });
  }

  override async save(): Promise<void> {
    // V2 does not expose a reliable intermediate Saving state. The caller proves
    // completion from the exact persisted workflow.json definition.
    await this.click('[role="toolbar"] button, button[aria-label="Save"]', ['Save']);
  }

  async selectHttpMethodGet(): Promise<void> {
    const startedAt = Date.now();
    const deadline = Math.min(this.deadline, startedAt + this.settingsPanelTimeoutMs);
    const localCdp = boundedCdp(this.cdp, deadline);
    const localActions = new ProvenDesignerCdpActions(localCdp, this.contextId, deadline, this.assertActive);
    let control: HttpMethodControlObservation = {
      selectedNodeIdentity: [],
      panelCount: 0,
      controlCount: 0,
    };
    let controlDeadlineError: unknown;
    while (Date.now() < deadline) {
      try {
        control = await this.httpMethodControlObservation(localActions);
      } catch (error) {
        if (Date.now() < deadline) {
          throw error;
        }
        controlDeadlineError = error;
        break;
      }
      if (control.fatal) {
        assert.fail(`Cannot open HTTP Method safely. State: ${JSON.stringify(control)}`);
      }
      if (control.point) {
        break;
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining)));
    }
    if (!control.point || Date.now() >= deadline) {
      assert.fail(
        `Timed out waiting for exactly one visible, enabled HTTP Method control. State: ${JSON.stringify(control)}${
          controlDeadlineError ? `. Last bounded error: ${String(controlDeadlineError)}` : ''
        }`
      );
    }

    await clickPoint(localCdp, control.point);

    let option: HttpMethodOptionObservation = {
      controlCount: 0,
      expandedControlCount: 0,
      listboxCount: 0,
      optionCount: 0,
      options: [],
    };
    let optionDeadlineError: unknown;
    while (Date.now() < deadline) {
      try {
        option = await this.httpMethodGetOptionObservation(localActions);
      } catch (error) {
        if (Date.now() < deadline) {
          throw error;
        }
        optionDeadlineError = error;
        break;
      }
      if (option.fatal) {
        assert.fail(`Cannot select HTTP Method GET safely. State: ${JSON.stringify(option)}`);
      }
      if (option.point) {
        break;
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining)));
    }
    if (!option.point || Date.now() >= deadline) {
      assert.fail(
        `Timed out waiting for exactly one visible, enabled HTTP Method GET option. State: ${JSON.stringify(option)}${
          optionDeadlineError ? `. Last bounded error: ${String(optionDeadlineError)}` : ''
        }`
      );
    }

    await clickPoint(localCdp, option.point);
    await pollHttpTimeoutCompose(
      () =>
        localActions.evaluate<HttpMethodControlObservation>(`(() => {
          ${visibleDom}
          ${httpPanelIdentityDom}
          const selectedLayouts = Array.from(document.querySelectorAll('.msla-panel-layout.msla-panel-border-selected')).filter(visible);
          const identities = selectedLayouts.map(readPanelIdentity);
          if (selectedLayouts.length !== 1 || !identities[0].isHttp) {
            return {
              selectedNodeIdentity: identities.flatMap((identity) => identity.values),
              panelCount: selectedLayouts.length,
              controlCount: 0,
            };
          }
          const controls = Array.from(selectedLayouts[0].querySelectorAll(${JSON.stringify(httpMethodControlSelector)})).filter(visible);
          return {
            selectedNodeIdentity: identities[0].values,
            panelCount: 1,
            controlCount: controls.length,
            enabled:
              controls.length === 1 &&
              controls[0] instanceof HTMLInputElement &&
              !controls[0].disabled &&
              controls[0].getAttribute('aria-disabled') !== 'true',
            value: controls.length === 1 && controls[0] instanceof HTMLInputElement ? controls[0].value : undefined,
          };
        })()`),
      (value) => value.panelCount === 1 && value.controlCount === 1 && value.enabled === true && value.value === 'GET',
      deadline,
      'HTTP Method GET selected in the active HTTP panel'
    );
  }

  async configureHttpRequestSettings(timeout: string): Promise<void> {
    const startedAt = Date.now();
    const deadline = Math.min(this.deadline, startedAt + this.settingsPanelTimeoutMs);
    const localCdp = boundedCdp(this.cdp, deadline);
    const localActions = new ProvenDesignerCdpActions(localCdp, this.contextId, deadline, this.assertActive);
    await this.openHttpSettings(localCdp, localActions, startedAt, deadline);
    const requestTimeoutVisible = await localActions.evaluate<boolean>(`Array.from(document.querySelectorAll(${JSON.stringify(
      httpTimeoutFieldSelector
    )})).some((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    })`);
    if (!requestTimeoutVisible) {
      await localActions.click('button[aria-label^="Collapsed Networking"]');
    }
    await localActions.click(httpTimeoutFieldSelector);
    await localActions.replaceFocused(timeout);
    await pollHttpTimeoutCompose(
      () =>
        localActions.evaluate<string | null>(`(() => {
          const field = Array.from(document.querySelectorAll(${JSON.stringify(httpTimeoutFieldSelector)})).find((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
          });
          return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement ? field.value : null;
        })()`),
      (value) => value === timeout,
      deadline,
      `Request options timeout ${timeout}`
    );
    await this.disableAsyncPattern(localCdp, localActions, deadline);
  }

  private async httpMethodControlObservation(localActions: ProvenDesignerCdpActions): Promise<HttpMethodControlObservation> {
    return localActions.evaluate<HttpMethodControlObservation>(`(() => {
      ${visibleDom}
      ${httpPanelIdentityDom}
      const selectedLayouts = Array.from(document.querySelectorAll('.msla-panel-layout.msla-panel-border-selected')).filter(visible);
      const identities = selectedLayouts.map(readPanelIdentity);
      const selectedNodeIdentity = identities.flatMap((identity) => identity.values);
      if (selectedLayouts.length !== 1) {
        return {
          selectedNodeIdentity,
          panelCount: selectedLayouts.length,
          controlCount: 0,
          reason: selectedLayouts.length === 0 ? 'Active node-details panel not found' : 'Active node-details panel was ambiguous',
          fatal: selectedLayouts.length > 1,
        };
      }
      const layout = selectedLayouts[0];
      if (!identities[0].isHttp) {
        return {
          selectedNodeIdentity,
          panelCount: 1,
          controlCount: 0,
          reason: 'Active node-details panel is not HTTP',
          fatal: true,
        };
      }
      const controls = Array.from(layout.querySelectorAll(${JSON.stringify(httpMethodControlSelector)})).filter(visible);
      if (controls.length !== 1) {
        return {
          selectedNodeIdentity,
          panelCount: 1,
          controlCount: controls.length,
          reason: controls.length === 0 ? 'Production HTTP Method combobox not found' : 'Production HTTP Method combobox was ambiguous',
          fatal: controls.length > 1,
        };
      }
      const control = controls[0];
      if (!(control instanceof HTMLInputElement)) {
        return {
          selectedNodeIdentity,
          panelCount: 1,
          controlCount: 1,
          reason: 'Production HTTP Method selector did not resolve to an input',
          fatal: true,
        };
      }
      if (control.disabled || control.getAttribute('aria-disabled') === 'true') {
        return {
          selectedNodeIdentity,
          panelCount: 1,
          controlCount: 1,
          value: control.value,
          reason: 'Production HTTP Method combobox is disabled',
          fatal: true,
        };
      }
      control.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = control.getBoundingClientRect();
      const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const hit = document.elementFromPoint(point.x, point.y);
      const describe = (element) => normalize(
        element?.getAttribute?.('aria-label') || element?.getAttribute?.('role') ||
        element?.textContent || element?.className || ''
      ).slice(0, 240);
      if (hit !== control) {
        return {
          selectedNodeIdentity,
          panelCount: 1,
          controlCount: 1,
          value: control.value,
          reason: 'Production HTTP Method combobox is not hit-testable',
          obstruction: describe(hit),
          fatal: true,
        };
      }
      return {
        selectedNodeIdentity,
        panelCount: 1,
        controlCount: 1,
        value: control.value,
        point,
      };
    })()`);
  }

  private async httpMethodGetOptionObservation(localActions: ProvenDesignerCdpActions): Promise<HttpMethodOptionObservation> {
    return localActions.evaluate<HttpMethodOptionObservation>(`(() => {
      ${visibleDom}
      ${httpPanelIdentityDom}
      const selectedLayouts = Array.from(document.querySelectorAll('.msla-panel-layout.msla-panel-border-selected')).filter(visible);
      const identities = selectedLayouts.map(readPanelIdentity);
      if (selectedLayouts.length !== 1 || !identities[0].isHttp) {
        return {
          controlCount: 0,
          expandedControlCount: 0,
          listboxCount: 0,
          optionCount: 0,
          options: [],
          reason: 'Active HTTP node-details panel changed while opening Method',
          fatal: true,
        };
      }
      const controls = Array.from(selectedLayouts[0].querySelectorAll(${JSON.stringify(httpMethodControlSelector)})).filter(visible);
      if (controls.length !== 1 || !(controls[0] instanceof HTMLInputElement)) {
        return {
          controlCount: controls.length,
          expandedControlCount: 0,
          listboxCount: 0,
          optionCount: 0,
          options: [],
          reason: controls.length === 0
            ? 'HTTP Method combobox became stale or disappeared'
            : 'HTTP Method combobox became ambiguous while opening',
          fatal: true,
        };
      }
      const control = controls[0];
      if (control.disabled || control.getAttribute('aria-disabled') === 'true') {
        return {
          controlCount: 1,
          expandedControlCount: 0,
          listboxCount: 0,
          optionCount: 0,
          options: [],
          reason: 'HTTP Method combobox became disabled while opening',
          fatal: true,
        };
      }
      const expandedControls = Array.from(document.querySelectorAll('[role="combobox"][aria-expanded="true"]')).filter(visible);
      if (expandedControls.length > 1 || (expandedControls.length === 1 && expandedControls[0] !== control)) {
        return {
          controlCount: 1,
          expandedControlCount: expandedControls.length,
          listboxCount: 0,
          optionCount: 0,
          options: [],
          reason: 'Expanded combobox did not uniquely belong to HTTP Method',
          fatal: true,
        };
      }
      if (expandedControls.length === 0) {
        return {
          controlCount: 1,
          expandedControlCount: 0,
          listboxCount: 0,
          optionCount: 0,
          options: [],
          reason: 'HTTP Method combobox has not opened',
        };
      }
      const relationshipIds = ['aria-controls', 'aria-owns']
        .flatMap((attribute) => normalize(control.getAttribute(attribute)).split(/\\s+/))
        .filter(Boolean);
      const ownedIds = Array.from(new Set(relationshipIds));
      if (ownedIds.length === 0) {
        return {
          controlCount: 1,
          expandedControlCount: 1,
          listboxCount: 0,
          optionCount: 0,
          options: [],
          reason: 'HTTP Method listbox relationship is missing',
        };
      }
      const ownedElements = ownedIds.map((id) => document.getElementById(id));
      if (ownedElements.some((element) => !element)) {
        return {
          controlCount: 1,
          expandedControlCount: 1,
          listboxCount: 0,
          optionCount: 0,
          options: [],
          reason: 'HTTP Method listbox relationship is stale',
        };
      }
      if (ownedElements.some((element) => element?.getAttribute('role') !== 'listbox')) {
        return {
          controlCount: 1,
          expandedControlCount: 1,
          listboxCount: 0,
          optionCount: 0,
          options: [],
          reason: 'HTTP Method relationship did not resolve to a listbox',
        };
      }
      if (ownedElements.some((element) => !visible(element))) {
        return {
          controlCount: 1,
          expandedControlCount: 1,
          listboxCount: 0,
          optionCount: 0,
          options: [],
          reason: 'HTTP Method listbox relationship resolved to a hidden listbox',
        };
      }
      const listboxes = ownedElements;
      if (listboxes.length !== 1) {
        return {
          controlCount: 1,
          expandedControlCount: 1,
          listboxCount: listboxes.length,
          optionCount: 0,
          options: [],
          reason: 'HTTP Method listbox relationship was ambiguous',
        };
      }
      const options = Array.from(listboxes[0].querySelectorAll('[role="option"]')).filter(visible);
      const optionText = options.map((option) => normalize(option.textContent));
      const matches = options.filter((option) => normalize(option.textContent) === 'GET');
      if (matches.length !== 1) {
        return {
          controlCount: 1,
          expandedControlCount: 1,
          listboxCount: 1,
          optionCount: matches.length,
          options: optionText,
          reason: matches.length === 0 ? 'Exact HTTP Method GET option not found' : 'Exact HTTP Method GET option was ambiguous',
          fatal: matches.length > 1,
        };
      }
      const option = matches[0];
      if (!(option instanceof HTMLElement)) {
        return {
          controlCount: 1,
          expandedControlCount: 1,
          listboxCount: 1,
          optionCount: 1,
          options: optionText,
          reason: 'HTTP Method GET option was not an HTML element',
          fatal: true,
        };
      }
      if (option.matches(':disabled') || option.getAttribute('aria-disabled') === 'true') {
        return {
          controlCount: 1,
          expandedControlCount: 1,
          listboxCount: 1,
          optionCount: 1,
          options: optionText,
          reason: 'HTTP Method GET option is disabled',
          fatal: true,
        };
      }
      option.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = option.getBoundingClientRect();
      const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const hit = document.elementFromPoint(point.x, point.y);
      const describe = (element) => normalize(
        element?.getAttribute?.('aria-label') || element?.getAttribute?.('role') ||
        element?.textContent || element?.className || ''
      ).slice(0, 240);
      if (!hit || (hit !== option && !option.contains(hit))) {
        return {
          controlCount: 1,
          expandedControlCount: 1,
          listboxCount: 1,
          optionCount: 1,
          options: optionText,
          reason: 'HTTP Method GET option is not hit-testable',
          obstruction: describe(hit),
          fatal: true,
        };
      }
      return {
        controlCount: 1,
        expandedControlCount: 1,
        listboxCount: 1,
        optionCount: 1,
        options: optionText,
        point,
      };
    })()`);
  }

  private async disableAsyncPattern(localCdp: CdpEvaluator, localActions: ProvenDesignerCdpActions, deadline: number): Promise<void> {
    let observation: AsyncPatternSwitchObservation = { inputCount: 0 };
    while (Date.now() < deadline) {
      observation = await localActions.evaluate<AsyncPatternSwitchObservation>(`(() => {
        ${visibleDom}
        const inputs = Array.from(document.querySelectorAll(${JSON.stringify(asyncPatternSwitchSelector)}));
        if (inputs.length !== 1) {
          return {
            inputCount: inputs.length,
            reason: inputs.length === 0
              ? 'Production switch input not found'
              : 'Production switch input was ambiguous',
            fatal: inputs.length > 1,
          };
        }
        const input = inputs[0];
        if (!(input instanceof HTMLInputElement)) {
          return { inputCount: 1, reason: 'Production switch selector did not resolve to an input', fatal: true };
        }
        if (!input.checked) return { inputCount: 1, checked: false };
        if (input.disabled || input.getAttribute('aria-disabled') === 'true') {
          return { inputCount: 1, checked: true, reason: 'Production switch input is disabled', fatal: true };
        }
        const pointFor = (target, acceptInputHit = false) => {
          if (!(target instanceof HTMLElement) || !visible(target) ||
            target.matches(':disabled') || target.getAttribute('aria-disabled') === 'true') {
            return undefined;
          }
          target.scrollIntoView({ block: 'center', inline: 'center' });
          const rect = target.getBoundingClientRect();
          const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          const hit = document.elementFromPoint(point.x, point.y);
          return hit && (hit === target || target.contains(hit) || (acceptInputHit && hit === input)) ? point : undefined;
        };
        const describe = (target) => normalize(
          target?.getAttribute('aria-label') || target?.textContent || target?.className || ''
        ).slice(0, 240);
        const preferredLabel = input.labels?.[0];
        const labels = Array.from(input.labels || []).filter(visible);
        if (labels.length > 1) {
          return {
            inputCount: 1,
            checked: true,
            targetKind: 'label',
            targetCount: labels.length,
            reason: 'Visible associated switch label was ambiguous',
            fatal: true,
          };
        }
        if (labels.length === 1) {
          const target = preferredLabel && labels.includes(preferredLabel) ? preferredLabel : labels[0];
          const point = pointFor(target);
          return {
            inputCount: 1,
            checked: true,
            targetKind: 'label',
            targetCount: 1,
            targetText: describe(target),
            point,
            reason: point ? undefined : 'Visible associated switch label was not enabled and hit-testable',
          };
        }
        const switchRoot = input.closest('.fui-Switch');
        const indicators = switchRoot
          ? Array.from(switchRoot.querySelectorAll('.fui-Switch__indicator')).filter(visible)
          : [];
        if (indicators.length > 1) {
          return {
            inputCount: 1,
            checked: true,
            targetKind: 'indicator',
            targetCount: indicators.length,
            reason: 'Visible Fluent switch indicator was ambiguous',
            fatal: true,
          };
        }
        if (indicators.length === 1) {
          const point = pointFor(indicators[0], true);
          return {
            inputCount: 1,
            checked: true,
            targetKind: 'indicator',
            targetCount: 1,
            targetText: describe(indicators[0]),
            point,
            reason: point ? undefined : 'Visible Fluent switch indicator was not enabled and hit-testable',
          };
        }
        return {
          inputCount: 1,
          checked: true,
          targetCount: 0,
          reason: 'No visible associated label or Fluent switch indicator found',
        };
      })()`);
      if (observation.fatal) {
        assert.fail(`Cannot disable Asynchronous pattern safely. State: ${JSON.stringify(observation)}`);
      }
      if (observation.checked === false) {
        return;
      }
      if (observation.point) {
        await clickPoint(localCdp, observation.point);
        break;
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining)));
    }
    if (!observation.point) {
      assert.fail(
        `Timed out waiting for one visible, enabled, hit-testable Asynchronous pattern target. State: ${JSON.stringify(observation)}`
      );
    }
    await pollHttpTimeoutCompose(
      () =>
        localActions.evaluate<{ inputCount: number; checked?: boolean }>(`(() => {
          const inputs = Array.from(document.querySelectorAll(${JSON.stringify(asyncPatternSwitchSelector)}));
          return inputs.length === 1 && inputs[0] instanceof HTMLInputElement
            ? { inputCount: 1, checked: inputs[0].checked }
            : { inputCount: inputs.length };
        })()`),
      (value) => value.inputCount === 1 && value.checked === false,
      deadline,
      'disabled Asynchronous pattern'
    );
  }

  private async openHttpSettings(
    localCdp: CdpEvaluator,
    localActions: ProvenDesignerCdpActions,
    startedAt: number,
    deadline: number
  ): Promise<void> {
    let observation: HttpSettingsPanelObservation = {
      httpPanelOpen: false,
      selectedNodeIdentity: [],
      panelText: '',
      tabText: [],
      settingsSelected: false,
      overlays: [],
    };
    let panelStateObserved = false;
    let settingsClickDispatched = false;
    let lastError: unknown;
    while (Date.now() < deadline) {
      try {
        observation = await this.httpSettingsPanelObservation(localCdp);
        if (!panelStateObserved) {
          console.log(`[http-timeout][http-panel] initial ${JSON.stringify(observation)}`);
          panelStateObserved = true;
          if (observation.httpPanelOpen) {
            console.log('[http-timeout][http-panel] HTTP node-details panel is already open; preserving current selection');
          } else {
            console.log('[http-timeout][http-panel] HTTP node-details panel is closed; opening HTTP through proven CDP node interaction');
            await localActions.clickNode(['HTTP']);
            continue;
          }
        }
        if (observation.httpPanelOpen && observation.settingsPoint) {
          if (observation.settingsSelected) {
            console.log(
              `[http-timeout][http-panel] Settings ready elapsedMs=${Date.now() - startedAt} selected=${JSON.stringify(
                observation.selectedNodeIdentity
              )} tabs=${JSON.stringify(observation.tabText)} overlays=${JSON.stringify(observation.overlays)}`
            );
            return;
          }
          if (!settingsClickDispatched) {
            console.log(
              `[http-timeout][http-panel] Clicking scoped Settings tab selected=${JSON.stringify(
                observation.selectedNodeIdentity
              )} tabs=${JSON.stringify(observation.tabText)}`
            );
            await clickPoint(localCdp, observation.settingsPoint);
            settingsClickDispatched = true;
          }
        }
      } catch (error) {
        lastError = error;
      }

      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(200, remaining)));
    }

    assert.fail(
      `Timed out after ${Date.now() - startedAt}ms waiting for a visible hit-tested Settings tab inside the active HTTP node-details panel. selectedNodeIdentity=${JSON.stringify(observation.selectedNodeIdentity)} panelText=${JSON.stringify(
        observation.panelText
      )} tabs=${JSON.stringify(observation.tabText)} overlays=${JSON.stringify(observation.overlays)}${
        lastError ? ` lastError=${String(lastError)}` : ''
      }`
    );
  }

  private async httpSettingsPanelObservation(cdp: CdpEvaluator): Promise<HttpSettingsPanelObservation> {
    this.assertActive();
    return cdp.evaluate<HttpSettingsPanelObservation>(
      this.contextId,
      `(() => {
      ${visibleDom}
      ${httpPanelIdentityDom}
      const selectedLayouts = Array.from(document.querySelectorAll('.msla-panel-layout.msla-panel-border-selected'))
        .filter(visible)
        .map((layout) => {
          return { layout, ...readPanelIdentity(layout) };
        });
      const httpPanels = selectedLayouts.filter((entry) => entry.isHttp);
      const active = httpPanels.length === 1 ? httpPanels[0] : undefined;
      const tabs = active ? Array.from(active.layout.querySelectorAll('[role="tab"]')).filter(visible) : [];
      const tabIdentity = (tab) => [
        tab.textContent,
        tab.getAttribute('aria-label'),
        tab.getAttribute('title')
      ].map(normalize).find(Boolean) || '';
      const settings = tabs.find((tab) => tabIdentity(tab).toLowerCase().startsWith('settings'));
      let settingsPoint;
      if (settings instanceof HTMLElement && !settings.disabled && settings.getAttribute('aria-disabled') !== 'true') {
        settings.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = settings.getBoundingClientRect();
        const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const hit = document.elementFromPoint(point.x, point.y);
        if (hit && (hit === settings || settings.contains(hit))) {
          settingsPoint = point;
        }
      }
      const overlays = Array.from(document.querySelectorAll(
        '[role="menu"], .fui-MenuPopover, [role="dialog"], .fui-PopoverSurface, .ms-Callout'
      )).filter(visible).slice(0, 12).map((element) => {
        const label = normalize(
          element.getAttribute('aria-label') || element.getAttribute('data-automation-id') ||
          element.textContent || element.className || element.getAttribute('role') || ''
        );
        return label.slice(0, 240);
      });
      return {
        httpPanelOpen: !!active,
        selectedNodeIdentity: selectedLayouts.flatMap((entry) => entry.values),
        panelText: selectedLayouts.map((entry) => normalize(entry.layout.textContent).slice(0, 1200)).join(' || '),
        tabText: tabs.map(tabIdentity).filter(Boolean),
        settingsPoint,
        settingsSelected: settings?.getAttribute('aria-selected') === 'true',
        overlays,
      };
    })()`
    );
  }

  async visibleValidationMessages(): Promise<string[]> {
    return this.evaluate<string[]>(`(() => {
      const normalize = (text) => (text || '').replace(/\\s+/g, ' ').trim();
      const visible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' &&
          style.visibility !== 'hidden' && style.opacity !== '0';
      };
      return Array.from(document.querySelectorAll('[role="alert"], [aria-live], [class*="error"], [class*="Error"]'))
        .filter(visible)
        .flatMap((element) => (element.innerText || '').split(/\\r?\\n/).map(normalize))
        .filter(Boolean);
    })()`);
  }

  async saveEnabled(): Promise<boolean> {
    return this.evaluate<boolean>(`(() => {
      const normalize = (text) => (text || '').replace(/\\s+/g, ' ').trim();
      const button = Array.from(document.querySelectorAll('[role="toolbar"] button, button[aria-label="Save"]'))
        .find((element) => normalize(element.getAttribute('aria-label') || element.textContent) === 'Save');
      return button instanceof HTMLButtonElement && !button.disabled && button.getAttribute('aria-disabled') !== 'true';
    })()`);
  }

  async readCode(): Promise<string> {
    // MonacoEditor is a compatibility export of CodeMirrorEditor. Read only
    // actual .cm-line/gutter DOM, including viewport overlap, never EditorState.
    await this.focusCode();
    await this.key('End', 'End', 35, 2);
    const end = await this.codePage((page) => page.atLineEnd && page.selectionLine === Math.max(...page.lines.map((line) => line.number)));
    const endLine = Math.max(...end.lines.map((line) => line.number));
    await this.key('Home', 'Home', 36, 2);
    const pages: HttpTimeoutComposeRenderedPage[] = [end];
    let page = await this.codePage(
      (candidate) => candidate.atLineStart && candidate.selectionLine === 1 && candidate.lines.some((line) => line.number === 1)
    );
    while (true) {
      pages.push(page);
      const last = Math.max(...page.lines.map((line) => line.number));
      if (last === endLine) {
        break;
      }
      assert.ok(last < endLine, 'Code EOF changed while reading');
      const priorSelection = page.selectionLine;
      await this.key('PageDown', 'PageDown', 34);
      // CodeMirror can buffer more than a screen. A page movement may keep
      // identical rendered bounds; advance only after the actual DOM caret moved.
      page = await this.codePage((candidate) => candidate.selectionLine > priorSelection);
    }
    await this.key('End', 'End', 35, 2);
    const endAgain = await this.codePage((candidate) => candidate.atLineEnd && candidate.selectionLine === endLine);
    return assembleHttpTimeoutComposeCode([...pages, endAgain], endLine);
  }

  async replaceCode(value: string): Promise<void> {
    await this.focusCode();
    await this.replaceFocused(value);
  }

  private async focusCode(): Promise<void> {
    await this.click('.cm-editor');
    await pollHttpTimeoutCompose(
      () =>
        this.evaluate<boolean>(`(() => {
        ${visibleDom}
        const editors = Array.from(document.querySelectorAll('.cm-editor')).filter(visible);
        const content = editors.length === 1 ? editors[0].querySelector('.cm-content') : null;
        return !!content && content === document.activeElement &&
          content.getAttribute('contenteditable') === 'true' && content.getAttribute('aria-readonly') !== 'true';
      })()`),
      Boolean,
      this.deadline,
      'focused writable production CodeMirror editor'
    );
    if (!this.codeEditorObjectId) {
      const response = (await this.send('Runtime.evaluate', {
        contextId: this.contextId,
        expression: `(() => {
          ${visibleDom}
          const editors = Array.from(document.querySelectorAll('.cm-editor')).filter(visible);
          return editors.length === 1 ? editors[0] : null;
        })()`,
        returnByValue: false,
      })) as { result?: { result?: { objectId?: string } } };
      this.codeEditorObjectId = response.result?.result?.objectId;
      assert.ok(this.codeEditorObjectId, 'CodeMirror DOM object identity missing');
    }
    await this.assertCodeEditorIdentity();
  }

  private async assertCodeEditorIdentity(): Promise<void> {
    const response = (await this.send('Runtime.callFunctionOn', {
      objectId: this.codeEditorObjectId,
      functionDeclaration: `function() {
        ${visibleDom}
        const editors = Array.from(document.querySelectorAll('.cm-editor')).filter(visible);
        return this.isConnected && editors.length === 1 && editors[0] === this &&
          this.querySelector('.cm-content') === document.activeElement;
      }`,
      returnByValue: true,
    })) as { result?: { result?: { value?: boolean } } };
    assert.strictEqual(response.result?.result?.value, true, 'Bound CodeMirror editor changed, detached or lost focus');
  }

  private async codePage(
    ready: (page: HttpTimeoutComposeRenderedPage & { selectionLine: number; atLineStart: boolean; atLineEnd: boolean }) => boolean
  ): Promise<HttpTimeoutComposeRenderedPage & { selectionLine: number; atLineStart: boolean; atLineEnd: boolean }> {
    let previous = '';
    return pollHttpTimeoutCompose(
      async () => {
        await this.assertCodeEditorIdentity();
        const page = await this.evaluate<
          HttpTimeoutComposeRenderedPage & {
            selectionLine: number;
            atLineStart: boolean;
            atLineEnd: boolean;
          }
        >(`(() => {
        ${visibleDom}
        const editors = Array.from(document.querySelectorAll('.cm-editor')).filter(visible);
        if (editors.length !== 1) return { editorId: '', lines: [], selectionLine: 0 };
        const editor = editors[0];
        const content = editor.querySelector('.cm-content');
        const numbers = Array.from(editor.querySelectorAll('.cm-lineNumbers .cm-gutterElement'))
          .filter(number => {
            const style = getComputedStyle(number);
            // CodeMirror's numeric width spacer is hidden and zero-height.
            // Keep offscreen rendered rows, but never confuse that spacer for a line.
            return /^[1-9]\\d*$/.test(number.textContent || '') &&
              style.display !== 'none' && style.visibility !== 'hidden' &&
              number.getBoundingClientRect().height > 0;
          });
        const lineElements = Array.from(content?.querySelectorAll('.cm-line') || []);
        const lineNumber = line => {
          const top = line.getBoundingClientRect().top;
          const matches = numbers.filter(number => Math.abs(number.getBoundingClientRect().top - top) < 2);
          return matches.length === 1 ? Number(matches[0].textContent) : 0;
        };
        const lines = lineElements.map(line => {
          return { number: lineNumber(line), text: line.textContent || '' };
        });
        const selection = document.getSelection();
        const focus = selection?.focusNode;
        const focusElement = focus?.nodeType === Node.ELEMENT_NODE ? focus : focus?.parentElement;
        const selectedLine = focusElement?.closest('.cm-line');
        let offset = -1;
        if (selectedLine && content?.contains(selectedLine)) {
          const range = document.createRange();
          range.setStart(selectedLine, 0);
          range.setEnd(focus, selection.focusOffset);
          offset = range.toString().length;
        }
        return {
          editorId: 'CodeMirror',
          lines,
          selectionLine: selectedLine ? lineNumber(selectedLine) : 0,
          atLineStart: offset === 0,
          atLineEnd: offset >= 0 && offset === (selectedLine?.textContent || '').length,
        };
      })()`);
        return { ...page, editorId: this.codeEditorObjectId ?? '' };
      },
      (page) => {
        const current = JSON.stringify(page);
        const stable = current === previous;
        previous = current;
        return stable && !!page.editorId && ready(page);
      },
      this.deadline,
      'complete stable CodeMirror rendered page and caret'
    );
  }

  async context(): Promise<HttpTimeoutComposeContext> {
    const cdp = this.cdp as CdpConnection;
    assert.ok(cdp.targetId, 'Designer CDP target identity missing');
    const frameId = cdp.getExecutionContextFrameId(this.contextId);
    assert.ok(frameId, 'Designer frame identity missing');
    const documentOrigin = await this.evaluate<number>('performance.timeOrigin');
    assert.ok(Number.isFinite(documentOrigin) && documentOrigin > 0, 'Designer document origin missing');
    return { targetId: cdp.targetId, contextId: this.contextId, frameId, documentOrigin };
  }

  async errorObservation(): Promise<HttpTimeoutComposeErrorObservation> {
    const context = await this.context();
    const state = await this.evaluate<{
      visible: boolean;
      messages: string[];
      candidates: Array<{
        text: string;
        visible: boolean;
        fullyVisible: boolean;
        rect: { left: number; top: number; right: number; bottom: number; width: number; height: number };
        display: string;
        visibility: string;
        whiteSpace: string;
        overflowWrap: string;
      }>;
      renderedValidationErrors: string | null;
    }>(`(() => {
      ${visibleDom}
      const candidates = Array.from(document.querySelectorAll(
        '[role="alert"], [aria-live], .ms-MessageBar, [class*="error"], [class*="Error"]'
      )).filter(element => !element.closest('.monaco-editor, .cm-editor')).map(element => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          text: normalize(element.innerText || ''),
          visible: visible(element),
          fullyVisible: fullyVisible(element),
          rect: {
            left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
            width: rect.width, height: rect.height
          },
          display: style.display,
          visibility: style.visibility,
          whiteSpace: style.whiteSpace,
          overflowWrap: style.overflowWrap
        };
      });
      const messages = Array.from(document.querySelectorAll(
        '[role="alert"], [aria-live], .ms-MessageBar, [class*="error"], [class*="Error"]'
      )).filter(fullyVisible).filter(element => !element.closest('.monaco-editor, .cm-editor'))
        .filter(element => Array.from(element.querySelectorAll('*')).every(child => {
          if (!(child.textContent || '').trim()) return true;
          const style = getComputedStyle(child);
          return style.display === 'none' || style.visibility === 'hidden' || fullyVisible(child);
        }))
        .flatMap(element => (element.innerText || '').split(/\\r?\\n/).map(normalize)).filter(Boolean);
      const renderedValidationErrors =
        document.querySelector('[data-code-view-validation-errors]')?.getAttribute('data-code-view-validation-errors') ?? null;
      return { visible: document.visibilityState === 'visible', messages, candidates, renderedValidationErrors };
    })()`);
    const { candidates, renderedValidationErrors, ...visibleState } = state;
    const observation = { ...context, ...visibleState, activeDesigner: true }; // assertActive() precedes every read.
    const signature = JSON.stringify({ ...observation, candidates, renderedValidationErrors });
    if (signature !== this.errorObservationSignature) {
      console.log(`[http-timeout-compose][error-observation] ${signature}`);
      this.errorObservationSignature = signature;
    }
    return observation;
  }
}
