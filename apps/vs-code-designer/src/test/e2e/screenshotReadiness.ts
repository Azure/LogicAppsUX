export type ScreenshotClassification = 'evidence' | 'diagnostic';

export interface ScreenshotFieldExpectation {
  labels: string[];
  value?: string;
  validationMessage?: string;
  exactAriaLabel?: string;
  sectionTitle?: string;
}

export interface ScreenshotSwitchExpectation {
  labels: string[];
  checked: boolean;
  exactAriaLabel?: string;
  sectionTitle?: string;
  stateText?: string;
}

export type ScreenshotExpectation =
  | { kind: 'workbenchShell'; label: string }
  | {
      kind: 'createWorkspace';
      label: string;
      stage: 'initial' | 'partial-fields' | 'fields-valid' | 'review' | 'created' | 'scrolled' | 'validation';
      fields?: ScreenshotFieldExpectation[];
      nextButton?: 'enabled' | 'disabled';
      createButton?: 'enabled' | 'disabled';
      requiredText?: string[];
      scrollPosition?: 'top' | 'middle' | 'bottom' | { target?: 'window' | 'largest-scrollable'; minY?: number; maxY?: number };
    }
  | { kind: 'designerCanvas'; label: string; requiredNodes?: Array<string | string[]>; allowLoading?: boolean }
  | { kind: 'designerValidationError'; label: string; message: string }
  | {
      kind: 'designerPanel';
      label: string;
      actionTitle: string;
      requiredText?: string[];
      fields?: ScreenshotFieldExpectation[];
      switches?: ScreenshotSwitchExpectation[];
      editor?: { labels: string[]; focused?: boolean; token?: { titles: string[]; sourceAction: string } };
      picker?: { sectionLabels: string[]; tokenTitles?: string[] };
      allowLoading?: boolean;
    }
  | {
      kind: 'overview';
      label: string;
      workflowName?: string;
      runName?: string;
      runStatus?: 'Running' | 'Succeeded' | 'Failed' | 'Cancelled' | 'Waiting';
    }
  | {
      kind: 'monitoringAction';
      label: string;
      actionTitle: string;
      expectedStatus?: string;
      expectedValues?: string[];
      allowLoading?: boolean;
    }
  | { kind: 'generatedArtifacts'; label: string }
  | { kind: 'discovery'; label: string; searchText?: string; allowLoading?: boolean }
  | { kind: 'debug'; label: string; allowLoading?: boolean }
  | { kind: 'diagnostic'; label: string; reason: string };

export interface ScreenshotReadinessSnapshot {
  ready: boolean;
  reasonCodes: string[];
  blockers: string[];
  anchors: Array<{ name: string; visible: boolean; bounds?: ScreenshotBounds }>;
  viewport: ScreenshotViewport;
  counts: Record<string, number>;
  details?: Record<string, unknown>;
  generation: number;
  revision: number;
  structuralRevision?: number;
  scrollY: number;
  expectationKind: ScreenshotExpectation['kind'];
}

export interface ScreenshotBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ScreenshotViewport {
  width: number;
  height: number;
  deviceScaleFactor: number;
}

export interface ScreenshotReadinessMetadata {
  schemaVersion: 1;
  checkpoint: string;
  phase: string;
  classification: ScreenshotClassification;
  verdict: 'accepted' | 'diagnostic' | 'disabled' | 'failed';
  target: {
    owner: 'workbench';
    opaqueTargetId: string;
    opaqueFrameId: string;
    generation: number;
  };
  timing: {
    timeoutMs: number;
    elapsedMs: number;
    samples: number;
    captureAttempts: number;
  };
  geometry: {
    viewport: ScreenshotViewport;
    anchors: Array<{ name: string; bounds?: ScreenshotBounds }>;
  };
  counts: Record<string, number>;
  reasonCodes: string[];
  events?: ScreenshotCaptureEvent[];
}

export interface ScreenshotCaptureEvent {
  name: string;
  elapsedMs: number;
  attempt?: number;
  generation?: number;
  revision?: number;
  structuralRevision?: number;
  ownerRevision?: number;
  reasonCodes?: string[];
  blockers?: string[];
  counts?: Record<string, number>;
  anchors?: Array<{ name: string; bounds?: ScreenshotBounds }>;
  details?: Record<string, unknown>;
}

export const installScreenshotInvalidationLatchExpression = `
(() => {
  const key = '__logicAppsScreenshotInvalidation';
  const existing = globalThis[key];
  if (existing?.dispose) {
    existing.dispose();
  }
  const state = {
    revision: 0,
    structuralRevision: 0,
    disposed: false,
    root: undefined,
    rootSignature: undefined,
    rootOccluder: undefined,
    ancestorChain: [],
    animationFrame: undefined,
    reasons: [],
    bump(reason, structural) {
      if (this.disposed) {
        return;
      }
      this.revision += 1;
      if (structural) {
        this.structuralRevision += 1;
      }
      if (this.reasons.length < 12) {
        this.reasons.push(String(reason || 'unknown').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80));
      }
    },
    dispose() {
      this.disposed = true;
      this.observer?.disconnect();
      this.ancestorObserver?.disconnect();
      if (this.animationFrame !== undefined) {
        globalThis.cancelAnimationFrame?.(this.animationFrame);
      }
      globalThis.removeEventListener?.('scroll', this.onScroll, true);
      globalThis.removeEventListener?.('resize', this.onResize, true);
    },
    setRoot(root) {
      if (!root || this.root === root || this.disposed) {
        return;
      }
      this.root = root;
      this.rootSignature = this.readRootSignature(root);
      this.rootOccluder = this.readOccluder(root);
      this.observer?.disconnect();
      this.ancestorObserver?.disconnect();
      this.observer?.observe(root, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
      });
      this.ancestorChain = [];
      let ancestor = root.parentElement;
      while (ancestor) {
        this.ancestorChain.push(ancestor);
        this.ancestorObserver?.observe(ancestor, {
          attributes: true,
          attributeFilter: ['aria-hidden', 'class', 'hidden', 'style'],
          childList: true,
        });
        ancestor = ancestor.parentElement;
      }
      this.watchGeometry();
      this.bump('scope-root-changed');
    },
    isInScope(target) {
      return !this.root || target === this.root || this.root.contains?.(target);
    },
    readRootSignature(root) {
      if (!root?.getBoundingClientRect) {
        return '';
      }
      const rect = root.getBoundingClientRect();
      const viewport = globalThis.visualViewport;
      const visibility = [];
      let current = root;
      while (current) {
        const style = current instanceof HTMLElement ? getComputedStyle(current) : undefined;
        visibility.push([
          current === root ? 'root' : 'ancestor',
          current.isConnected === false ? 'detached' : 'connected',
          current.hidden ? 'hidden' : 'shown',
          current.getAttribute?.('aria-hidden') || '',
          style?.display || '',
          style?.visibility || '',
          style?.opacity || '',
        ].join('/'));
        current = current.parentElement;
      }
      return [
        Math.round(rect.left),
        Math.round(rect.top),
        Math.round(rect.width),
        Math.round(rect.height),
        Math.round(globalThis.scrollX || 0),
        Math.round(globalThis.scrollY || 0),
        Math.round(viewport?.offsetLeft || 0),
        Math.round(viewport?.offsetTop || 0),
        Math.round(viewport?.width || globalThis.innerWidth || 0),
        Math.round(viewport?.height || globalThis.innerHeight || 0),
        visibility.join('|'),
      ].join(':');
    },
    readOccluder(root) {
      if (!root?.getBoundingClientRect || !document.elementFromPoint) {
        return '';
      }
      const rect = root.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return 'root-empty';
      }
      const x = Math.min(Math.max(rect.left + rect.width / 2, 0), Math.max(globalThis.innerWidth - 1, 0));
      const y = Math.min(Math.max(rect.top + rect.height / 2, 0), Math.max(globalThis.innerHeight - 1, 0));
      const topElement = document.elementFromPoint(x, y);
      if (!topElement) {
        return 'no-top-element';
      }
      if (topElement === root || root.contains?.(topElement)) {
        return 'in-scope';
      }
      return 'occluded';
    },
    watchGeometry() {
      if (this.animationFrame !== undefined || this.disposed || !globalThis.requestAnimationFrame) {
        return;
      }
      const tick = () => {
        this.animationFrame = undefined;
        if (this.disposed) {
          return;
        }
        if (this.root) {
          const nextSignature = this.readRootSignature(this.root);
          if (this.rootSignature && nextSignature !== this.rootSignature) {
            this.rootSignature = nextSignature;
            this.bump('root-geometry', true);
          }
          const nextOccluder = this.readOccluder(this.root);
          if (this.rootOccluder && nextOccluder !== this.rootOccluder) {
            this.rootOccluder = nextOccluder;
            this.bump('root-occlusion', true);
          }
        }
        this.animationFrame = requestAnimationFrame(tick);
      };
      this.animationFrame = requestAnimationFrame(tick);
    },
  };
  state.onScroll = (event) => {
    if (state.isInScope(event?.target)) {
      state.bump('scroll');
    }
  };
  state.onResize = () => state.bump('resize');
  state.observer = new MutationObserver((mutations) => {
    if (!mutations.some((mutation) => state.isInScope(mutation.target))) {
      return;
    }
    const touchesStructuralShell = (mutation) => mutation.target === state.root || state.ancestorChain.includes(mutation.target);
    const structurallyRelevant = mutations.some(touchesStructuralShell);
    if (mutations.some((mutation) => mutation.type === 'childList')) {
      state.bump('child-list', structurallyRelevant);
      return;
    }
    if (mutations.some((mutation) => mutation.type === 'attributes')) {
      state.bump('attributes', structurallyRelevant);
      return;
    }
    state.bump('character-data');
  });
  state.ancestorObserver = new MutationObserver((mutations) => {
    if (!state.root) {
      return;
    }
    const touchesRoot = (node) =>
      node === state.root || state.root?.contains?.(node) || state.ancestorChain.includes(node) || node?.contains?.(state.root);
    if (
      !mutations.some((mutation) => {
        if (touchesRoot(mutation.target)) {
          return true;
        }
        const removed = Array.from(mutation.removedNodes || []);
        const added = Array.from(mutation.addedNodes || []);
        return removed.some(touchesRoot) || added.some(touchesRoot);
      })
    ) {
      return;
    }
    if (mutations.some((mutation) => mutation.type === 'childList')) {
      state.bump('root-ancestor-child-list', true);
      return;
    }
    state.bump('root-ancestor-attributes', true);
  });
  globalThis.addEventListener?.('scroll', state.onScroll, true);
  globalThis.addEventListener?.('resize', state.onResize, true);
  globalThis[key] = state;
  return { revision: state.revision };
})()
`;

