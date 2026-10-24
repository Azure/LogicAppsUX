export interface CopilotChatWorkbenchState {
  visible: boolean;
  matchCount: number;
  owners: Array<{
    kind: 'auxiliarybar' | 'sidebar' | 'panel' | 'editor' | 'unknown';
    label: string;
    unrelatedVisibleCount: number;
    bounds?: { left: number; top: number; width: number; height: number };
  }>;
}

export function buildCopilotChatStateExpression(): string {
  return `(() => {
    const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
    const hasVisibleStyle = (element) => {
      let current = element;
      while (current instanceof HTMLElement) {
        if (current.hidden || current.getAttribute('aria-hidden') === 'true') {
          return false;
        }
        const style = getComputedStyle(current);
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number.parseFloat(style.opacity || '1') === 0) {
          return false;
        }
        current = current.parentElement;
      }
      return true;
    };
    const isVisible = (element) => {
      if (!(element instanceof HTMLElement) || !hasVisibleStyle(element) || !(element.offsetWidth || element.offsetHeight || element.getClientRects().length)) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
    };
    const identityValues = (element) =>
      [
        element?.getAttribute?.('aria-label') || '',
        element?.getAttribute?.('title') || '',
        element?.getAttribute?.('id') || '',
        element?.getAttribute?.('data-id') || '',
        element?.getAttribute?.('data-view-id') || '',
      ].map((value) => normalize(value).toLowerCase());
    const isInactiveSelector = (element) => {
      const selector = element.closest?.('[role="tab"], [aria-selected]');
      return selector instanceof HTMLElement && selector.getAttribute('aria-selected') !== 'true';
    };
    const isNavigationOrCommandSurface = (element) => {
      if (!(element instanceof HTMLElement)) {
        return true;
      }
      const navigationAncestor = element.closest?.('[role="tab"], button, [role="button"]');
      if (navigationAncestor instanceof HTMLElement) {
        return true;
      }
      const role = normalize(element.getAttribute('role')).toLowerCase();
      const tagName = normalize(element.tagName).toLowerCase();
      return role === 'tab' || role === 'button' || tagName === 'button' || isInactiveSelector(element);
    };
    const isGitHubCopilotChat = (element) => {
      if (isNavigationOrCommandSurface(element)) {
        return false;
      }
      const attributeIdentities = identityValues(element);
      return attributeIdentities.some(
        (value) =>
          value === 'github copilot chat' ||
          value === 'github.copilot.chat' ||
          value === 'github-copilot-chat' ||
          value === 'workbench.panel.chat' ||
          value === 'workbench.panel.chat.view.copilot'
      );
    };
    const ownerKind = (owner) => {
      if (!owner?.matches) {
        return 'unknown';
      }
      if (owner.matches('.auxiliarybar, [id="workbench.parts.auxiliarybar"], [aria-label*="Secondary Side Bar" i]')) {
        return 'auxiliarybar';
      }
      if (owner.matches('.sidebar, [id="workbench.parts.sidebar"], [aria-label*="Side Bar" i]')) {
        return 'sidebar';
      }
      if (owner.matches('.panel, [id="workbench.parts.panel"], [aria-label*="Panel" i]')) {
        return 'panel';
      }
      if (owner.matches('.editor-group-container, .part.editor, [id="workbench.parts.editor"]')) {
        return 'editor';
      }
      return 'unknown';
    };
    const isIndependentViewBoundary = (element) =>
      element instanceof HTMLElement &&
      !isGitHubCopilotChat(element) &&
      (normalize(element.getAttribute('data-view-id')) || normalize(element.getAttribute('id')));
    const summarize = (owner) => {
      const rect = owner?.getBoundingClientRect?.();
      const ownedMatches = new Set(matches.filter((match) => owner === match || owner?.contains?.(match)));
      const isChatOwned = (element) =>
        Array.from(ownedMatches).some(
          (match) => element === match || element.contains?.(match) || (!isIndependentViewBoundary(element) && match.contains?.(element))
        );
      const visibleViewBoundaries = Array.from(
        owner?.querySelectorAll?.('[data-view-id], [id], [role="tree"], [role="region"], [aria-label]') || []
      ).filter((element) => element instanceof HTMLElement && isVisible(element) && !isGitHubCopilotChat(element));
      const unrelatedVisibleCount = visibleViewBoundaries.filter((element) => !isChatOwned(element)).length + Array.from(owner?.children || []).filter(
        (child) => child instanceof HTMLElement && isVisible(child) && !isChatOwned(child) && visibleViewBoundaries.every((view) => view !== child && !child.contains(view))
      ).length;
      return {
        kind: ownerKind(owner),
        label: 'copilot-chat',
        unrelatedVisibleCount,
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
    const ownerSelector = [
      '.auxiliarybar',
      '[id="workbench.parts.auxiliarybar"]',
      '.sidebar',
      '[id="workbench.parts.sidebar"]',
      '.panel',
      '[id="workbench.parts.panel"]',
      '.editor-group-container',
      '.part.editor',
      '[id="workbench.parts.editor"]',
    ].join(', ');
    const matches = Array.from(document.querySelectorAll('*')).filter(isVisible).filter(isGitHubCopilotChat);
    const matchedOwners = Array.from(
      new Set(
        matches
          .map((element) => element.closest(ownerSelector))
          .filter((owner) => owner instanceof HTMLElement)
          .filter(isVisible)
      )
    );
    return {
      visible: matchedOwners.length > 0,
      matchCount: matches.length,
      owners: matchedOwners.slice(0, 6).map(summarize),
    };
  })()`;
}