export const disposeScreenshotInvalidationLatchExpression = `
(() => {
  const state = globalThis.__logicAppsScreenshotInvalidation;
  if (state?.dispose) {
    state.dispose();
  }
  delete globalThis.__logicAppsScreenshotInvalidation;
  return true;
})()
`;

export const screenshotReadinessDomScript = `
(() => {
  const expectation = __EXPECTATION__;
  const generation = __GENERATION__;
  const invalidation = globalThis.__logicAppsScreenshotInvalidation;
  const revision = invalidation?.revision ?? __REVISION__;
  const structuralRevision = invalidation?.structuralRevision ?? revision;
  const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
  const normalizedIncludes = (source, expected) => normalize(source).toLowerCase().includes(normalize(expected).toLowerCase());
  const hasVisibleStyle = (element) => {
    let current = element;
    while (current instanceof HTMLElement) {
      if (current.hidden || current.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      const style = current.ownerDocument?.defaultView?.getComputedStyle?.(current) ?? getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
        return false;
      }
      if (Number.parseFloat(style.opacity || '1') === 0) {
        return false;
      }
      current = current.parentElement;
    }
    return true;
  };
  const intersectsViewport = (element) => {
    if (!element?.getClientRects) {
      return false;
    }
    const rects = Array.from(element.getClientRects());
    return rects.some((rect) => rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth);
  };
  const isVisible = (element) =>
    !!(element && hasVisibleStyle(element) && (element.offsetWidth || element.offsetHeight || element.getClientRects().length) && intersectsViewport(element));
  const bounds = (element) => {
    if (!(element instanceof HTMLElement) || !isVisible(element)) {
      return undefined;
    }
    const rect = element.getBoundingClientRect();
    return {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  };
  const visibleText = (root) => normalize(root?.innerText || root?.textContent || '');
  const visibleElements = (selector) => Array.from(document.querySelectorAll(selector)).filter(isVisible);
  const text = visibleText(document.body);
  const lowerText = text.toLowerCase();
  const bodyBounds = bounds(document.body);
  const activeTab = visibleElements(
    [
      '.editor-group-container .tabs-container [role="tab"][aria-selected="true"]',
      '.editor-group-container .tabs-container .tab.active',
      '.editor-group-container .tabs-container .tab.selected',
      '.editor-group-container [role="tab"][aria-selected="true"]',
      '.tabs-container [role="tab"][aria-selected="true"]',
      '.tabs-container .tab.active',
      '.tabs-container .tab.selected',
    ].join(', ')
  ).at(-1);
  const activeTabText = visibleText(activeTab);
  const visibleFrames = visibleElements('iframe').filter((frame) => frame instanceof HTMLIFrameElement);
  const loaderSelector =
    '.monaco-progress-container, .codicon-loading, .ms-Spinner, .fui-Spinner, [aria-busy="true"], [role="progressbar"], [class*="spinner"], [class*="loading"]';
  const documentLoaders = visibleElements(loaderSelector);
  const blankWorkbench = text.length < 20 && visibleFrames.length === 0;
  const workbenchShell = visibleElements('.monaco-workbench').at(-1);
  const workbenchParts = visibleElements(
    '[id^="workbench.parts."], .activitybar, .sidebar, .editor, .editor-group-container, .statusbar, .statusbar-item'
  );
  const workbenchShellParts = visibleElements(
    '.monaco-workbench, .activitybar, .sidebar, .editor, .editor-group-container, .part.editor, [id="workbench.parts.editor"], [id="workbench.parts.activitybar"], [id="workbench.parts.sidebar"]'
  );
  const anchors = [];
  const addAnchor = (name, element) => {
    anchors.push({ name, visible: !!element && isVisible(element), bounds: bounds(element) });
  };
  addAnchor('body', document.body);
  addAnchor('activeTab', activeTab);
  addAnchor('workbenchShell', workbenchShell);

  const canvasNodes = visibleElements('[data-automation-id^="msla-node"], [id^="msla-node"], [data-testid*="node"], .msla-card, .react-flow__node');
  const designerCanvas = visibleElements('.react-flow, .msla-designer-canvas, [data-automation-id="msla-designer-canvas"]').at(-1);
  addAnchor('designerCanvas', designerCanvas);
  const selectedLayouts = visibleElements('.msla-panel-layout.msla-panel-border-selected')
    .map((layout) => {
      const nodePanels = Array.from(layout.querySelectorAll('[id^="msla-node-details-panel-"]')).filter(isVisible);
      const content =
        nodePanels[0] ||
        Array.from(layout.querySelectorAll('.msla-panel-content-container, .msla-node-details-panel')).find(isVisible);
      const titleInputs = Array.from(
        layout.querySelectorAll('.msla-panel-header input[aria-label="Card title"], .msla-panel-header input[id$="-title"]')
      ).filter(isVisible);
      const headerTitleElements = Array.from(
        layout.querySelectorAll(
          [
            '.msla-panel-header .msla-panel-card-title-container',
            '.msla-panel-header [data-automation-id*="panel-header-title"]',
            '.msla-panel-header [data-testid*="panel-header-title"]',
            '.msla-panel-header [role="heading"]',
            '.msla-panel-header h1',
            '.msla-panel-header h2',
            '.msla-panel-header h3',
          ].join(', ')
        )
      ).filter(isVisible);
      const nodePanel = nodePanels[0];
      const panelId = nodePanel?.id || '';
      const nodeId = panelId.replace(/^msla-node-details-panel-/, '');
      return {
        layout,
        rect: layout.getBoundingClientRect(),
        content,
        nodeId,
        titles: Array.from(
          new Set(
            titleInputs
              .map((titleInput) =>
                normalize(titleInput instanceof HTMLInputElement ? titleInput.value : titleInput?.getAttribute('value') || '')
              )
              .filter(Boolean)
          )
        ),
        headerTitles: Array.from(new Set(headerTitleElements.map(visibleText).map(normalize).filter(Boolean))),
        text: visibleText(layout),
      };
    })
    .filter(({ content, rect }) => !!content && rect.width > 200 && rect.height > 100);
  const selectedPanel = selectedLayouts.length === 1 ? selectedLayouts[0] : undefined;
  const panels = visibleElements('[id^="msla-node-details-panel"], .msla-node-details-panel, .msla-panel-container, [class*="node-details-panel"]');
  addAnchor('selectedPanelLayout', selectedPanel?.layout);
  const createWorkspaceRoot = visibleElements('.monaco-workbench, body').at(-1);
  const readinessRoot =
    expectation.kind === 'designerCanvas' || expectation.kind === 'discovery'
      ? designerCanvas || createWorkspaceRoot || document.body
      : selectedPanel?.layout || designerCanvas || createWorkspaceRoot || document.body;
  invalidation?.setRoot?.(readinessRoot);
  const rootRect = readinessRoot?.getBoundingClientRect?.();
  const rectsOverlap = (first, second) =>
    !!(
      first &&
      second &&
      first.width > 0 &&
      first.height > 0 &&
      second.width > 0 &&
      second.height > 0 &&
      first.left < second.right &&
      first.right > second.left &&
      first.top < second.bottom &&
      first.bottom > second.top
    );
  const isLoaderElement = (element) => {
    if (!element?.matches) {
      return false;
    }
    return loaderSelector.split(',').some((selector) => {
      try {
        return element.matches(selector.trim());
      } catch {
        return false;
      }
    });
  };
  const loaderOwnsRoot = (loader) => {
    if (!loader || !readinessRoot) {
      return false;
    }
    if (loader === readinessRoot || readinessRoot.contains?.(loader)) {
      return true;
    }
    if (loader.contains?.(readinessRoot)) {
      return true;
    }
    const loaderRect = loader.getBoundingClientRect?.();
    if (!rectsOverlap(rootRect, loaderRect)) {
      return false;
    }
    const centerX = Math.min(Math.max((rootRect.left + rootRect.right) / 2, 0), Math.max(window.innerWidth - 1, 0));
    const centerY = Math.min(Math.max((rootRect.top + rootRect.bottom) / 2, 0), Math.max(window.innerHeight - 1, 0));
    const loaderCenterX = Math.min(Math.max((loaderRect.left + loaderRect.right) / 2, 0), Math.max(window.innerWidth - 1, 0));
    const loaderCenterY = Math.min(Math.max((loaderRect.top + loaderRect.bottom) / 2, 0), Math.max(window.innerHeight - 1, 0));
    const hits = [document.elementFromPoint?.(centerX, centerY), document.elementFromPoint?.(loaderCenterX, loaderCenterY)];
    return hits.some((hit) => hit === loader || loader.contains?.(hit));
  };
  const ancestorLoaders = [];
  let ancestor = readinessRoot instanceof HTMLElement ? readinessRoot : readinessRoot?.parentElement;
  while (ancestor instanceof HTMLElement && ancestor !== document.body) {
    if (isVisible(ancestor) && isLoaderElement(ancestor)) {
      ancestorLoaders.push(ancestor);
    }
    ancestor = ancestor.parentElement;
  }
  const loaders = Array.from(
    new Set([
      ...Array.from(readinessRoot?.querySelectorAll?.(loaderSelector) || []).filter(isVisible),
      ...ancestorLoaders,
      ...documentLoaders.filter(loaderOwnsRoot),
    ])
  );
  const reviewEvidence = ['review + create', 'review and create', 'create workspace'].some((value) => lowerText.includes(value));
  const createWorkspaceEvidence = lowerText.includes('create logic app workspace') || lowerText.includes('workspace parent folder path');
  const overviewEvidence = lowerText.includes('run trigger') || lowerText.includes('latest run') || lowerText.includes('workflow overview');
  const monitoringEvidence = lowerText.includes('inputs') || lowerText.includes('outputs') || lowerText.includes('raw inputs') || lowerText.includes('raw outputs');
  const statusLabels = ['succeeded', 'running', 'failed', 'cancelled', 'waiting'];
  const counts = {
    loaders: loaders.length,
    documentLoaders: documentLoaders.length,
    frames: visibleFrames.length,
    canvasNodes: canvasNodes.length,
    panels: panels.length,
    selectedLayouts: selectedLayouts.length,
    workbenchShellParts: workbenchShellParts.length,
    buttons: visibleElements('button').length,
    rows: visibleElements('[role="row"], .ms-DetailsRow, tr').length,
  };
  const blockers = [];
  const details = {};
  if (loaders.length > 0) {
    blockers.push('loader-visible');
  }
  const reasonCodes = [];
  let ready = false;
  const requireNoLoader = !expectation.allowLoading;
  const hasRequiredText = (source, values) =>
    (values || []).every((value) =>
      Array.isArray(value) ? value.some((variant) => normalizedIncludes(source, variant)) : normalizedIncludes(source, value)
    );
  const nodeIdentityText = (node) =>
    normalize(
      [
        node?.textContent || '',
        node?.getAttribute?.('aria-label') || '',
        node?.getAttribute?.('title') || '',
        node?.getAttribute?.('data-automation-id') || '',
        node?.id || '',
      ].join(' ')
    );
  const intersectRects = (a, b) => {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.right, b.right);
    const bottom = Math.min(a.bottom, b.bottom);
    return { left, top, right, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  };
  const getClippedRect = (element) => {
    if (!(element instanceof HTMLElement)) {
      return undefined;
    }
    const rawRect = element.getBoundingClientRect();
    let clipped = intersectRects(rawRect, {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    });
    let current = element.parentElement;
    while (current instanceof HTMLElement && current !== document.body && current !== document.documentElement) {
      const style = getComputedStyle(current);
      const clips =
        current.scrollHeight > current.clientHeight + 1 ||
        current.scrollWidth > current.clientWidth + 1 ||
        [style.overflow, style.overflowX, style.overflowY].some((value) => /auto|scroll|hidden|clip/i.test(value || ''));
      if (clips) {
        clipped = intersectRects(clipped, current.getBoundingClientRect());
      }
      current = current.parentElement;
    }
    return clipped.width > 0 && clipped.height > 0 ? clipped : undefined;
  };
  const pointHitsElement = (element, x, y) => {
    const hit = document.elementFromPoint?.(x, y);
    return !hit || hit === element || element.contains?.(hit) || hit.contains?.(element);
  };
  const concreteRequiredNodeMatches = (requiredNodes) => {
    const isSubstantiallyVisible = (element, visibleRatio = 0.98) => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }
      if (!isVisible(element)) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      const clipped = getClippedRect(element);
      if (rect.width <= 0 || rect.height <= 0 || !clipped) {
        return false;
      }
      return clipped.width >= rect.width * visibleRatio && clipped.height >= rect.height * visibleRatio;
    };
    const canvasRootSubstantiallyVisible = !designerCanvas || isSubstantiallyVisible(designerCanvas, 0.85);
    const hitTestOwnsElement = (element) => {
      if (!(element instanceof HTMLElement) || typeof document.elementFromPoint !== 'function') {
        return true;
      }

      const rect = element.getBoundingClientRect();
      const clipped = getClippedRect(element);
      if (rect.width <= 0 || rect.height <= 0 || !clipped) {
        return false;
      }

      const centerX = Math.min(Math.max(clipped.left + clipped.width / 2, 0), Math.max(window.innerWidth - 1, 0));
      const centerY = Math.min(Math.max(clipped.top + clipped.height / 2, 0), Math.max(window.innerHeight - 1, 0));
      return pointHitsElement(element, centerX, centerY);
    };
    const directText = (element) => {
      const childElements = Array.from(element.children || []);
      if (childElements.length === 0) {
        return visibleText(element);
      }
      if (typeof Node === 'undefined') {
        return '';
      }
      return normalize(
        Array.from(element.childNodes || [])
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent || '')
          .join(' ')
      );
    };
    const findRequiredLabelTarget = (node, variants) => {
      const labelSelectors = [
        '[data-automation-id*="title" i]',
        '[data-testid*="title" i]',
        '[class*="title" i]',
        '[class*="header" i]',
        '[role="heading"]',
        'h1',
        'h2',
        'h3',
        'span',
        'div',
      ].join(', ');
      const descendants = Array.from(node.querySelectorAll?.(labelSelectors) || []);
      return (
        descendants.find((element) => variants.some((variant) => normalizedIncludes(directText(element), variant))) ||
        (variants.some((variant) => normalizedIncludes(directText(node), variant)) ? node : undefined)
      );
    };
    const canvasNodeSelector = '[data-automation-id^="msla-node"], [id^="msla-node"], [data-testid*="node"], .msla-card, .react-flow__node';
    const candidateNodes = Array.from(
      new Set([
        ...Array.from(designerCanvas?.querySelectorAll?.(canvasNodeSelector) || []).filter(isVisible),
        ...(designerCanvas && isVisible(designerCanvas) && designerCanvas.matches?.(canvasNodeSelector) ? [designerCanvas] : []),
      ])
    );
    const result = {
      ok: true,
      missing: [],
      matched: [],
      covered: [],
      clipped: [],
      canvasRootVisible: canvasRootSubstantiallyVisible,
      visibleNodeCount: candidateNodes.length,
    };
    for (const [requiredIndex, required] of (requiredNodes || []).entries()) {
      const variants = Array.isArray(required) ? required : [required];
      const match = candidateNodes.find((node) => variants.some((variant) => normalizedIncludes(nodeIdentityText(node), variant)));
      if (match) {
        const identity = 'required-' + requiredIndex;
        const labelTarget = findRequiredLabelTarget(match, variants);
        result.matched.push(identity);
        if (!labelTarget || !isSubstantiallyVisible(labelTarget)) {
          result.ok = false;
          result.clipped.push(identity);
        }
        if (!labelTarget || !hitTestOwnsElement(labelTarget)) {
          result.ok = false;
          result.covered.push(identity);
        }
      } else {
        result.ok = false;
        result.missing.push('required-' + requiredIndex);
      }
    }
    return result;
  };
  const slug = (value) => normalize(value).replace(/\\W+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  const panelIdentityState = (panel, expectedTitle) => {
    const expectedText = normalize(expectedTitle).toLowerCase();
    const expectedSlug = slug(expectedTitle);
    const sources = [];
    const nodeId = normalize(panel?.nodeId || '');
    if (nodeId) {
      sources.push({ kind: 'stable-id', matches: slug(nodeId) === expectedSlug });
    }
    const titles = Array.from(new Set((panel?.titles || []).map(normalize).filter(Boolean)));
    for (const title of titles) {
      const normalizedTitle = title.toLowerCase();
      sources.push({ kind: 'editable-title', matches: normalizedTitle === expectedText });
    }
    const headerTitles = titles.length === 0 ? Array.from(new Set((panel?.headerTitles || []).map(normalize).filter(Boolean))) : [];
    for (const headerTitle of headerTitles) {
      const normalizedHeaderTitle = headerTitle.toLowerCase();
      sources.push({
        kind: 'visible-header',
        matches: normalizedHeaderTitle === expectedText,
      });
    }
    return {
      matches: sources.length > 0 && sources.every((source) => source.matches),
      sourceCount: sources.length,
      matchedSourceCount: sources.filter((source) => source.matches).length,
      sourceKinds: Array.from(new Set(sources.map((source) => source.kind))),
      usedVisibleHeaderFallback: titles.length === 0 && headerTitles.length > 0,
    };
  };
  const matchesExactPanelIdentity = (panel, expectedTitle) => panelIdentityState(panel, expectedTitle).matches;
  const panelSemanticTextState = (root, requiredValues) => {
    const excludedRoles = new Set(['menu', 'menuitem', 'listbox', 'option', 'dialog', 'alertdialog']);
    const isExcludedSemanticSubtree = (element) => {
      let current = element;
      while (current instanceof HTMLElement && current !== root) {
        const role = normalize(current.getAttribute('role')).toLowerCase();
        const className = normalize(current.getAttribute('class') || current.className || '');
        const id = normalize(current.id || '');
        const automationId = normalize(
          [current.getAttribute('data-automation-id'), current.getAttribute('data-testid')].filter(Boolean).join(' ')
        );
        if (
          excludedRoles.has(role) ||
          current.getAttribute('aria-modal') === 'true' ||
          /(?:^|\\s)[^\\s]*(?:layer|overlay|modal|popover)[^\\s]*(?:\\s|$)/i.test(className) ||
          /(?:layer|overlay|modal|popover)/i.test(id) ||
          /(?:layer|overlay|modal|popover)/i.test(automationId)
        ) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    };
    const directRenderedText = (element) => {
      if (!(element instanceof HTMLElement) || !isVisible(element) || isExcludedSemanticSubtree(element)) {
        return '';
      }
      if (typeof Node === 'undefined' || !element.childNodes) {
        return Array.from(element.children || []).length === 0 ? normalize(element.textContent || '') : '';
      }
      return normalize(
        Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent || '')
          .join(' ')
      );
    };
    const isUnobscuredSemanticElement = (element) => {
      const clipped = getClippedRect(element);
      if (!clipped) {
        return false;
      }
      const sampleX = Math.min(Math.max(clipped.left + clipped.width / 2, 0), Math.max(window.innerWidth - 1, 0));
      const sampleY = Math.min(Math.max(clipped.top + clipped.height / 2, 0), Math.max(window.innerHeight - 1, 0));
      return pointHitsElement(element, sampleX, sampleY);
    };
    const candidates = Array.from(root?.querySelectorAll?.('*') || [])
      .filter((element) => element instanceof HTMLElement && isUnobscuredSemanticElement(element))
      .map((element) => ({ element, text: directRenderedText(element) }))
      .filter((candidate) => candidate.text.length > 0);
    const matches = (requiredValues || []).map((required) => {
      const variants = Array.isArray(required) ? required : [required];
      return candidates.some((candidate) => variants.some((variant) => normalizedIncludes(candidate.text, variant)));
    });
    return {
      ok: matches.every(Boolean),
      candidateCount: candidates.length,
      requiredCount: matches.length,
      matchedCount: matches.filter(Boolean).length,
      missingCount: matches.filter((matched) => !matched).length,
    };
  };
  const isReadableFieldControl = (control) => {
    if (!isVisible(control)) {
      return false;
    }
    const rect = control.getBoundingClientRect();
    const clipped = getClippedRect(control);
    if (!clipped) {
      return false;
    }
    const minVisibleHeight = Math.min(rect.height, Math.max(18, rect.height * 0.8));
    const minVisibleWidth = Math.min(rect.width, Math.max(32, rect.width * 0.85));
    if (clipped.height < minVisibleHeight || clipped.width < minVisibleWidth) {
      return false;
    }
    const sampleX = Math.min(Math.max(rect.left + rect.width / 2, clipped.left + 1), clipped.right - 1);
    const sampleYs = [0.3, 0.5, 0.7].map((ratio) => Math.min(Math.max(rect.top + rect.height * ratio, clipped.top + 1), clipped.bottom - 1));
    return sampleYs.every((sampleY) => pointHitsElement(control, sampleX, sampleY));
  };
  const findFieldState = (labels, root, expectedValue, exactAriaLabel, sectionTitle) => {
    const normalizedLabels = labels.map((label) => normalize(label).toLowerCase());
    const normalizedExactAriaLabel = normalize(exactAriaLabel).toLowerCase();
    const normalizedSectionTitle = normalize(sectionTitle).toLowerCase();
    const controls = Array.from(
      (root || document).querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"], [role="combobox"]')
    ).filter(isVisible);
    const candidates = [];
    let clippedMatch = false;
    let exactAriaLabelMismatch = false;
    let sectionMismatch = false;
    for (const control of controls) {
      const controlAriaLabel = normalize(control.getAttribute('aria-label')).toLowerCase();
      if (normalizedExactAriaLabel && controlAriaLabel !== normalizedExactAriaLabel) {
        exactAriaLabelMismatch = true;
        continue;
      }
      const labelledBy = (control.getAttribute('aria-labelledby') || '')
        .split(/\\s+/)
        .map((id) => document.getElementById(id)?.textContent || '')
        .join(' ');
      const describedBy = (control.getAttribute('aria-describedby') || '')
        .split(/\\s+/)
        .map((id) => document.getElementById(id))
        .filter(isVisible)
        .map((element) => element.textContent || '')
        .join(' ');
      const container = control.closest?.('.ms-TextField, .fui-Field, [class*="field"], [class*="Field"], [role="group"]') || control.parentElement;
      const identity = [
        control.getAttribute('aria-label'),
        control.getAttribute('placeholder'),
        control.getAttribute('title'),
        labelledBy,
        container?.textContent,
      ]
        .map(normalize)
        .join(' ')
        .toLowerCase();
      if (!normalizedLabels.some((label) => identity.includes(label))) {
        continue;
      }
      if (normalizedSectionTitle) {
        const section = control.closest?.('.msla-setting-section');
        const headers = Array.from(section?.querySelectorAll?.('button.msla-setting-section-header') || [])
          .filter((header) => header.closest?.('.msla-setting-section') === section);
        const sectionMatches =
          headers.length === 1 &&
          normalize(headers[0].textContent).toLowerCase() === normalizedSectionTitle &&
          normalize(headers[0].getAttribute('aria-label')).toLowerCase().includes(normalizedSectionTitle);
        if (!sectionMatches) {
          sectionMismatch = true;
          continue;
        }
      }
      if (!isReadableFieldControl(control)) {
        clippedMatch = true;
        continue;
      }
      const value = normalize(typeof control.value === 'string' ? control.value : control.getAttribute('value') || control.textContent || '');
      const validationText = normalize(
        [
          describedBy,
          ...Array.from(container?.querySelectorAll?.('[role="alert"], .ms-TextField-errorMessage, [class*="error"], [aria-live]') || []).map(
            (element) => (isVisible(element) ? element.textContent || '' : '')
          ),
        ]
          .filter((value) => !!value)
          .join(' ')
      );
      const ariaInvalid = control.getAttribute('aria-invalid') === 'true';
      candidates.push({ found: true, value, validationText, ariaInvalid, text: normalize([container?.textContent || '', value].join(' ')) });
    }
    if (expectedValue !== undefined) {
      const exactValue = candidates.find((candidate) => candidate.value === normalize(expectedValue));
      if (exactValue) {
        return exactValue;
      }
    }
    return candidates[0] || {
      found: false,
      clipped: clippedMatch,
      exactAriaLabelMismatch,
      sectionMismatch,
      value: '',
      validationText: '',
      text: '',
    };
  };
  const fieldMatches = (field, root) => {
    const state = findFieldState(
      field.labels || [],
      root,
      field.value,
      field.exactAriaLabel,
      field.sectionTitle
    );
    if (!state.found) {
      return {
        ok: false,
        reason: state.clipped
          ? 'field-clipped'
          : state.sectionMismatch
            ? 'field-section-mismatch'
            : state.exactAriaLabelMismatch
              ? 'field-accessibility-mismatch'
              : 'field-missing',
      };
    }
    if (field.value !== undefined && state.value !== normalize(field.value)) {
      return { ok: false, reason: 'field-value-mismatch' };
    }
    if (field.validationMessage && !normalizedIncludes(state.validationText, field.validationMessage)) {
      return { ok: false, reason: 'field-validation-mismatch' };
    }
    return { ok: true, reason: 'field-visible' };
  };
  const findSwitchState = (expected, root) => {
    const normalizedLabels = (expected.labels || []).map((label) => normalize(label).toLowerCase());
    const normalizedExactAriaLabel = normalize(expected.exactAriaLabel).toLowerCase();
    const normalizedSectionTitle = normalize(expected.sectionTitle).toLowerCase();
    const normalizedStateText = normalize(expected.stateText).toLowerCase();
    const controls = Array.from((root || document).querySelectorAll('[role="switch"]')).filter(
      (control) => control instanceof HTMLElement
    );
    let exactAriaLabelMismatch = false;
    let sectionMismatch = false;
    for (const control of controls) {
      const controlAriaLabel = normalize(control.getAttribute('aria-label')).toLowerCase();
      if (normalizedExactAriaLabel && controlAriaLabel !== normalizedExactAriaLabel) {
        exactAriaLabelMismatch = true;
        continue;
      }
      const labelledBy = (control.getAttribute('aria-labelledby') || '')
        .split(/\\s+/)
        .map((id) => document.getElementById(id)?.textContent || '')
        .join(' ');
      const identity = normalize([control.getAttribute('aria-label'), control.getAttribute('title'), labelledBy].join(' ')).toLowerCase();
      if (!normalizedLabels.some((label) => identity.includes(label))) {
        continue;
      }
      if (normalizedSectionTitle) {
        const section = control.closest?.('.msla-setting-section');
        const headers = Array.from(section?.querySelectorAll?.('button.msla-setting-section-header') || []).filter(
          (header) => header.closest?.('.msla-setting-section') === section
        );
        const sectionMatches =
          headers.length === 1 &&
          normalize(headers[0].textContent).toLowerCase() === normalizedSectionTitle &&
          normalize(headers[0].getAttribute('aria-label')).toLowerCase().includes(normalizedSectionTitle);
        if (!sectionMatches) {
          sectionMismatch = true;
          continue;
        }
      }
      const checked =
        control instanceof HTMLInputElement
          ? control.checked
          : control.getAttribute('aria-checked') === 'true'
            ? true
            : control.getAttribute('aria-checked') === 'false'
              ? false
              : undefined;
      const associatedLabels =
        control instanceof HTMLInputElement
          ? Array.from(control.labels || [])
          : (control.getAttribute('aria-labelledby') || '')
              .split(/\\s+/)
              .map((id) => document.getElementById(id))
              .filter((element) => element instanceof HTMLElement);
      const switchRoot = control.closest?.('.fui-Switch');
      const visualLabels = [
        ...associatedLabels,
        ...Array.from(switchRoot?.querySelectorAll?.('.fui-Switch__label, label') || []),
      ].filter(
        (element, index, all) =>
          element instanceof HTMLElement &&
          all.indexOf(element) === index &&
          isVisible(element) &&
          !!getClippedRect(element)
      );
      const visibleStateText = visualLabels.map((element) => normalize(visibleText(element))).filter(Boolean);
      return {
        found: true,
        checked,
        stateTextVisible:
          !normalizedStateText || visibleStateText.some((text) => text.toLowerCase().includes(normalizedStateText)),
        visibleStateText,
      };
    }
    return {
      found: false,
      exactAriaLabelMismatch,
      sectionMismatch,
      checked: undefined,
      stateTextVisible: false,
      visibleStateText: [],
    };
  };
  const switchMatches = (expected, root) => {
    const state = findSwitchState(expected, root);
    if (!state.found) {
      return {
        ok: false,
        reason: state.sectionMismatch
          ? 'switch-section-mismatch'
          : state.exactAriaLabelMismatch
            ? 'switch-accessibility-mismatch'
            : 'switch-missing',
      };
    }
    if (state.checked !== expected.checked) {
      return { ok: false, reason: 'switch-checked-mismatch' };
    }
    if (!state.stateTextVisible) {
      return { ok: false, reason: 'switch-state-text-missing' };
    }
    return { ok: true, reason: 'switch-state-visible' };
  };
  const controlMatchesLabels = (control, labels) => {
    const normalizedLabels = (labels || []).map((label) => normalize(label).toLowerCase());
    const labelledBy = (control.getAttribute('aria-labelledby') || '')
      .split(/\\s+/)
      .map((id) => document.getElementById(id)?.textContent || '')
      .join(' ');
    const container = control.closest?.('.ms-TextField, .fui-Field, [class*="field"], [class*="Field"], [role="group"]') || control.parentElement;
    const identity = [
      control.getAttribute('aria-label'),
      control.getAttribute('placeholder'),
      control.getAttribute('title'),
      labelledBy,
      container?.textContent,
    ]
      .map(normalize)
      .join(' ')
      .toLowerCase();
    return normalizedLabels.some((label) => identity.includes(label));
  };
  const closestElement = (element, matches) => {
    let current = element instanceof HTMLElement ? element : element?.parentElement;
    while (current instanceof HTMLElement) {
      if (matches(current)) {
        return current;
      }
      current = current.parentElement;
    }
    return undefined;
  };
  const hasClassName = (element, className) =>
    String(element?.getAttribute?.('class') || element?.className || '')
      .split(/\\s+/)
      .includes(className);
  const exactLabelMatches = (actual, expected) => normalize(actual).toLowerCase() === normalize(expected).toLowerCase() || slug(actual) === slug(expected);
  const anyExactLabelMatches = (actual, expectedValues) => (expectedValues || []).some((expected) => exactLabelMatches(actual, expected));
  const directText = (element) => {
    const childElements = Array.from(element?.children || []);
    if (childElements.length === 0) {
      return visibleText(element);
    }
    if (typeof Node === 'undefined') {
      return '';
    }
    return normalize(
      Array.from(element.childNodes || [])
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent || '')
        .join(' ')
    );
  };
  const findEditorState = (editor, root) => {
    if (!editor) {
      return { ok: true, reason: 'editor-not-required' };
    }
    const controls = Array.from(
      (root || document).querySelectorAll(
        '[contenteditable="true"], [role="textbox"], textarea, input, .editor-input, .monaco-editor, [class*="editor"]'
      )
    ).filter(
      (control) =>
        isVisible(control) &&
        control.getAttribute?.('aria-label') !== 'Card title' &&
        !(control instanceof HTMLInputElement && control.id?.endsWith('-title'))
    );
    const controlExactIdentityParts = (control) => {
      const labelledBy = (control.getAttribute('aria-labelledby') || '')
        .split(/\\s+/)
        .map((id) => document.getElementById(id)?.textContent || '')
        .filter(Boolean);
      return [
        control.getAttribute('aria-label'),
        control.getAttribute('placeholder'),
        control.getAttribute('title'),
        control.getAttribute('data-testid'),
        control.getAttribute('data-automation-id'),
        control.id,
        ...labelledBy,
      ]
        .map(normalize)
        .filter(Boolean);
    };
    const matchingEditors = controls.filter((control) => controlMatchesLabels(control, editor.labels || []));
    const exactMatchingEditors = controls.filter((control) =>
      controlExactIdentityParts(control).some((identity) => anyExactLabelMatches(identity, editor.labels || []))
    );
    const matchedEditor = matchingEditors.find((control) => (control.getAttribute('aria-labelledby') || '').trim().length > 0) || matchingEditors[0];
    const exactMatchedEditor =
      exactMatchingEditors.find((control) => (control.getAttribute('aria-labelledby') || '').trim().length > 0) || exactMatchingEditors[0];
    const selectedEditor = exactMatchedEditor || matchedEditor;
    if (!selectedEditor) {
      return { ok: false, reason: 'editor-missing' };
    }
    if (editor.focused) {
      const activeElement = document.activeElement || selectedEditor.ownerDocument?.activeElement;
      const activeElementMatchesEditor =
        !!activeElement &&
        (activeElement === selectedEditor ||
          selectedEditor.contains?.(activeElement) ||
          (controlMatchesLabels(activeElement, editor.labels || []) && (root || document).contains?.(activeElement)));
      if (!activeElementMatchesEditor) {
        return { ok: false, reason: 'editor-focus-mismatch' };
      }
    }
    if (editor.token) {
      const selectorTokenNodes = Array.from(
        selectedEditor.querySelectorAll?.(
          '[data-automation-id*="token"], [data-testid*="token"], [class*="token"], [class*="Token"], [class*="pill"], [class*="Pill"]'
        ) || []
      );
      const metadataTokenNodes = Array.from(selectedEditor.querySelectorAll?.('*') || []).filter((candidate) => {
        const tokenMetadata = normalize(
          [
            candidate.getAttribute?.('title') || '',
            candidate.getAttribute?.('aria-label') || '',
            candidate.getAttribute?.('data-automation-id') || '',
            candidate.getAttribute?.('data-testid') || '',
            candidate.getAttribute?.('class') || '',
          ].join(' ')
        );
        return normalizedIncludes(tokenMetadata, 'token') || normalizedIncludes(tokenMetadata, 'body(');
      });
      const tokenNodes = Array.from(new Set([...selectorTokenNodes, ...metadataTokenNodes])).filter(isVisible);
      const sourceSlug = slug(editor.token.sourceAction);
      const matchingToken = tokenNodes.find((tokenNode) => {
        const tokenEvidence = normalize(
          [
            visibleText(tokenNode),
            tokenNode.getAttribute?.('title') || '',
            tokenNode.getAttribute?.('aria-label') || '',
            tokenNode.getAttribute?.('data-automation-id') || '',
            tokenNode.getAttribute?.('data-testid') || '',
          ].join(' ')
        );
        const hasTitles = (editor.token.titles || []).every((title) => normalizedIncludes(tokenEvidence, title));
        const hasSource =
          tokenEvidence.toLowerCase().includes("'" + sourceSlug + "'") ||
          tokenEvidence.toLowerCase().includes('"' + sourceSlug + '"') ||
          (sourceSlug.includes('_') && slug(tokenEvidence).includes(sourceSlug));
        return hasTitles && hasSource;
      });
      if (!matchingToken) {
        return { ok: false, reason: 'editor-token-mismatch' };
      }
    }
    const labelIds = (selectedEditor.getAttribute('aria-labelledby') || '').split(/\\s+/).filter(Boolean);
    const editorContainer = closestElement(
      selectedEditor,
      (element) => !!element.id && (element.id.startsWith('msla-tokenpicker-callout-location') || hasClassName(element, 'msla-editor-container'))
    );
    return {
      ok: true,
      reason: 'editor-visible',
      element: selectedEditor,
      labelIds,
      editorContainerId: editorContainer?.id || '',
      exactLabelMatch: !!exactMatchedEditor,
    };
  };
  const findPickerState = (picker, editorState) => {
    if (!picker) {
      return { ok: true, reason: 'picker-not-required' };
    }
    const pickerSelector = [
        '[role="dialog"]',
        '[role="listbox"]',
        '[data-automation-id*="picker"]',
        '[data-testid*="picker"]',
        '[class*="picker"]',
        '[class*="Picker"]',
        '.msla-token-picker',
        '.msla-token-picker-section',
        '.msla-token-picker-section-option',
        '[data-automation-id^="msla-token-picker-section-option-"]',
      ].join(', ');
    const pickerTokenTitles = picker.tokenTitles || [];
    const pickerSectionLabels = picker.sectionLabels || [];
    const pathHasVisibleFluentLayerContent = (element, hiddenAncestor) => {
      let current = element;
      while (current instanceof HTMLElement && current !== hiddenAncestor) {
        if (current.matches?.('.ms-Layer-content')) {
          const style = current.ownerDocument?.defaultView?.getComputedStyle?.(current) ?? getComputedStyle(current);
          return style.visibility === 'visible';
        }
        current = current.parentElement;
      }
      return false;
    };
    const hasHiddenLayerHostAncestor = (element) => {
      let current = element?.parentElement;
      while (current instanceof HTMLElement) {
        if (current.id === 'msla-layer-host') {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    };
    const hasExplicitHiddenVisibility = (element) => {
      const inlineVisibility = element?.style?.visibility || '';
      const styleAttributeVisibility = String(element?.getAttribute?.('style') || '').match(/(?:^|;)\\s*visibility\\s*:\\s*([^;]+)/i)?.[1] || '';
      return /^(hidden|collapse)$/i.test(inlineVisibility.trim()) || /^(hidden|collapse)$/i.test(styleAttributeVisibility.trim());
    };
    const hasConcretePickerVisibleStyle = (element) => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }
      let current = element;
      while (current instanceof HTMLElement) {
        if (current.isConnected === false) {
          return false;
        }
        if (current.hidden || current.getAttribute('aria-hidden') === 'true') {
          return false;
        }
        const style = current.ownerDocument?.defaultView?.getComputedStyle?.(current) ?? getComputedStyle(current);
        if (style.display === 'none') {
          return false;
        }
        if (style.visibility === 'hidden' || style.visibility === 'collapse') {
          const allowedFluentLayerHost =
            style.visibility === 'hidden' &&
            pathHasVisibleFluentLayerContent(element, current) &&
            (current.id === 'msla-layer-host' ||
              (hasClassName(current, 'ms-Layer') && hasHiddenLayerHostAncestor(current) && !hasExplicitHiddenVisibility(current)));
          if (!allowedFluentLayerHost) {
            return false;
          }
        }
        if (Number.parseFloat(style.opacity || '1') === 0) {
          return false;
        }
        current = current.parentElement;
      }
      return true;
    };
    const isConcretePickerReadable = (element, visibleRatio = 0.8) => {
      if (!(element instanceof HTMLElement) || !hasConcretePickerVisibleStyle(element)) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      const clipped = getClippedRect(element);
      if (rect.width <= 0 || rect.height <= 0 || !clipped) {
        return false;
      }
      return clipped.width >= rect.width * visibleRatio && clipped.height >= rect.height * visibleRatio;
    };
    const isConcretePickerContainerVisible = (element) => {
      if (!(element instanceof HTMLElement) || !hasConcretePickerVisibleStyle(element)) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const isConcretePickerOptionReadable = (element) => {
      if (!(element instanceof HTMLElement) || !hasConcretePickerVisibleStyle(element)) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return false;
      }
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      if (centerX < 0 || centerY < 0 || centerX > window.innerWidth || centerY > window.innerHeight) {
        return false;
      }
      return true;
    };
    const optionTitleText = (button) => {
      const titleElement = button.querySelector?.('.msla-token-picker-option-title');
      if (titleElement instanceof HTMLElement && hasConcretePickerVisibleStyle(titleElement)) {
        return normalize(visibleText(titleElement));
      }
      const descriptionElement = button.querySelector?.('.msla-token-picker-option-description');
      if (descriptionElement) {
        return '';
      }
      return normalize([button.getAttribute?.('aria-label') || '', button.getAttribute?.('title') || '', button.textContent || ''].join(' '));
    };
    const concretePickerState = () => {
      if (pickerTokenTitles.length === 0) {
        return undefined;
      }
      if (!editorState?.ok || !(editorState.element instanceof HTMLElement)) {
        return { ok: false, reason: 'picker-editor-missing' };
      }
      if (editorState.exactLabelMatch !== true) {
        return { ok: false, reason: 'picker-editor-label-mismatch' };
      }
      const editorLabelIds = editorState.labelIds || [];
      const activeElement = document.activeElement || editorState.element.ownerDocument?.activeElement;
      const searchCandidates = Array.from(
        document.querySelectorAll(
          '[data-automation-id="msla-token-picker-search"], .msla-token-picker-search input, .msla-token-picker-search [role="searchbox"], .msla-token-picker-search'
        )
      ).filter((element) => element instanceof HTMLElement && isConcretePickerReadable(element));
      const activeElementReadable = activeElement instanceof HTMLElement && isConcretePickerReadable(activeElement);
      const activeSearch = searchCandidates.find((search) => {
        if (activeElement === search) {
          return true;
        }
        if (!(activeElement instanceof HTMLElement) || !activeElementReadable) {
          return false;
        }
        return search.contains?.(activeElement) || closestElement(activeElement, (element) => element === search);
      });
      const rootFromAncestors = (start) => {
        const pickerAncestors = [];
        let pickerAncestor = start;
        while (pickerAncestor instanceof HTMLElement) {
          pickerAncestors.push(pickerAncestor);
          pickerAncestor = pickerAncestor.parentElement;
        }
        return (
          pickerAncestors.find(
            (element) =>
              (element.getAttribute('role') === 'dialog' || element.getAttribute('role') === 'listbox') &&
              (element.getAttribute('aria-labelledby') || '').length > 0
          ) ||
          pickerAncestors.find((element) => hasClassName(element, 'msla-token-picker-container-v3')) ||
          pickerAncestors.find((element) => hasClassName(element, 'msla-token-picker')) ||
          start.parentElement
        );
      };
      const labelIdsOverlap = (element) => {
        const ids = (element.getAttribute?.('aria-labelledby') || '').split(/\\s+/).filter(Boolean);
        return editorLabelIds.length > 0 && ids.length > 0 && ids.some((id) => editorLabelIds.includes(id));
      };
      const associatedRootCandidates = Array.from(
        document.querySelectorAll('[role="dialog"], [role="listbox"], .msla-token-picker-container-v3, .msla-token-picker')
      )
        .map((element) => (element instanceof HTMLElement && labelIdsOverlap(element) ? element : closestElement(element, labelIdsOverlap)))
        .filter(
          (element, index, array) =>
            element instanceof HTMLElement &&
            array.indexOf(element) === index &&
            isConcretePickerContainerVisible(element) &&
            !!element.querySelector?.('.msla-token-picker-section')
        );
      const pickerRoot =
        associatedRootCandidates.find((element) => labelIdsOverlap(element)) ||
        (activeSearch instanceof HTMLElement ? rootFromAncestors(activeSearch) : undefined);
      if (!(pickerRoot instanceof HTMLElement)) {
        return { ok: false, reason: searchCandidates.length > 0 ? 'picker-editor-association-missing' : 'picker-search-missing' };
      }
      const pickerLabelIds = (pickerRoot.getAttribute('aria-labelledby') || '').split(/\\s+/).filter(Boolean);
      const associatedByLabelId =
        editorLabelIds.length > 0 && pickerLabelIds.length > 0 && pickerLabelIds.some((id) => editorLabelIds.includes(id));
      if (!associatedByLabelId) {
        return { ok: false, reason: 'picker-editor-association-missing' };
      }
      const sections = Array.from(pickerRoot.querySelectorAll('.msla-token-picker-section')).filter(
        (section) => section instanceof HTMLElement && hasConcretePickerVisibleStyle(section)
      );
      let matchedSection = false;
      for (const section of sections) {
        const header = Array.from(section.querySelectorAll?.('.msla-token-picker-section-header') || []).find(
          (candidate) =>
            candidate instanceof HTMLElement &&
            closestElement(candidate, (element) => hasClassName(element, 'msla-token-picker-section')) === section
        );
        const optionList = Array.from(section.querySelectorAll?.('.msla-token-picker-section-options[aria-label]') || []).find(
          (candidate) =>
            candidate instanceof HTMLElement &&
            closestElement(candidate, (element) => hasClassName(element, 'msla-token-picker-section')) === section
        );
        const labelTarget = header instanceof HTMLElement && isConcretePickerReadable(header) ? header : undefined;
        const optionListLabelTarget =
          header instanceof HTMLElement && optionList instanceof HTMLElement && hasConcretePickerVisibleStyle(optionList) ? optionList : undefined;
        if (!(header instanceof HTMLElement) || (!labelTarget && !optionListLabelTarget)) {
          continue;
        }
        const sectionLabelSource = normalize(
          [
            Array.from(labelTarget?.querySelectorAll?.('span') || [])
              .filter((span) => closestElement(span, (element) => hasClassName(element, 'msla-token-picker-section-header')) === labelTarget)
              .map((span) => directText(span))
              .find(Boolean) || '',
            directText(labelTarget),
            labelTarget?.getAttribute?.('aria-label') || '',
            optionListLabelTarget?.getAttribute?.('aria-label') || '',
          ]
            .filter(Boolean)
            .join(' ')
        );
        const sectionMatches = pickerSectionLabels.length === 0 || pickerSectionLabels.some((label) => exactLabelMatches(sectionLabelSource, label));
        if (!sectionMatches) {
          continue;
        }
        matchedSection = true;
        const optionButtons = Array.from(
          section.querySelectorAll('.msla-token-picker-section-option, [data-automation-id^="msla-token-picker-section-option-"]')
        ).filter((button) => button instanceof HTMLElement && isConcretePickerOptionReadable(button));
        const matchedTitles = pickerTokenTitles.filter((requestedTitle) =>
          optionButtons.some((button) => {
            const nearestSection = closestElement(button, (element) => hasClassName(element, 'msla-token-picker-section'));
            if (nearestSection !== section) {
              return false;
            }
            const titleElement = button.querySelector?.('.msla-token-picker-option-title');
            if (titleElement instanceof HTMLElement && !hasConcretePickerVisibleStyle(titleElement)) {
              return false;
            }
            const titleText = optionTitleText(button);
            return exactLabelMatches(titleText, requestedTitle);
          })
        );
        if (matchedTitles.length === pickerTokenTitles.length) {
          return { ok: true, reason: 'picker-visible' };
        }
      }
      return { ok: false, reason: matchedSection ? 'picker-token-missing' : 'picker-section-missing' };
    };
    const concreteState = concretePickerState();
    const pickerRoots = visibleElements(pickerSelector);
    const pickerText = normalize(pickerRoots.map(visibleText).join(' '));
    const loosePickerRoots = Array.from(document.querySelectorAll(pickerSelector)).filter(
      (element) => !!(element && hasVisibleStyle(element) && (element.offsetWidth || element.offsetHeight || element.getClientRects().length))
    );
    const loosePickerText = normalize(loosePickerRoots.map(visibleText).join(' '));
    const strictSectionMatch = pickerSectionLabels.length === 0 || pickerSectionLabels.some((label) => normalizedIncludes(pickerText, label));
    const strictRequestedTitlesMatch =
      pickerTokenTitles.length === 0 || pickerTokenTitles.every((title) => normalizedIncludes(pickerText, title));
    const looseSectionMatch = pickerSectionLabels.length === 0 || pickerSectionLabels.some((label) => normalizedIncludes(loosePickerText, label));
    const looseRequestedTitlesMatch =
      pickerTokenTitles.length === 0 || pickerTokenTitles.every((title) => normalizedIncludes(loosePickerText, title));
    const summarizeElement = (element) => {
      const rect = element?.getBoundingClientRect?.();
      return {
        tagName: element?.tagName,
        classFlags: {
          picker: !!element?.matches?.('.msla-token-picker, [class*="picker"], [class*="Picker"]'),
          section: !!element?.matches?.('.msla-token-picker-section'),
          option: !!element?.matches?.('.msla-token-picker-section-option, [data-automation-id^="msla-token-picker-section-option-"]'),
        },
        bounds: rect
          ? {
              left: Math.round(rect.left),
              top: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            }
          : undefined,
      };
    };
    const visibleSections = Array.from(document.querySelectorAll('.msla-token-picker-section')).filter(isVisible);
    const looseSections = Array.from(document.querySelectorAll('.msla-token-picker-section')).filter(
      (element) => !!(element && hasVisibleStyle(element) && (element.offsetWidth || element.offsetHeight || element.getClientRects().length))
    );
    const summarizeSection = (section) => {
      const header = section.querySelector?.('.msla-token-picker-section-header');
      const sectionText = normalize(visibleText(section));
      return {
        headerPresent: !!header && isVisible(header),
        matchedSectionLabelIndices: pickerSectionLabels
          .map((label, index) => (normalizedIncludes(sectionText, label) ? index : -1))
          .filter((index) => index >= 0),
        matchedRequestedTitleIndices: pickerTokenTitles
          .map((title, index) => (normalizedIncludes(sectionText, title) ? index : -1))
          .filter((index) => index >= 0),
        ...summarizeElement(section),
      };
    };
    details.picker = {
      expectedSectionLabelCount: pickerSectionLabels.length,
      expectedRequestedTitleCount: pickerTokenTitles.length,
      concretePathRequired: pickerTokenTitles.length > 0,
      concretePathReason: concreteState?.reason,
      strictRootCount: pickerRoots.length,
      looseRootCount: loosePickerRoots.length,
      strictSectionCount: visibleSections.length,
      looseSectionCount: looseSections.length,
      strictOptionCount: visibleElements('[data-automation-id^="msla-token-picker-section-option-"], .msla-token-picker-section-option').length,
      strictSectionMatch,
      strictRequestedTitlesMatch,
      looseSectionMatch,
      looseRequestedTitlesMatch,
      strictSections: visibleSections.slice(0, 4).map(summarizeSection),
      looseSections: looseSections.slice(0, 4).map(summarizeSection),
    };
    if (concreteState) {
      return concreteState;
    }
    if (!strictSectionMatch) {
      return { ok: false, reason: 'picker-section-missing' };
    }
    if (!strictRequestedTitlesMatch) {
      return { ok: false, reason: 'picker-token-missing' };
    }
    return { ok: true, reason: 'picker-visible' };
  };
  const fieldResults = (expectation.fields || []).map((field) => fieldMatches(field));
  const fieldsReady = (fieldResults.length === 0 || fieldResults.every((result) => result.ok));
  if (expectation.kind === 'createWorkspace' && (expectation.fields || []).length > 0) {
    details.createWorkspaceFields = (expectation.fields || []).map((field, index) => ({
      labels: (field.labels || []).map((label) => slug(label)).slice(0, 6),
      hasExpectedValue: field.value !== undefined,
      hasValidationMessage: field.validationMessage !== undefined,
      result: fieldResults[index]?.reason || 'unknown',
      ok: fieldResults[index]?.ok === true,
    }));
  }
  const createWorkspaceValidationPending =
    expectation.kind === 'createWorkspace' &&
    expectation.stage !== 'validation' &&
    visibleElements(
      [
        'button',
        '[role="button"]',
        '[role="status"]',
        '[role="alert"]',
        '[aria-live]',
        '.ms-TextField-description',
        '.ms-TextField-errorMessage',
        '[class*="Message"]',
        '[class*="message"]',
        '[class*="description"]',
        '[class*="Description"]',
      ].join(', ')
    ).some((element) => {
      const pendingText = normalize(element.textContent || '').toLowerCase();
      return pendingText === 'validating' || pendingText === 'validating...' || pendingText.includes('validating path');
    });
  const nextButtonMatches = (state) => {
    if (!state) {
      return true;
    }
    const nextButton = visibleElements('button').find((button) => normalize(button.textContent || '').toLowerCase().includes('next'));
    if (!(nextButton instanceof HTMLButtonElement)) {
      return false;
    }
    const disabled = nextButton.disabled || nextButton.getAttribute('aria-disabled') === 'true';
    return state === 'disabled' ? disabled : !disabled;
  };
  const createButtonMatches = (state) => {
    if (!state) {
      return true;
    }
    const createButton = visibleElements('button').find((button) => {
      const buttonText = normalize(button.textContent || '').toLowerCase();
      return buttonText === 'create workspace' || buttonText === 'review + create' || buttonText === 'review and create';
    });
    if (!(createButton instanceof HTMLButtonElement)) {
      return false;
    }
    const disabled = createButton.disabled || createButton.getAttribute('aria-disabled') === 'true';
    return state === 'disabled' ? disabled : !disabled;
  };
  const largestScrollable = Array.from(document.querySelectorAll('*'))
    .filter((element) => element instanceof HTMLElement && element.scrollHeight - element.clientHeight > 20 && isVisible(element))
    .sort((first, second) => second.scrollHeight - second.clientHeight - (first.scrollHeight - first.clientHeight))
    .at(0);
  const documentScroller = document.scrollingElement instanceof HTMLElement ? document.scrollingElement : document.documentElement;
  const scrollTarget = typeof expectation.scrollPosition === 'object' ? expectation.scrollPosition.target : 'largest-scrollable';
  const scrollElement = scrollTarget === 'largest-scrollable' ? largestScrollable || documentScroller : documentScroller;
  const currentScrollY = Math.round(
    scrollTarget === 'largest-scrollable'
      ? scrollElement?.scrollTop || 0
      : Math.max(window.scrollY || 0, document.documentElement?.scrollTop || 0, document.body?.scrollTop || 0)
  );
  const maxScrollY =
    scrollTarget === 'largest-scrollable'
      ? Math.max(0, (scrollElement?.scrollHeight || 0) - (scrollElement?.clientHeight || 0))
      : Math.max(0, (documentScroller?.scrollHeight || 0) - window.innerHeight);
  const scrollMatches = (scrollPosition) => {
    if (!scrollPosition) {
      return true;
    }
    const tolerance = Math.max(20, Math.round(maxScrollY * 0.1));
    if (scrollPosition === 'top') {
      return currentScrollY <= tolerance;
    }
    if (scrollPosition === 'middle') {
      if (maxScrollY === 0) {
        return currentScrollY === 0;
      }
      return Math.abs(currentScrollY - Math.round(maxScrollY / 2)) <= tolerance;
    }
    if (scrollPosition === 'bottom') {
      return maxScrollY === 0 ? currentScrollY === 0 : currentScrollY >= maxScrollY - tolerance;
    }
    if (scrollPosition.minY !== undefined && currentScrollY < scrollPosition.minY) {
      return false;
    }
    if (scrollPosition.maxY !== undefined && currentScrollY > scrollPosition.maxY) {
      return false;
    }
    return true;
  };
  switch (expectation.kind) {
    case 'workbenchShell':
      ready = !blankWorkbench && !!workbenchShell && workbenchParts.length >= 2;
      reasonCodes.push(ready ? 'workbench-shell-visible' : 'workbench-shell-missing');
      break;
    case 'createWorkspace':
      ready = createWorkspaceEvidence;
      if (expectation.stage === 'review') {
        ready = ready && reviewEvidence && lowerText.includes('workspace name') && lowerText.includes('workflow name');
      } else if (expectation.stage === 'created') {
        ready = lowerText.includes('explorer') || lowerText.includes('logic app');
      } else if (expectation.stage === 'validation') {
        ready = visibleElements('button').length > 0;
      } else if (expectation.stage === 'partial-fields' || expectation.stage === 'fields-valid' || expectation.stage === 'scrolled') {
        ready = visibleElements('button').some((button) => normalize(button.textContent || '').toLowerCase().includes('next'));
      }
      ready =
        ready &&
        hasRequiredText(text, expectation.requiredText || []) &&
        fieldsReady &&
        !createWorkspaceValidationPending &&
        nextButtonMatches(expectation.nextButton) &&
        createButtonMatches(expectation.createButton) &&
        scrollMatches(expectation.scrollPosition);
      reasonCodes.push(ready ? 'create-workspace-state-visible' : 'create-workspace-state-missing');
      if (!fieldsReady) {
        reasonCodes.push(...fieldResults.filter((result) => !result.ok).map((result) => 'create-workspace-' + result.reason));
      }
      if (createWorkspaceValidationPending) {
        reasonCodes.push('create-workspace-validation-pending');
      }
      if (!nextButtonMatches(expectation.nextButton)) {
        reasonCodes.push('create-workspace-next-button-mismatch');
      }
      if (!createButtonMatches(expectation.createButton)) {
        reasonCodes.push('create-workspace-create-button-mismatch');
      }
      if (!scrollMatches(expectation.scrollPosition)) {
        reasonCodes.push('create-workspace-scroll-mismatch');
      }
      break;
    case 'designerValidationError':
      const visibleValidationMessages = visibleElements(
        '[role="alert"], [aria-live], .ms-MessageBar, [class*="error"], [class*="Error"]'
      ).filter(element => !element.closest('.monaco-editor, .cm-editor'));
      ready = visibleValidationMessages.some(element =>
        normalize(visibleText(element)).includes(normalize(expectation.message))
      );
      reasonCodes.push(ready ? 'designer-validation-error-visible' : 'designer-validation-error-missing');
      break;
    case 'designerCanvas':
      const concreteNodeState = concreteRequiredNodeMatches(expectation.requiredNodes || []);
      ready = !!designerCanvas && hasRequiredText(visibleText(designerCanvas), expectation.requiredNodes || []) && concreteNodeState.ok;
      if ((expectation.requiredNodes || []).length > 0) {
        ready = ready && canvasNodes.length >= 1;
      }
      reasonCodes.push(ready ? 'designer-canvas-state-visible' : 'designer-canvas-state-missing');
      if (!concreteNodeState.ok) {
        reasonCodes.push('designer-canvas-required-node-missing');
      }
      details.designerCanvas = concreteNodeState;
      break;
    case 'designerPanel':
      const panelFieldStates = (expectation.fields || []).map((field) => fieldMatches(field, selectedPanel?.layout));
      const panelSwitchStates = (expectation.switches || []).map((expected) => switchMatches(expected, selectedPanel?.layout));
      const editorState = findEditorState(expectation.editor, selectedPanel?.layout);
      const pickerState = findPickerState(expectation.picker, editorState);
      const identityState = panelIdentityState(selectedPanel, expectation.actionTitle);
      const requiredTextState = panelSemanticTextState(selectedPanel?.content, expectation.requiredText || []);
      const requiredTextMatches = !!selectedPanel && requiredTextState.ok;
      const panelFieldsMatch = panelFieldStates.every((fieldState) => fieldState.ok);
      const panelSwitchesMatch = panelSwitchStates.every((switchState) => switchState.ok);
      ready =
        !!selectedPanel &&
        identityState.matches &&
        requiredTextMatches &&
        panelFieldsMatch &&
        panelSwitchesMatch &&
        editorState.ok &&
        pickerState.ok;
      details.designerPanel = {
        selectedLayoutCount: selectedLayouts.length,
        identitySourceCount: identityState.sourceCount,
        matchedIdentitySourceCount: identityState.matchedSourceCount,
        identitySourceKinds: identityState.sourceKinds,
        usedVisibleHeaderFallback: identityState.usedVisibleHeaderFallback,
        requiredTextCandidateCount: requiredTextState.candidateCount,
        requiredTextCount: requiredTextState.requiredCount,
        matchedRequiredTextCount: requiredTextState.matchedCount,
        missingRequiredTextCount: requiredTextState.missingCount,
        requiredTextMatches,
        fieldCount: panelFieldStates.length,
        fieldsMatch: panelFieldsMatch,
        switchCount: panelSwitchStates.length,
        switchesMatch: panelSwitchesMatch,
      };
      if (selectedLayouts.length === 0) {
        reasonCodes.push('selected-panel-missing');
      } else if (selectedLayouts.length !== 1) {
        reasonCodes.push('selected-panel-ambiguous');
      }
      if (!identityState.matches) {
        reasonCodes.push('designer-panel-identity-mismatch');
      }
      if (!requiredTextMatches) {
        reasonCodes.push('designer-panel-required-text-mismatch');
      }
      if (!panelFieldsMatch) {
        reasonCodes.push('designer-panel-field-mismatch');
      }
      if (!panelSwitchesMatch) {
        reasonCodes.push('designer-panel-switch-mismatch');
      }
      for (const fieldState of panelFieldStates) {
        if (!fieldState.ok) {
          reasonCodes.push(fieldState.reason);
        }
      }
      for (const switchState of panelSwitchStates) {
        if (!switchState.ok) {
          reasonCodes.push(switchState.reason);
        }
      }
      if (!editorState.ok) {
        reasonCodes.push(editorState.reason);
      }
      if (!pickerState.ok) {
        reasonCodes.push(pickerState.reason);
      }
      if (ready) {
        reasonCodes.push('designer-panel-state-visible');
      }
      break;
    case 'overview':
      ready = overviewEvidence && (!expectation.workflowName || normalizedIncludes(text, expectation.workflowName));
      if (expectation.runName && expectation.runStatus) {
        const runRowSelector = [
          '[role="row"]',
          '.ms-DetailsRow',
          'tr',
          '[data-testid*="run-row"]',
          '[data-testid*="runRow"]',
          '[data-automation-id*="run-row"]',
          '[data-automation-id*="runRow"]',
        ].join(', ');
        const runRows = visibleElements(runRowSelector).filter(
          (row) => !Array.from(row.querySelectorAll?.(runRowSelector) || []).some((descendant) => descendant !== row && isVisible(descendant))
        );
        ready =
          ready &&
          runRows
            .map((row) => visibleText(row))
            .some((rowText) => normalizedIncludes(rowText, expectation.runName) && normalizedIncludes(rowText, expectation.runStatus));
      } else {
        if (expectation.runName) {
          ready = ready && normalizedIncludes(text, expectation.runName);
        }
        if (expectation.runStatus) {
          ready = ready && lowerText.includes(expectation.runStatus.toLowerCase());
        }
      }
      reasonCodes.push(ready ? 'overview-state-visible' : 'overview-state-missing');
      break;
    case 'monitoringAction':
      if (selectedPanel) {
        const panelText = normalize(selectedPanel.text).toLowerCase();
        const hasActionIdentity = matchesExactPanelIdentity(selectedPanel, expectation.actionTitle);
        const valueContainers = ['inputs-', 'outputs-']
          .flatMap((prefix) => Array.from(selectedPanel.layout.querySelectorAll('.msla-trace-values[aria-labelledby^="' + prefix + '"]')))
          .filter(isVisible)
          .map((container) => normalize(container.textContent || '').toLowerCase())
          .filter(
            (valueText) =>
              valueText.length > 0 &&
              !valueText.includes('loading inputs') &&
              !valueText.includes('loading outputs') &&
              !valueText.includes('error loading inputs') &&
              !valueText.includes('error loading outputs')
          );
        const hasValueEvidence = valueContainers.length > 0;
        ready = hasActionIdentity && hasValueEvidence;
        if (expectation.expectedStatus) {
          ready = ready && panelText.includes(expectation.expectedStatus.toLowerCase());
        } else {
          ready = ready && statusLabels.some((status) => panelText.includes(status));
        }
        ready = ready && hasRequiredText(valueContainers.join(' '), expectation.expectedValues || []);
      } else {
        ready = false;
      }
      if (selectedLayouts.length !== 1) {
        reasonCodes.push('selected-panel-ambiguous');
      }
      reasonCodes.push(ready ? 'monitoring-action-state-visible' : 'monitoring-action-state-missing');
      break;
    case 'generatedArtifacts':
      ready = lowerText.includes('explorer') || lowerText.includes('workflow.json') || lowerText.includes('.code-workspace');
      reasonCodes.push(ready ? 'generated-artifacts-visible' : 'generated-artifacts-not-visible');
      break;
    case 'discovery':
      const hasRenderedStyle = (element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }
        let current = element;
        while (current) {
          const style = current.ownerDocument?.defaultView?.getComputedStyle?.(current) ?? getComputedStyle(current);
          if (
            current.hidden ||
            style.display === 'none' ||
            (current === element && (style.visibility === 'hidden' || style.visibility === 'collapse')) ||
            Number.parseFloat(style.opacity || '1') === 0
          ) {
            return false;
          }
          current = current.parentElement;
        }
        return true;
      };
      const isRenderedDiscoveryElement = (element) =>
        !!(
          element &&
          hasRenderedStyle(element) &&
          (element.offsetWidth || element.offsetHeight || element.getClientRects().length) &&
          intersectsViewport(element)
        );
      const discoveryRoots = Array.from(
        document.querySelectorAll(
          [
            '[role="dialog"]',
            '[role="search"]',
            '.msla-panel-root-Discovery',
            '[data-automation-id="msla-search-box"]',
            '.msla-search-box',
            '[data-automation-id*="recommendation"]',
            '[data-automation-id*="operation-search"]',
            '[data-testid*="recommendation"]',
            '[data-testid*="operation-search"]',
            '[class*="recommendation"]',
            '[class*="Recommendation"]',
            '[class*="operation-search"]',
            '[class*="operationSearch"]',
            '.msla-recommendation-panel',
            '.msla-recommendation-panel-container',
          ].join(', ')
        )
      ).filter(isRenderedDiscoveryElement);
      const discoveryControlSelector = 'input, [role="searchbox"], [role="combobox"], [contenteditable="true"]';
      const isDiscoveryControl = (element) =>
        element instanceof HTMLInputElement ||
        (typeof HTMLTextAreaElement !== 'undefined' && element instanceof HTMLTextAreaElement) ||
        element.getAttribute?.('role') === 'searchbox' ||
        element.getAttribute?.('role') === 'combobox' ||
        element.getAttribute?.('contenteditable') === 'true';
      const discoveryControls = discoveryRoots
        .flatMap((root) => [
          ...(isDiscoveryControl(root) ? [root] : []),
          ...Array.from(root.querySelectorAll?.(discoveryControlSelector) || []),
        ])
        .filter(isRenderedDiscoveryElement);
      const discoveryInputText = normalize(
        discoveryControls
          .map((element) => [
            element instanceof HTMLInputElement || (typeof HTMLTextAreaElement !== 'undefined' && element instanceof HTMLTextAreaElement)
              ? element.value
              : '',
            element.getAttribute?.('aria-label') || '',
            element.getAttribute?.('placeholder') || '',
            element.textContent || '',
          ].join(' '))
          .join(' ')
      );
      const discoveryText = normalize(discoveryRoots.map(visibleText).join(' ') + ' ' + discoveryInputText);
      counts.discoveryRoots = discoveryRoots.length;
      counts.discoveryControls = discoveryControls.length;
      ready =
        discoveryRoots.length > 0 &&
        (normalizedIncludes(discoveryText, 'add an action') ||
          normalizedIncludes(discoveryText, 'search') ||
          discoveryControls.length > 0);
      if (expectation.searchText) {
        ready = ready && normalizedIncludes(discoveryText, expectation.searchText);
      }
      if (discoveryRoots.length === 0) {
        reasonCodes.push('discovery-root-missing');
      } else if (discoveryControls.length === 0) {
        reasonCodes.push('discovery-control-missing');
      }
      reasonCodes.push(ready ? 'discovery-state-visible' : 'discovery-state-missing');
      break;
    case 'debug':
      ready = lowerText.includes('debug') || lowerText.includes('terminal') || lowerText.includes('running') || lowerText.includes('succeeded');
      reasonCodes.push(ready ? 'debug-state-visible' : 'debug-state-missing');
      break;
    case 'diagnostic':
      ready = true;
      reasonCodes.push('diagnostic-capture');
      break;
    default:
      reasonCodes.push('unknown-expectation');
  }
  if (requireNoLoader && loaders.length > 0 && expectation.kind !== 'diagnostic' && expectation.kind !== 'workbenchShell') {
    ready = false;
  }
  return {
    ready,
    reasonCodes,
    blockers,
    anchors,
    viewport: {
      width: Math.round(window.innerWidth || 0),
      height: Math.round(window.innerHeight || 0),
      deviceScaleFactor: Number(window.devicePixelRatio || 1),
    },
    counts,
    details,
    generation,
    revision,
    structuralRevision,
    scrollY: Math.round(window.scrollY || document.documentElement?.scrollTop || 0),
    expectationKind: expectation.kind,
    invalidationReasons: invalidation?.reasons || [],
    activeTabText,
    bodyBounds,
  };
})()
`;

export function buildScreenshotReadinessExpression(expectation: ScreenshotExpectation, generation: number, revision: number): string {
  return screenshotReadinessDomScript
    .replace('__EXPECTATION__', JSON.stringify(expectation))
    .replace('__GENERATION__', JSON.stringify(generation))
    .replace('__REVISION__', JSON.stringify(revision));
}

export function isStableScreenshotSample(previous: ScreenshotReadinessSnapshot, current: ScreenshotReadinessSnapshot): boolean {
  const countsAreStable =
    previous.expectationKind === 'workbenchShell'
      ? previous.counts.workbenchShellParts === current.counts.workbenchShellParts
      : JSON.stringify(previous.counts) === JSON.stringify(current.counts);
  const revisionIsStable =
    previous.expectationKind === 'workbenchShell'
      ? (previous.structuralRevision ?? previous.revision) === (current.structuralRevision ?? current.revision)
      : previous.revision === current.revision;

  return (
    previous.ready &&
    current.ready &&
    previous.generation === current.generation &&
    revisionIsStable &&
    previous.scrollY === current.scrollY &&
    previous.viewport.width === current.viewport.width &&
    previous.viewport.height === current.viewport.height &&
    previous.viewport.deviceScaleFactor === current.viewport.deviceScaleFactor &&
    countsAreStable &&
    JSON.stringify(previous.anchors.map((anchor) => anchor.bounds ?? null)) ===
      JSON.stringify(current.anchors.map((anchor) => anchor.bounds ?? null))
  );
}

export function buildScreenshotMetadata(input: {
  checkpoint: string;
  phase: string;
  classification: ScreenshotClassification;
  verdict: ScreenshotReadinessMetadata['verdict'];
  targetId: string;
  frameId: string;
  generation: number;
  timeoutMs: number;
  elapsedMs: number;
  samples: ScreenshotReadinessSnapshot[];
  captureAttempts: number;
  reasonCodes?: string[];
  events?: ScreenshotCaptureEvent[];
}): ScreenshotReadinessMetadata {
  const lastSample = input.samples.at(-1);
  return {
    schemaVersion: 1,
    checkpoint: sanitizeMetadataValue(input.checkpoint),
    phase: sanitizeMetadataValue(input.phase),
    classification: input.classification,
    verdict: input.verdict,
    target: {
      owner: 'workbench',
      opaqueTargetId: opaqueId(input.targetId),
      opaqueFrameId: opaqueId(input.frameId),
      generation: input.generation,
    },
    timing: {
      timeoutMs: input.timeoutMs,
      elapsedMs: input.elapsedMs,
      samples: input.samples.length,
      captureAttempts: input.captureAttempts,
    },
    geometry: {
      viewport: lastSample?.viewport ?? { width: 0, height: 0, deviceScaleFactor: 1 },
      anchors: (lastSample?.anchors ?? [])
        .slice(0, 8)
        .map((anchor) => ({ name: sanitizeMetadataValue(anchor.name), bounds: anchor.bounds })),
    },
    counts: lastSample?.counts ?? {},
    reasonCodes: (input.reasonCodes ?? lastSample?.reasonCodes ?? []).map(sanitizeMetadataValue).slice(0, 12),
    events: (input.events ?? []).slice(-80).map((event) => ({
      name: sanitizeMetadataValue(event.name),
      elapsedMs: event.elapsedMs,
      attempt: event.attempt,
      generation: event.generation,
      revision: event.revision,
      structuralRevision: event.structuralRevision,
      ownerRevision: event.ownerRevision,
      reasonCodes: event.reasonCodes?.map(sanitizeMetadataValue).slice(0, 12),
      blockers: event.blockers?.map(sanitizeMetadataValue).slice(0, 12),
      counts: event.counts,
      anchors: event.anchors?.slice(0, 8).map((anchor) => ({ name: sanitizeMetadataValue(anchor.name), bounds: anchor.bounds })),
      details: sanitizeMetadataDetails(event.details),
    })),
  };
}

export function sanitizeScreenshotSegment(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'screenshot';
}

function sanitizeMetadataValue(value: string): string {
  return sanitizeScreenshotSegment(value).slice(0, 120);
}

function opaqueId(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return `id-${hash.toString(16).padStart(8, '0')}`;
}

function sanitizeMetadataDetails(value: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }
  const json = JSON.stringify(redactMetadataDetails(value));
  if (json.length <= 4000) {
    return JSON.parse(json);
  }
  return { truncated: json.slice(0, 4000) };
}

function redactMetadataDetails(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactMetadataString(value).slice(0, 240);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map(redactMetadataDetails);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, entry]) => [sanitizeMetadataValue(key), isSensitiveMetadataKey(key) ? '[redacted]' : redactMetadataDetails(entry)])
    );
  }
  return value;
}

function isSensitiveMetadataKey(key: string): boolean {
  const normalizedKey = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return (
    /authorization|authentication|access[_-]?token|account[_-]?key|api[_-]?key|callback|client[_-]?secret|connection[_-]?key|connection[_-]?runtime[_-]?url|connection[_-]?string|credential|cookie|inputslink|keyvault|outputslink|password|sas|secret|signature|subscription-key|token|uri|url|x-api-key/i.test(
      key
    ) || /^(sig|se|sp|sv|srt|ss)$/.test(normalizedKey)
  );
}

function redactMetadataString(value: string): string {
  let redacted = value;
  redacted = redacted.replace(/\bAuthorization\s*:\s*(?:Basic|Bearer)?\s*[A-Za-z0-9+/=._~*-]+/gi, 'Authorization: [redacted]');
  redacted = redacted.replace(
    /((?:access[_-]?token|account[_-]?key|api[_-]?key|authorization|authentication|azurewebjobsstorage|client[_-]?secret|connection[_-]?key|connection[_-]?runtime[_-]?url|connection[_-]?string|credential|password|sas|secret|sig|signature|subscription-key|token|x-api-key|cookie)\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s,;}]+)/gi,
    '$1[redacted]'
  );
  redacted = redacted.replace(
    /((?:access[_-]?token|account[_-]?key|api[_-]?key|authorization|authentication|azurewebjobsstorage|client[_-]?secret|connection[_-]?key|connection[_-]?runtime[_-]?url|connection[_-]?string|credential|password|sas|secret|sig|signature|subscription-key|token|x-api-key|cookie)["']?\s*:\s*)("[^"]*"|'[^']*'|[^\s,}\]]+)/gi,
    '$1[redacted]'
  );
  redacted = redacted.replace(/\b(AccountKey|SharedAccessKey|Password|Pwd|User ID|Uid)=([^;,\s]+)/gi, '$1=[redacted]');
  redacted = redacted.replace(/\bBasic\s+[A-Za-z0-9+/=._~-]+/gi, 'Basic [redacted]');
  redacted = redacted.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]');
  redacted = redacted.replace(/https?:\/\/[^\s"')]+/gi, (urlText) => {
    try {
      const url = new URL(urlText);
      for (const key of Array.from(url.searchParams.keys())) {
        if (isSensitiveMetadataKey(key)) {
          url.searchParams.set(key, '[redacted]');
        }
      }
      return url.toString();
    } catch {
      return '[redacted-url]';
    }
  });
  return redacted;
}
