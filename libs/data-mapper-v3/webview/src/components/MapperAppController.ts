/**
 * BizTalk Data Mapper - Mapper operations controller
 */

import type { SchemaNodeView, SchemaTreeRenderer } from './SchemaTreeRenderer';
import type { MappingCanvas } from './MappingCanvas';
import type { FunctoidPalette } from './FunctoidPalette';
import type { FunctoidConfigDialog, FunctoidConfigInput, FunctoidConfigResult } from './FunctoidConfigDialog';
import type { ScriptingConfigDialog, ScriptingConfigResult, ScriptingConfigType, ScriptingFunctoidSummary } from './ScriptingConfigDialog';
import type { SchemaNodePropertiesDialog, SchemaNodePropertiesViewModel, SchemaNodePropertyRow } from './SchemaNodePropertiesDialog';
import { SchemaPathResolver } from '../../../src/schema/schemaPathResolver';
import type { LinkPropertiesDialog } from './LinkPropertiesDialog';
import type { EmptySchemaPlaceholder } from './EmptySchemaPlaceholder';
import type { MapperStatusBar } from './MapperStatusBar';
import type { MapperPageBar } from './MapperPageBar';
import type { CopilotPanel } from './CopilotPanel';
import type { BottomPanelTab, MapperBottomPanel } from './MapperBottomPanel';
import type { MapperContextMenu, ContextMenuItem } from './MapperContextMenu';
import type { MapperNotification, NotificationType } from './MapperNotification';
import type { MapperToolbar } from './MapperToolbar';
import {
  type AssemblyClassInfo,
  type AssemblyMethodInfo,
  createInitialMapperViewState,
  type HostToWebviewMessage,
  type MapEditorVsCodeApi,
  type MapperViewState,
} from '../../../src/protocol/mapEditorProtocol';
import {
  LinkEndpointType,
  ParameterType,
  SourceLinkOption,
  TargetLinkOption,
  type MapFunctoid,
  type MapLink,
} from '../../../src/model/mapModel';
import {
  copyMappingSelection,
  findLinkingNode,
  getSchemaMatchSuggestions,
  linkSchemaSubtrees,
  moveMappingSelection,
  pasteMappingSelection,
  replaceLinkEndpoint,
  synchronizeFunctoidLinks,
  validateMappingLink,
  type MappingClipboard,
} from './mapLinkOperations';

interface ScriptingConfigDraft {
  functoidId: string;
  label: string;
  comments: string;
  scriptType: ScriptingConfigType;
  scriptBody: string;
  assemblyReferences: string;
  assemblyPath: string;
  className: string;
  methodName: string;
  assemblyClasses?: AssemblyClassInfo[];
}

interface FunctoidInputDraft {
  type: typeof ParameterType.Link | typeof ParameterType.Constant;
  linkId?: string;
  value: string;
  guid?: string;
  defaultValue?: string;
}

interface SchemaNodeProperties {
  node: SchemaNodeView;
  side: 'source' | 'target';
  schemaNamespace?: string;
}

export interface MapperAppElements {
  container: HTMLElement;
  copilot: CopilotPanel;
  toolbar: MapperToolbar;
  palette: FunctoidPalette;
  mappingArea: HTMLElement;
  sourceTree: SchemaTreeRenderer;
  sourceEmpty: EmptySchemaPlaceholder;
  canvas: MappingCanvas;
  pageBar: MapperPageBar;
  targetTree: SchemaTreeRenderer;
  targetEmpty: EmptySchemaPlaceholder;
  bottomPanel: MapperBottomPanel;
  statusBar: MapperStatusBar;
  schemaDialog: SchemaNodePropertiesDialog;
  linkDialog: LinkPropertiesDialog;
  scriptingDialog: ScriptingConfigDialog;
  functoidDialog: FunctoidConfigDialog;
  contextMenu: MapperContextMenu;
  notification: MapperNotification;
}

export class MapperAppController {
  private state: MapperViewState;
  private initialized = false;
  private sourceTree: SchemaTreeRenderer | null = null;
  private targetTree: SchemaTreeRenderer | null = null;
  private readonly canvas: MappingCanvas;
  private palette: FunctoidPalette | null = null;
  private pendingLink: { type: 'schemaNode' | 'functoid'; id: string; side: 'source' | 'target' } | null = null;
  private replacingLink: { pageId: string; linkId: string; end: 'source' | 'target' } | null = null;
  private schemaLinkSourcePath: string | null = null;
  private contextMenuFrame: number | null = null;
  private scriptingConfigDraft: ScriptingConfigDraft | null = null;
  private scriptingDialog: ScriptingConfigDialog | null = null;
  private bottomPanel: MapperBottomPanel | null = null;
  private functoidPropertiesId: string | null = null;
  private functoidInputsDraft: FunctoidInputDraft[] | null = null;
  private functoidLabelDraft = '';
  private functoidCommentsDraft = '';
  private schemaNodeProperties: SchemaNodeProperties | null = null;
  private linkProperties: { pageId: string; linkIds: string[] } | null = null;
  private copilotPanelOpen = false;
  private copilotBusy = false;
  private copilotDraft = 'Take the XSLT file and generate the map.';
  private copilotMessage = '';
  private copilotContextFiles: Array<{ id: string; name: string; size: number }> = [];
  private toolbarStatusMessage = '';
  private linkPointerStart: { x: number; y: number } | null = null;
  private linkPointerMoved = false;
  private linkPreviewFrame: number | null = null;
  private pendingLinkPreviewPoint: { x: number; y: number } | null = null;
  private redrawFrame: number | null = null;
  private pendingFullCanvasRedraw = false;
  private disposed = false;

  private resizeObserver: ResizeObserver | null = null;

  private toolbarEl!: MapperToolbar;
  private pageBarEl!: MapperPageBar;
  private statusBarEl!: MapperStatusBar;
  private lastSourceSchema: unknown = undefined;
  private lastSourceSignature = '';
  private lastTargetSchema: unknown = undefined;
  private lastTargetSignature = '';
  private lastFunctoidsRef: unknown = undefined;
  private lastModalKey = '';
  private notificationTimeout: ReturnType<typeof setTimeout> | null = null;
  private contextMenuCloseHandler: ((event: MouseEvent) => void) | null = null;

  constructor(
    private readonly elements: MapperAppElements,
    private readonly vscode: MapEditorVsCodeApi
  ) {
    this.state = createInitialMapperViewState();
    this.toolbarEl = elements.toolbar;
    this.palette = elements.palette;
    this.canvas = elements.canvas;
    this.pageBarEl = elements.pageBar;
    this.bottomPanel = elements.bottomPanel;
    this.statusBarEl = elements.statusBar;
  }

  public mount(): void {
    this.disposed = false;
    this.resizeObserver = new ResizeObserver(() => this.redrawLinks(true));
    this.resizeObserver.observe(this.elements.mappingArea);
    this.resizeObserver.observe(this.elements.canvas);
    window.removeEventListener('resize', this.handleResize);
    window.addEventListener('resize', this.handleResize);
    this.elements.sourceTree.addEventListener('scroll', this.handleSchemaScroll, { passive: true });
    this.elements.targetTree.addEventListener('scroll', this.handleSchemaScroll, { passive: true });
    this.renderView();
    this.setupKeyboardShortcuts();
  }

  public dispose(): void {
    this.disposed = true;
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('contextmenu', this.handleContextMenu);
    document.removeEventListener('pointermove', this.handleLinkPointerMove);
    document.removeEventListener('pointerdown', this.handleEndpointPointerDown, true);
    document.removeEventListener('pointerup', this.handleLinkPointerUp);
    window.removeEventListener('resize', this.handleResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.elements.sourceTree.removeEventListener('scroll', this.handleSchemaScroll);
    this.elements.targetTree.removeEventListener('scroll', this.handleSchemaScroll);
    if (this.linkPreviewFrame !== null) {
      cancelAnimationFrame(this.linkPreviewFrame);
      this.linkPreviewFrame = null;
    }
    if (this.redrawFrame !== null) {
      cancelAnimationFrame(this.redrawFrame);
      this.redrawFrame = null;
    }
    this.hideContextMenu();
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('contextmenu', this.handleContextMenu);
    document.addEventListener('pointermove', this.handleLinkPointerMove);
    document.addEventListener('pointerdown', this.handleEndpointPointerDown, true);
    document.addEventListener('pointerup', this.handleLinkPointerUp);
  }

  private readonly handleEndpointPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !(event.target instanceof Element) || !event.target.matches('.node-connector, .functoid-connector')) {
      return;
    }
    const handle = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find((element) => element.matches('[aria-pressed="true"] [data-link-end]'));
    const group = handle?.closest('[data-link-id]');
    const linkId = group?.getAttribute('data-link-id');
    const end = handle?.getAttribute('data-link-end');
    const fixed = group?.querySelector(`[data-link-end="${end === 'source' ? 'target' : 'source'}"]`)?.getBoundingClientRect();
    if (linkId && fixed && (end === 'source' || end === 'target')) {
      event.preventDefault();
      event.stopPropagation();
      this.beginLinkRetarget(linkId, end, fixed.left + fixed.width / 2, fixed.top + fixed.height / 2);
    }
  };

  private readonly handleLinkPointerMove = (event: PointerEvent): void => {
    if (!this.linkPointerStart) {
      return;
    }
    this.linkPointerMoved ||= Math.hypot(event.clientX - this.linkPointerStart.x, event.clientY - this.linkPointerStart.y) > 3;
    this.pendingLinkPreviewPoint = { x: event.clientX, y: event.clientY };
    if (this.linkPreviewFrame === null) {
      this.linkPreviewFrame = requestAnimationFrame(() => {
        this.linkPreviewFrame = null;
        if (this.pendingLinkPreviewPoint) {
          this.canvas.updateLinkPreview(this.pendingLinkPreviewPoint.x, this.pendingLinkPreviewPoint.y);
          this.pendingLinkPreviewPoint = null;
        }
      });
    }
  };

  private readonly handleLinkPointerUp = (event: PointerEvent): void => {
    if (this.replacingLink && this.pendingLink && this.linkPointerMoved) {
      const connectors = document.elementsFromPoint(event.clientX, event.clientY);
      const connector = connectors.find((element) => element.matches('.node-connector, .functoid-connector'));
      if (connector) {
        const path = connector.getAttribute('data-path');
        if (path && connector.getAttribute('data-side') === 'source') {
          this.onSourceNodePointerUp(path);
        } else if (path && connector.getAttribute('data-side') === 'target') {
          this.onTargetNodePointerUp(path);
        } else {
          const id = connector.closest('.functoid-node')?.getAttribute('data-id');
          if (id) {
            this.onFunctoidConnectorPointerUp(id, connector.classList.contains('input-connector') ? 'input' : 'output');
          }
        }
      }
    }
    this.finishLinkPointer();
  };

  private finishLinkPointer(): void {
    if (this.linkPointerMoved && this.pendingLink) {
      this.pendingLink = null;
      this.replacingLink = null;
      this.updateStatusMessage('');
    }
    this.linkPointerStart = null;
    this.linkPointerMoved = false;
    this.pendingLinkPreviewPoint = null;
    if (this.linkPreviewFrame !== null) {
      cancelAnimationFrame(this.linkPreviewFrame);
      this.linkPreviewFrame = null;
    }
    this.canvas.clearLinkPreview();
  }

  private beginLinkPointer(clientX: number, clientY: number): void {
    this.linkPointerStart = { x: clientX, y: clientY };
    this.linkPointerMoved = false;
    this.canvas.beginLinkPreview(clientX, clientY);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.linkProperties) {
      if (event.key === 'Escape') {
        this.closeLinkProperties();
        event.preventDefault();
      }
      return;
    }
    if (event.key === 'Escape' && (this.functoidPropertiesId || this.scriptingConfigDraft || this.schemaNodeProperties)) {
      if (this.schemaNodeProperties) {
        this.closeSchemaNodeProperties();
      } else {
        this.closeFunctoidDialog();
      }
      event.preventDefault();
      return;
    }
    if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) {
      return;
    }
    const command = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (command && key === 'a') {
      const page = this.state.map?.pages[this.state.activePage];
      if (page) {
        event.preventDefault();
        this.setSelection(
          page.links.map((link) => link.id),
          page.functoids.map((functoid) => functoid.id)
        );
        this.redrawLinks();
      }
      return;
    }
    if (event.key === 'Delete' || (command && key === 'x')) {
      if (command && key === 'x') {
        this.copySelected();
      }
      this.deleteSelected();
      event.preventDefault();
    }
    if (event.key === 'Escape') {
      this.pendingLink = null;
      this.replacingLink = null;
      this.canvas.clearLinkPreview();
      this.setSelection([], []);
      this.updateStatusMessage('');
      this.redrawLinks();
    }
    if (command && key === 'c') {
      event.preventDefault();
      this.copySelected();
    }
    if (command && key === 'v') {
      event.preventDefault();
      this.pasteClipboard();
    }
  };

  private readonly handleContextMenu = (event: MouseEvent): void => {
    if (this.linkProperties) {
      return;
    }
    const row = event.target instanceof Element ? event.target.closest('.tree-node') : null;
    const path = row?.getAttribute('data-path');
    const side = row?.getAttribute('data-side');
    if (path && (side === 'source' || side === 'target')) {
      event.preventDefault();
      this.showSchemaLinkMenu(side, path, event.clientX, event.clientY);
      return;
    }
    const linkId = event.target instanceof Element ? event.target.closest('[data-link-id]')?.getAttribute('data-link-id') : undefined;
    const functoidId = event.target instanceof Element ? event.target.closest('.functoid-node')?.getAttribute('data-id') : undefined;
    if (linkId && !this.getSelection().links.includes(linkId)) {
      this.setSelection([linkId], []);
      this.redrawLinks();
    } else if (functoidId && !this.getSelection().functoids.includes(functoidId)) {
      this.setSelection([], [functoidId]);
      this.redrawLinks();
    }
    event.preventDefault();
    this.showContextMenu(event.clientX, event.clientY);
  };

  private readonly handleResize = (): void => this.redrawLinks(true);
  private readonly handleSchemaScroll = (): void => this.redrawLinks(true);

  private clipboard: MappingClipboard | null = null;

  private getSelection(): { links: string[]; functoids: string[] } {
    return {
      links: this.state.selectedLinks ?? (this.state.selectedLink ? [this.state.selectedLink] : []),
      functoids: this.state.selectedFunctoids ?? (this.state.selectedFunctoid ? [this.state.selectedFunctoid] : []),
    };
  }

  private setSelection(links: string[], functoids: string[]): void {
    this.state.selectedSchemaNode = undefined;
    this.sourceTree?.setSelectedPath?.(undefined);
    this.targetTree?.setSelectedPath?.(undefined);
    this.state.selectedLinks = links;
    this.state.selectedFunctoids = functoids;
    this.state.selectedLink = links.at(-1) ?? null;
    this.state.selectedFunctoid = functoids.at(-1) ?? null;
    this.updateLinkTrace();
    this.syncBottom();
  }

  private updateLinkTrace(): void {
    const page = this.state.map?.pages[this.state.activePage];
    const selection = this.getSelection();
    const links = new Set(selection.links);
    const functoids = new Set(selection.functoids);
    const nodeSelection = this.state.selectedSchemaNode;
    if (page && nodeSelection) {
      const schema = nodeSelection.side === 'source' ? this.state.sourceSchema : this.state.targetSchema;
      const resolver = new SchemaPathResolver(schema ?? undefined, this.state.map?.options.ignoreNamespacesForLinks);
      for (const link of page.links) {
        const path =
          link[`${nodeSelection.side}Type`] === 'schemaNode'
            ? resolver.resolve(link[`${nodeSelection.side}Path`] || link[`${nodeSelection.side}Id`])?.path
            : undefined;
        if (path && (path === nodeSelection.path || path.startsWith(`${nodeSelection.path}/`))) {
          links.add(link.id);
        }
      }
    }
    if (page && (this.state.linkView?.trace || this.state.linkView?.selectionOnly)) {
      for (const direction of ['source', 'target'] as const) {
        const pending = [...selection.functoids];
        for (const link of page.links) {
          if (links.has(link.id) && link[`${direction}Type`] === 'functoid') {
            pending.push(link[`${direction}Id`]);
          }
        }
        const visited = new Set<string>();
        while (pending.length) {
          const id = pending.pop()!;
          if (visited.has(id)) {
            continue;
          }
          visited.add(id);
          functoids.add(id);
          for (const link of page.links) {
            const connected =
              direction === 'source'
                ? link.targetType === 'functoid' && link.targetId === id
                : link.sourceType === 'functoid' && link.sourceId === id;
            if (connected) {
              links.add(link.id);
              if (link[`${direction}Type`] === 'functoid') {
                pending.push(link[`${direction}Id`]);
              }
            }
          }
        }
      }
    }
    this.state.highlightedLinks = this.state.linkView?.trace ? [...links] : [];
    this.state.highlightedFunctoids = this.state.linkView?.trace ? [...functoids] : [];
    const filtering =
      this.state.linkView?.selectionOnly && (!!nodeSelection || selection.links.length > 0 || selection.functoids.length > 0);
    this.state.filteredLinkIds = filtering ? [...links] : undefined;
    this.state.filteredFunctoidIds = filtering ? [...functoids] : undefined;
    this.sourceTree?.updateConnectedPaths?.(this.getConnectedPaths('source'));
    this.targetTree?.updateConnectedPaths?.(this.getConnectedPaths('target'));
    const sourcePaths = new Set<string>();
    const targetPaths = new Set<string>();
    for (const link of page?.links ?? []) {
      if (links.has(link.id)) {
        if (link.sourceType === 'schemaNode') {
          sourcePaths.add(link.sourcePath || link.sourceId);
        }
        if (link.targetType === 'schemaNode') {
          targetPaths.add(link.targetPath || link.targetId);
        }
      }
    }
    const reveal = this.state.linkView?.autoReveal ?? true;
    this.sourceTree?.setLinkHighlights?.(sourcePaths, reveal);
    this.targetTree?.setLinkHighlights?.(targetPaths, reveal);
    if (reveal) {
      const node = Array.from(this.canvas.querySelectorAll<SVGElement>('.functoid-node')).find((element) =>
        functoids.has(element.dataset.id ?? '')
      );
      if (node) {
        const bounds = node.getBoundingClientRect();
        const viewport = this.canvas.getBoundingClientRect();
        if (bounds.left < viewport.left || bounds.right > viewport.right) {
          this.canvas.scrollLeft += bounds.left - viewport.left - this.canvas.clientWidth / 2;
        }
        if (bounds.top < viewport.top || bounds.bottom > viewport.bottom) {
          this.canvas.scrollTop += bounds.top - viewport.top - this.canvas.clientHeight / 2;
        }
      }
    }
  }

  private copySelected(): void {
    if (!this.state.map) {
      return;
    }
    const page = this.state.map.pages[this.state.activePage];
    const selection = this.getSelection();
    if (selection.links.length === 0 && selection.functoids.length === 0) {
      return;
    }
    this.clipboard = copyMappingSelection(page, selection.links, selection.functoids);
    this.updateStatusMessage(
      selection.functoids.length === 1 && selection.links.length === 0
        ? 'Copied functoid'
        : selection.links.length === 1 && selection.functoids.length === 0
          ? 'Copied link'
          : 'Copied selected mappings'
    );
    setTimeout(() => this.updateStatusMessage(''), 2000);
  }

  private pasteClipboard(): void {
    if (!this.clipboard || !this.state.map) {
      return;
    }
    const page = this.state.map.pages[this.state.activePage];
    const result = pasteMappingSelection(page, this.clipboard, this.state.functoids, this.getLinkValidationContext());
    if (result.linkIds.length > 0 || result.functoidIds.length > 0) {
      this.setSelection(result.linkIds, result.functoidIds);
      this.updateMap(this.state.map);
      this.renderView();
    }
    this.updateStatusMessage(result.skipped > 0 ? `Skipped ${result.skipped} duplicate or invalid links` : 'Pasted selected mappings');
    setTimeout(() => this.updateStatusMessage(''), 2000);
  }

  private showContextMenu(x: number, y: number, customItems?: ContextMenuItem[]): void {
    this.hideContextMenu();
    const hasSelection = !!(this.state.selectedLink || this.state.selectedFunctoid);
    const items: ContextMenuItem[] = customItems ?? [
      ...(this.state.selectedLink && this.getSelection().functoids.length === 0
        ? [
            {
              label: 'Link Properties',
              action: () => {
                const linkIds = this.getSelection().links;
                this.hideContextMenu();
                if (linkIds.length > 0) {
                  this.openLinkProperties(linkIds);
                }
              },
            },
            {
              label: 'Change link source',
              disabled: this.getSelection().links.length !== 1,
              action: () => this.beginLinkRetarget(this.state.selectedLink!, 'source'),
            },
            {
              label: 'Change link target',
              disabled: this.getSelection().links.length !== 1,
              action: () => this.beginLinkRetarget(this.state.selectedLink!, 'target'),
            },
          ]
        : []),
      {
        label: '✂️ Cut',
        shortcut: 'Ctrl+X',
        disabled: !hasSelection,
        action: () => {
          this.copySelected();
          this.deleteSelected();
        },
      },
      { label: '📋 Copy', shortcut: 'Ctrl+C', disabled: !hasSelection, action: () => this.copySelected() },
      { label: '📄 Paste', shortcut: 'Ctrl+V', disabled: !this.clipboard, action: () => this.pasteClipboard() },
      { label: '', divider: true, action: () => {} },
      { label: '🗑️ Delete', shortcut: 'Del', disabled: !hasSelection, action: () => this.deleteSelected() },
      {
        label: 'Select All',
        shortcut: 'Ctrl+A',
        disabled: !this.state.map,
        action: () => {
          const page = this.state.map?.pages[this.state.activePage];
          if (page) {
            this.setSelection(
              page.links.map((link) => link.id),
              page.functoids.map((functoid) => functoid.id)
            );
            this.redrawLinks();
          }
        },
      },
      {
        label: 'Move to Page',
        disabled: !hasSelection,
        action: () => {},
        children: [
          ...(this.state.map?.pages.flatMap((page, index) =>
            index === this.state.activePage ? [] : [{ label: page.name, action: () => this.moveSelectionToPage(index) }]
          ) ?? []),
          { label: 'New Page', action: () => this.moveSelectionToPage() },
        ],
      },
      { label: '', divider: true, action: () => {} },
      { label: '🔗 Auto-Link by Name', disabled: !this.state.map, action: () => this.autoLinkByName() },
      { label: '✓ Validate Map', disabled: !this.state.map, action: () => this.validateMap() },
    ];

    const menu = this.elements.contextMenu;
    menu.hidden = false;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.configure(items, () => this.hideContextMenu());
    this.contextMenuFrame = requestAnimationFrame(() => {
      this.contextMenuFrame = null;
      if (!menu.hidden) {
        const bounds = menu.getBoundingClientRect();
        menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8))}px`;
        menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - bounds.height - 8))}px`;
      }
    });

    // Close on click outside
    this.contextMenuCloseHandler = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        this.hideContextMenu();
      }
    };
    setTimeout(() => {
      if (this.contextMenuCloseHandler) {
        document.addEventListener('click', this.contextMenuCloseHandler);
      }
    }, 0);
  }

  private showSchemaLinkMenu(side: 'source' | 'target', path: string, x: number, y: number): void {
    const schema = side === 'source' ? this.state.sourceSchema : this.state.targetSchema;
    const node = schema && findLinkingNode(schema.rootElement, path);
    const tree = side === 'source' ? this.sourceTree : this.targetTree;
    const commonItems: ContextMenuItem[] = [
      {
        label: 'Properties',
        disabled: !node,
        action: () => {
          if (node) {
            this.openSchemaNodeProperties(node, side);
          }
        },
      },
      { label: 'Copy XPath', action: () => this.vscode.postMessage({ type: 'copyText', data: { text: path } }) },
      {
        label: 'Expand Subtree',
        disabled: !node || (node.children.length === 0 && node.attributes.length === 0),
        action: () => tree?.expandSubtree(path, true),
      },
      {
        label: 'Collapse Subtree',
        disabled: !node || (node.children.length === 0 && node.attributes.length === 0),
        action: () => tree?.expandSubtree(path, false),
      },
      {
        label: 'Trace Related Mappings',
        disabled: !node,
        action: () => {
          if (node) {
            this.selectSchemaNode(node, side);
            this.setNodeMappingView(false);
          }
        },
      },
      {
        label: 'Show Related Mappings Only',
        disabled: !node,
        action: () => {
          if (node) {
            this.selectSchemaNode(node, side);
            this.setNodeMappingView(true);
          }
        },
      },
      { label: 'Show All Mappings', action: () => this.setNodeMappingView(false) },
      {
        label: 'Suggest Matches',
        disabled: !node,
        action: () => {
          const page = this.state.map?.pages[this.state.activePage];
          const oppositeSchema = side === 'source' ? this.state.targetSchema : this.state.sourceSchema;
          const oppositeTree = side === 'source' ? this.targetTree : this.sourceTree;
          if (!page || !node || !oppositeSchema) {
            return;
          }
          const matches = getSchemaMatchSuggestions(page, node, oppositeSchema.rootElement, side, this.getLinkValidationContext());
          oppositeTree?.setSuggestedMatches(new Set(matches.map((match) => match.node.path)));
          this.showContextMenu(
            x,
            y,
            matches.length
              ? matches.map((match) => ({
                  label: `${match.node.path} (${match.score}%)`,
                  action: () => {
                    this.selectSchemaNode(match.node, side === 'source' ? 'target' : 'source');
                    oppositeTree?.revealNode(match.node.path);
                  },
                }))
              : [{ label: 'No matching nodes', disabled: true, action: () => {} }]
          );
        },
      },
      {
        label: 'Clear Match Suggestions',
        action: () => {
          this.sourceTree?.setSuggestedMatches(new Set());
          this.targetTree?.setSuggestedMatches(new Set());
        },
      },
      { label: '', divider: true, action: () => {} },
    ];
    if (side === 'source') {
      this.showContextMenu(x, y, [
        ...commonItems,
        {
          label: 'Link from Here',
          action: () => {
            this.schemaLinkSourcePath = path;
            for (const row of Array.from(this.elements.sourceTree.querySelectorAll<HTMLElement>('.tree-node'))) {
              row.toggleAttribute('data-link-source', row.dataset.path === path);
            }
          },
        },
      ]);
      return;
    }
    const sourcePath =
      this.pendingLink?.side === 'source' && this.pendingLink.type === 'schemaNode' ? this.pendingLink.id : this.schemaLinkSourcePath;
    const source = sourcePath && this.state.sourceSchema ? findLinkingNode(this.state.sourceSchema.rootElement, sourcePath) : undefined;
    const target = this.state.targetSchema ? findLinkingNode(this.state.targetSchema.rootElement, path) : undefined;
    const connect = (strategy: 'direct' | 'name' | 'structure' | 'massCopy'): void => {
      const page = this.state.map?.pages[this.state.activePage];
      if (!page || !source || !target || !this.state.map) {
        return;
      }
      this.pendingLink = null;
      this.replacingLink = null;
      this.canvas.clearLinkPreview();
      if (strategy === 'direct') {
        this.completeLinkCreation({ type: 'schemaNode', id: source.path }, { type: 'schemaNode', id: target.path });
        return;
      }
      if (strategy === 'massCopy') {
        const definition = this.state.functoids.find((functoid) => functoid.name === 'Mass Copy');
        if (!definition) {
          return;
        }
        const existing = page.functoids.some(
          (functoid) =>
            functoid.functoidId === definition.id &&
            page.links.some((link) => link.sourceType === 'schemaNode' && link.sourceId === source.path && link.targetId === functoid.id) &&
            page.links.some((link) => link.sourceId === functoid.id && link.targetType === 'schemaNode' && link.targetId === target.path)
        );
        if (existing) {
          this.updateStatusMessage('Mass Copy mapping already exists');
          return;
        }
        const id = `f_${crypto.randomUUID()}`;
        const functoid: MapFunctoid = {
          id,
          functoidId: definition.id,
          category: definition.category,
          name: definition.name,
          x: Math.max(40, this.canvas.clientWidth / 2 - 28),
          y: 60 + page.functoids.length * 60,
          inputLinks: [],
          outputLinks: [],
          parameters: [],
        };
        const inputId = `link_${crypto.randomUUID()}`;
        const outputId = `link_${crypto.randomUUID()}`;
        const links: MapLink[] = [
          { id: inputId, sourceId: source.path, sourcePath: source.path, sourceType: 'schemaNode', targetId: id, targetType: 'functoid' },
          { id: outputId, sourceId: id, sourceType: 'functoid', targetId: target.path, targetPath: target.path, targetType: 'schemaNode' },
        ];
        const candidatePage = { ...page, functoids: [...page.functoids, functoid] };
        for (const link of links) {
          const error = validateMappingLink(candidatePage, link, this.getLinkValidationContext());
          if (error) {
            this.updateStatusMessage(error);
            return;
          }
        }
        page.functoids.push(functoid);
        page.links.push(...links);
        synchronizeFunctoidLinks(page);
        this.setSelection([inputId, outputId], [id]);
      } else {
        const ids = linkSchemaSubtrees(page, source, target, strategy, this.getLinkValidationContext());
        this.updateStatusMessage(`${ids.length} link(s) created`);
        if (ids.length === 0) {
          return;
        }
        this.setSelection(ids, []);
      }
      this.updateMap(this.state.map);
      this.renderView();
    };
    this.showContextMenu(x, y, [
      ...commonItems,
      { label: 'Direct Link', disabled: !source || !target, action: () => connect('direct') },
      { label: 'Link by Name', disabled: !source || !target, action: () => connect('name') },
      { label: 'Link by Structure', disabled: !source || !target, action: () => connect('structure') },
      {
        label: 'Mass Copy',
        disabled: !source || !target || !this.state.functoids.some((functoid) => functoid.name === 'Mass Copy'),
        action: () => connect('massCopy'),
      },
    ]);
  }

  private moveSelectionToPage(index?: number): void {
    const map = this.state.map;
    if (!map) {
      return;
    }
    const selection = this.getSelection();
    if (selection.links.length === 0 && selection.functoids.length === 0) {
      return;
    }
    if (index === undefined) {
      let pageNumber = map.pages.length + 1;
      while (map.pages.some((page) => page.name === `Page ${pageNumber}`)) {
        pageNumber++;
      }
      map.pages.push({ id: `page_${crypto.randomUUID()}`, name: `Page ${pageNumber}`, links: [], functoids: [] });
      index = map.pages.length - 1;
    }
    const destination = map.pages[index];
    if (!destination || index === this.state.activePage) {
      return;
    }
    const moved = moveMappingSelection(map.pages[this.state.activePage], destination, selection.links, selection.functoids);
    this.state.activePage = index;
    this.pendingLink = null;
    this.replacingLink = null;
    this.canvas.clearLinkPreview();
    this.setSelection(moved.linkIds, moved.functoidIds);
    this.updateMap(map);
    this.renderView();
  }

  private hideContextMenu(): void {
    if (this.contextMenuFrame !== null) {
      cancelAnimationFrame(this.contextMenuFrame);
      this.contextMenuFrame = null;
    }
    this.elements.contextMenu.hidden = true;
    if (this.contextMenuCloseHandler) {
      document.removeEventListener('click', this.contextMenuCloseHandler);
      this.contextMenuCloseHandler = null;
    }
  }

  public handleMessage(message: HostToWebviewMessage): void {
    switch (message.type) {
      case 'executeCompile':
        this.validateAndCompile();
        break;
      case 'executeTestMap':
        this.runTestMap();
        break;
      case 'init': {
        this.initialized = true;
        this.clearSchemaNodeSelection();
        this.state.compilerLinks = undefined;
        this.state.map = message.data.map;
        this.state.sourceSchema = message.data.sourceSchema;
        this.state.targetSchema = message.data.targetSchema;
        this.state.availableSchemas = message.data.availableSchemas;
        this.state.schemaErrors = message.data.schemaErrors;
        this.state.functoids = message.data.functoids;
        this.renderView();
        setTimeout(() => this.redrawLinks(), 150);
        break;
      }
      case 'documentChanged': {
        this.state.compilerLinks = undefined;
        this.state.map = message.data;
        this.updateLinkTrace();
        if (this.schemaNodeProperties) {
          this.lastModalKey = '';
        }
        this.renderView();
        break;
      }
      case 'schemaStateChanged': {
        this.clearSchemaNodeSelection();
        this.state.compilerLinks = undefined;
        this.state.map = message.data.map;
        this.state.sourceSchema = message.data.sourceSchema;
        this.state.targetSchema = message.data.targetSchema;
        this.state.availableSchemas = message.data.availableSchemas;
        this.state.schemaErrors = message.data.schemaErrors;
        this.lastSourceSchema = undefined;
        this.lastTargetSchema = undefined;
        this.renderView();
        setTimeout(() => this.redrawLinks(), 150);
        break;
      }
      case 'schemaLoaded': {
        this.clearSchemaNodeSelection();
        if (this.state.map) {
          for (const page of this.state.map.pages) {
            page.links = page.links.filter((link) =>
              message.data.side === 'source' ? link.sourceType === LinkEndpointType.Functoid : link.targetType === LinkEndpointType.Functoid
            );
          }
        }
        if (message.data.side === 'source') {
          this.state.sourceSchema = message.data.schema;
          if (this.state.map) {
            this.state.map.sourceSchema = { location: message.data.path };
          }
        } else {
          this.state.targetSchema = message.data.schema;
          if (this.state.map) {
            this.state.map.targetSchema = { location: message.data.path };
          }
        }

        this.updateMap(this.state.map);
        this.renderView();
        setTimeout(() => this.redrawLinks(), 150);
        break;
      }
      case 'compileResult':
        this.showCompileResult(message.data);
        break;
      case 'assemblySelected': {
        if (this.scriptingConfigDraft) {
          this.scriptingConfigDraft.assemblyPath = message.data.path || '';
          this.scriptingConfigDraft.assemblyClasses = message.data.classes || [];
          // Auto-select first class and method
          const classes = this.scriptingConfigDraft.assemblyClasses;
          if (classes && classes.length > 0) {
            const firstClass = classes[0];
            this.scriptingConfigDraft.className = firstClass.className;
            this.scriptingConfigDraft.methodName = firstClass.methods[0]?.name || '';
          }

          this.scriptingDialog?.applyAssemblyResult({
            assemblyPath: this.scriptingConfigDraft.assemblyPath,
            assemblyClasses: this.scriptingConfigDraft.assemblyClasses,
            className: this.scriptingConfigDraft.className,
            methodName: this.scriptingConfigDraft.methodName,
          });
        }
        break;
      }
      case 'instanceGenerated':
        this.showInstanceResult(message.data);
        break;
      case 'testMapResult':
        this.showTestMapResult(message.data);
        break;
      case 'copilotResult': {
        this.copilotBusy = false;
        this.copilotMessage = message.data.message;
        if (message.data.applied && message.data.map) {
          this.state.compilerLinks = undefined;
          this.state.map = message.data.map;
          this.updateLinkTrace();
        }
        this.renderView();
        break;
      }
      case 'copilotContextChanged': {
        this.copilotContextFiles = message.data.files;
        if (message.data.message) {
          this.copilotMessage = message.data.message;
        }
        this.renderView();
        break;
      }
    }
  }

  private renderView(): void {
    this.syncToolbar();
    this.syncCopilot();
    this.syncPalette();
    this.syncSource();
    this.configureCanvas();
    this.syncPageBar();
    this.syncTarget();
    this.syncBottom();
    this.syncStatus();
    this.syncModal();
    this.redrawLinks();
  }

  private syncToolbar(): void {
    this.toolbarEl.configure({
      disabled: !this.state.map,
      status: this.toolbarStatusMessage,
      onValidateAndCompile: () => this.validateAndCompile(),
      onTest: () => this.runTestMap(),
      onDeploy: () => {
        if (this.state.map) {
          this.vscode.postMessage({ type: 'deployToLogicApps', data: this.state.map });
        }
      },
      onCopilot: () => {
        this.copilotPanelOpen = !this.copilotPanelOpen;
        this.syncCopilot();
      },
    });
  }

  private syncCopilot(): void {
    if (this.copilotPanelOpen) {
      this.elements.copilot.hidden = false;
      this.elements.copilot.configure(
        {
          draft: this.copilotDraft,
          busy: this.copilotBusy,
          hasMap: !!this.state.map,
          message: this.copilotMessage,
          contextFiles: this.copilotContextFiles,
        },
        {
          onSubmit: (prompt) => this.submitCopilotPrompt(prompt),
          onAddContext: () => this.vscode.postMessage({ type: 'browseCopilotContext' }),
          onClearContext: () => this.vscode.postMessage({ type: 'clearCopilotContext' }),
          onRemoveContext: (id) => this.vscode.postMessage({ type: 'removeCopilotContext', data: { id } }),
          onClose: () => {
            this.copilotPanelOpen = false;
            this.syncCopilot();
          },
        }
      );
    } else {
      this.elements.copilot.hidden = true;
    }
  }

  private syncPalette(): void {
    if (this.lastFunctoidsRef !== this.state.functoids) {
      this.lastFunctoidsRef = this.state.functoids;
      this.palette?.configure(this.state.functoids, (functoid) => this.addFunctoidToCanvas(functoid));
    }
  }

  private syncSource(): void {
    const signature = `${this.state.activePage}:${this.state.availableSchemas.join('|')}`;
    if (this.state.sourceSchema) {
      this.elements.sourceTree.hidden = false;
      this.elements.sourceEmpty.hidden = true;
      if (this.lastSourceSchema === this.state.sourceSchema && this.lastSourceSignature === signature) {
        return;
      }
      const tree = this.elements.sourceTree;
      tree.configure(
        this.state.sourceSchema,
        'source',
        (nodePath) => this.onSourceNodeClick(nodePath),
        (nodePath) => this.onSourceNodePointerUp(nodePath),
        (clientX, clientY) => this.beginLinkPointer(clientX, clientY),
        this.getLinkedPaths('source'),
        (node) => this.openSchemaNodeProperties(node, 'source'),
        () => this.redrawLinks(),
        this.state.availableSchemas,
        (path) => this.vscode.postMessage({ type: 'loadSchema', side: 'source', path, browse: path === undefined }),
        this.getConnectedPaths('source'),
        (rootName) => this.vscode.postMessage({ type: 'selectSchemaRoot', side: 'source', rootName }),
        (node) => this.selectSchemaNode(node, 'source')
      );
      this.sourceTree = tree;
      this.lastSourceSchema = this.state.sourceSchema;
      this.lastSourceSignature = signature;
    } else {
      this.elements.sourceTree.hidden = true;
      this.elements.sourceEmpty.hidden = false;
      this.elements.sourceEmpty.configure(
        'source',
        this.state.availableSchemas,
        (path) => this.vscode.postMessage({ type: 'loadSchema', side: 'source', path, browse: path === undefined }),
        !this.initialized,
        this.state.schemaErrors?.source
      );
      this.sourceTree = null;
      this.lastSourceSchema = undefined;
      this.lastSourceSignature = '';
    }
  }

  private syncTarget(): void {
    const signature = `${this.state.activePage}:${this.state.availableSchemas.join('|')}`;
    if (this.state.targetSchema) {
      this.elements.targetTree.hidden = false;
      this.elements.targetEmpty.hidden = true;
      if (this.lastTargetSchema === this.state.targetSchema && this.lastTargetSignature === signature) {
        return;
      }
      const tree = this.elements.targetTree;
      tree.configure(
        this.state.targetSchema,
        'target',
        (nodePath) => this.onTargetNodeClick(nodePath),
        (nodePath) => this.onTargetNodePointerUp(nodePath),
        (clientX, clientY) => this.beginLinkPointer(clientX, clientY),
        this.getLinkedPaths('target'),
        (node) => this.openSchemaNodeProperties(node, 'target'),
        () => this.redrawLinks(),
        this.state.availableSchemas,
        (path) => this.vscode.postMessage({ type: 'loadSchema', side: 'target', path, browse: path === undefined }),
        this.getConnectedPaths('target'),
        (rootName) => this.vscode.postMessage({ type: 'selectSchemaRoot', side: 'target', rootName }),
        (node) => this.selectSchemaNode(node, 'target')
      );
      this.targetTree = tree;
      this.lastTargetSchema = this.state.targetSchema;
      this.lastTargetSignature = signature;
    } else {
      this.elements.targetTree.hidden = true;
      this.elements.targetEmpty.hidden = false;
      this.elements.targetEmpty.configure(
        'target',
        this.state.availableSchemas,
        (path) => this.vscode.postMessage({ type: 'loadSchema', side: 'target', path, browse: path === undefined }),
        !this.initialized,
        this.state.schemaErrors?.target
      );
      this.targetTree = null;
      this.lastTargetSchema = undefined;
      this.lastTargetSignature = '';
    }
  }

  private configureCanvas(): void {
    this.canvas.configure(this.state, {
      onLinkViewChange: (view) => {
        this.state.linkView = view;
        this.updateLinkTrace();
        this.redrawLinks();
        if (view.compiler && this.state.compilerLinks === undefined) {
          this.validateAndCompile();
        }
      },
      onAreaSelect: (links, functoids, additive) => {
        const previous = this.getSelection();
        this.setSelection(
          additive ? [...new Set([...previous.links, ...links])] : links,
          additive ? [...new Set([...previous.functoids, ...functoids])] : functoids
        );
        this.redrawLinks();
      },
      onLinkSelect: (linkId, additive) => {
        const selection = this.getSelection();
        this.setSelection(
          additive
            ? selection.links.includes(linkId)
              ? selection.links.filter((id) => id !== linkId)
              : [...selection.links, linkId]
            : [linkId],
          additive ? selection.functoids : []
        );
        this.redrawLinks();
      },
      onLinkDoubleClick: (linkId) => this.openLinkProperties(linkId),
      onLinkRetarget: (linkId, end, clientX, clientY) => this.beginLinkRetarget(linkId, end, clientX, clientY),
      onFunctoidSelect: (fId, additive) => {
        const selection = this.getSelection();
        this.setSelection(
          additive ? selection.links : [],
          additive
            ? selection.functoids.includes(fId)
              ? selection.functoids.filter((id) => id !== fId)
              : [...selection.functoids, fId]
            : [fId]
        );
        this.redrawLinks();
      },
      onFunctoidDoubleClick: (fId) => {
        this.onFunctoidDoubleClick(fId);
      },
      onFunctoidDrop: (functoid, x, y) => {
        this.addFunctoidAtPosition(functoid, x, y);
      },
      onFunctoidMove: (fId, x, y) => {
        const page = this.state.map?.pages[this.state.activePage];
        const f = page?.functoids.find((fn: any) => fn.id === fId);
        if (f) {
          f.x = x;
          f.y = y;
          this.updateMap(this.state.map);
        }
      },
      onFunctoidsMove: (moves) => {
        const page = this.state.map?.pages[this.state.activePage];
        if (!page) {
          return;
        }
        for (const move of moves) {
          const functoid = page.functoids.find((fn: any) => fn.id === move.id);
          if (functoid) {
            functoid.x = move.x;
            functoid.y = move.y;
          }
        }
        this.updateMap(this.state.map);
        this.redrawLinks();
      },
      onFunctoidInputClick: (fId) => {
        this.onFunctoidConnectorClick(fId, 'input');
      },
      onFunctoidOutputClick: (fId) => {
        this.onFunctoidConnectorClick(fId, 'output');
      },
      onFunctoidInputPointerUp: (fId) => {
        this.onFunctoidConnectorPointerUp(fId, 'input');
      },
      onFunctoidOutputPointerUp: (fId) => {
        this.onFunctoidConnectorPointerUp(fId, 'output');
      },
      onLinkPointerDown: (clientX, clientY) => this.beginLinkPointer(clientX, clientY),
      onDeselect: () => {
        this.setSelection([], []);
        this.redrawLinks();
      },
    });
  }

  private syncPageBar(): void {
    this.pageBarEl.configure(
      (this.state.map?.pages || []).map((page: any) => ({ name: page.name })),
      this.state.activePage,
      {
        onSelect: (index) => {
          this.state.activePage = index;
          this.setSelection([], []);
          this.pendingLink = null;
          this.replacingLink = null;
          this.canvas.clearLinkPreview();
          this.renderView();
        },
        onRename: (index, name) => {
          const page = this.state.map?.pages[index];
          if (page && page.name !== name) {
            page.name = name;
            this.updateMap(this.state.map);
          }
          this.renderView();
        },
        onAdd: () => this.addPage(),
        onDelete: (index) => this.deletePage(index),
      }
    );
  }

  private syncBottom(): void {
    this.bottomPanel?.configure(!!this.state.map, this.bottomPanelActiveTab, this.bottomPanelCollapsed, {
      onGenerateInstance: () => {
        this.bottomPanelCollapsed = false;
        this.bottomPanelActiveTab = 'instance';
        this.bottomPanel?.setCollapsed(false);
        this.bottomPanel?.setActiveTab('instance');
        this.vscode.postMessage({ type: 'generateInstance', side: 'source' });
      },
      onRunTest: () => this.runTestMap(),
      onViewStateChange: (tab, collapsed) => {
        this.bottomPanelActiveTab = tab;
        this.bottomPanelCollapsed = collapsed;
      },
    });
  }

  private syncStatus(): void {
    const page = this.state.map?.pages?.[this.state.activePage];
    this.statusBarEl.configure({
      links: page?.links?.length || 0,
      functoids: page?.functoids?.length || 0,
      sourceName: this.getFileName(this.state.map?.sourceSchema?.location),
      targetName: this.getFileName(this.state.map?.targetSchema?.location),
    });
  }

  private syncModal(): void {
    const key = this.linkProperties
      ? 'link'
      : this.schemaNodeProperties
        ? 'schemaNode'
        : this.scriptingConfigDraft
          ? 'scripting'
          : this.functoidPropertiesId
            ? 'functoid'
            : '';
    if (key === this.lastModalKey) {
      return;
    }
    this.lastModalKey = key;
    this.scriptingDialog = null;
    this.elements.schemaDialog.clear();
    this.elements.linkDialog.clear();
    this.elements.scriptingDialog.clear();
    this.elements.functoidDialog.clear();
    this.elements.schemaDialog.hidden = true;
    this.elements.linkDialog.hidden = true;
    this.elements.scriptingDialog.hidden = true;
    this.elements.functoidDialog.hidden = true;
    if (key === 'link') {
      this.elements.linkDialog.hidden = false;
      this.configureLinkPropertiesModal();
    } else if (key === 'schemaNode') {
      this.elements.schemaDialog.hidden = false;
      this.configureSchemaNodePropertiesModal(this.elements.schemaDialog);
    } else if (key === 'scripting') {
      this.elements.scriptingDialog.hidden = false;
      this.configureScriptingConfigDialog(this.elements.scriptingDialog);
    } else if (key === 'functoid') {
      this.elements.functoidDialog.hidden = false;
      this.configureFunctoidPropertiesDialog(this.elements.functoidDialog);
    }
  }

  /**
   * Source schema node connector clicked
   */
  private onSourceNodeClick(nodePath: string): void {
    if (this.replacingLink?.end === 'target') {
      return;
    }
    if (this.pendingLink && this.pendingLink.side === 'source') {
      // Complete: functoid output → this was waiting for a target, but user clicked source again, reset
      this.pendingLink = { type: 'schemaNode', id: nodePath, side: 'source' };
      this.updateStatusMessage(`Source: ${this.getLastSegment(nodePath)} → click target node or functoid input`);
    } else if (this.pendingLink && this.pendingLink.side === 'target') {
      // We have a pending target (functoid input waiting for source) — complete: source node → functoid
      this.completeLinkCreation({ type: 'schemaNode', id: nodePath }, { type: this.pendingLink.type, id: this.pendingLink.id });
    } else {
      // Start new link from source
      this.pendingLink = { type: 'schemaNode', id: nodePath, side: 'source' };
      this.updateStatusMessage(`Source: ${this.getLastSegment(nodePath)} → click target node or functoid input`);
    }
  }

  private onSourceNodePointerUp(nodePath: string): void {
    if (this.pendingLink?.side === 'target') {
      this.completeLinkCreation({ type: 'schemaNode', id: nodePath }, { type: this.pendingLink.type, id: this.pendingLink.id });
    }
    this.finishLinkPointer();
  }

  /**
   * Target schema node connector clicked
   */
  private onTargetNodeClick(nodePath: string): void {
    if (this.replacingLink?.end === 'source') {
      return;
    }
    if (this.pendingLink && this.pendingLink.side === 'source') {
      // Complete: pending source → target node
      this.completeLinkCreation({ type: this.pendingLink.type, id: this.pendingLink.id }, { type: 'schemaNode', id: nodePath });
    } else {
      // No pending source — store as pending target (for functoid output → target)
      this.pendingLink = { type: 'schemaNode', id: nodePath, side: 'target' };
      this.updateStatusMessage(`Target: ${this.getLastSegment(nodePath)} → click source node or functoid output`);
    }
  }

  private onTargetNodePointerUp(nodePath: string): void {
    if (this.pendingLink?.side === 'source') {
      this.completeLinkCreation({ type: this.pendingLink.type, id: this.pendingLink.id }, { type: 'schemaNode', id: nodePath });
    }
    this.finishLinkPointer();
  }

  private openLinkProperties(linkId: string | string[]): void {
    const page = this.state.map?.pages[this.state.activePage];
    const linkIds = typeof linkId === 'string' ? [linkId] : linkId;
    if (!linkIds.length || !page || linkIds.some((id) => !page.links.some((link) => link.id === id))) {
      return;
    }
    this.hideContextMenu();
    this.setSelection(linkIds, []);
    this.pendingLink = null;
    this.linkProperties = { pageId: page.id, linkIds: [...linkIds] };
    this.renderView();
  }

  private closeLinkProperties(): void {
    this.linkProperties = null;
    this.renderView();
  }

  private configureLinkPropertiesModal(): void {
    const properties = this.linkProperties!;
    const page = this.state.map?.pages.find((candidate) => candidate.id === properties.pageId);
    const links = page?.links.filter((candidate) => properties.linkIds.includes(candidate.id)) ?? [];
    const link = links[0];
    if (!link) {
      this.closeLinkProperties();
      return;
    }
    const mixedFields = {
      label: links.some((item) => (item.label ?? '') !== (link.label ?? '')),
      sourceLinkOption: links.some(
        (item) => (item.sourceLinkOption ?? SourceLinkOption.ValueCopy) !== (link.sourceLinkOption ?? SourceLinkOption.ValueCopy)
      ),
      targetLinkOption: links.some(
        (item) => (item.targetLinkOption ?? TargetLinkOption.Flattening) !== (link.targetLinkOption ?? TargetLinkOption.Flattening)
      ),
    };
    this.elements.linkDialog.configure(
      {
        label: mixedFields.label ? '' : link.label || '',
        source:
          links.length > 1
            ? `${links.length} selected sources`
            : link.sourceType === LinkEndpointType.Functoid
              ? this.getFunctoidName(link.sourceId)
              : link.sourcePath || link.sourceId,
        target:
          links.length > 1
            ? `${links.length} selected targets`
            : link.targetType === LinkEndpointType.Functoid
              ? this.getFunctoidName(link.targetId)
              : link.targetPath || link.targetId,
        selectionCount: links.length,
        mixedFields,
        sourceLinkOption: link.sourceLinkOption ?? SourceLinkOption.ValueCopy,
        targetLinkOption: link.targetLinkOption ?? TargetLinkOption.Flattening,
      },
      {
        onCancel: () => this.closeLinkProperties(),
        onSave: (result) => {
          const map = this.state.map;
          const currentLinks =
            map?.pages
              .find((candidate) => candidate.id === properties.pageId)
              ?.links.filter((candidate) => properties.linkIds.includes(candidate.id)) ?? [];
          let changed = false;
          for (const currentLink of currentLinks) {
            if (result.label !== undefined && currentLink.label !== (result.label.trim() || undefined)) {
              currentLink.label = result.label.trim() || undefined;
              changed = true;
            }
            if (
              result.sourceLinkOption !== undefined &&
              (currentLink.sourceLinkOption ?? SourceLinkOption.ValueCopy) !== result.sourceLinkOption
            ) {
              currentLink.sourceLinkOption = result.sourceLinkOption;
              changed = true;
            }
            if (
              result.targetLinkOption !== undefined &&
              (currentLink.targetLinkOption ?? TargetLinkOption.Flattening) !== result.targetLinkOption
            ) {
              currentLink.targetLinkOption = result.targetLinkOption;
              changed = true;
            }
          }
          if (changed) {
            this.updateMap(map);
          }
          this.closeLinkProperties();
        },
      }
    );
  }

  private openSchemaNodeProperties(node: SchemaNodeView, side: 'source' | 'target'): void {
    this.selectSchemaNode(node, side);
    const schema = side === 'source' ? this.state.sourceSchema : this.state.targetSchema;
    this.schemaNodeProperties = {
      node,
      side,
      schemaNamespace: node.namespace || schema?.targetNamespace,
    };
    this.renderView();
    setTimeout(() => this.redrawLinks(), 0);
  }

  private closeSchemaNodeProperties(): void {
    this.schemaNodeProperties = null;
    this.renderView();
    setTimeout(() => this.redrawLinks(), 0);
  }

  private configureSchemaNodePropertiesModal(dialog: SchemaNodePropertiesDialog): void {
    const properties = this.schemaNodeProperties!;
    dialog.configure(this.getSchemaNodePropertiesModel(properties), {
      onClose: () => this.closeSchemaNodeProperties(),
      onSave: (value) => this.saveSchemaNodeValue(properties, value),
    });
  }

  private selectSchemaNode(node: SchemaNodeView, side: 'source' | 'target'): void {
    this.state.selectedSchemaNode = { side, path: node.path };
    this.state.selectedLinks = [];
    this.state.selectedFunctoids = [];
    this.state.selectedLink = null;
    this.state.selectedFunctoid = null;
    this.sourceTree?.setSelectedPath?.(side === 'source' ? node.path : undefined);
    this.targetTree?.setSelectedPath?.(side === 'target' ? node.path : undefined);
    this.updateLinkTrace();
    this.redrawLinks();
  }

  private setNodeMappingView(selectionOnly: boolean): void {
    this.state.linkView = {
      scope: 'all',
      colorPartial: true,
      autoReveal: true,
      compiler: false,
      ...this.state.linkView,
      trace: true,
      selectionOnly,
    };
    this.updateLinkTrace();
    this.renderView();
  }

  private clearSchemaNodeSelection(): void {
    this.state.selectedSchemaNode = undefined;
    this.state.filteredLinkIds = undefined;
    this.state.filteredFunctoidIds = undefined;
    this.schemaNodeProperties = null;
    this.sourceTree?.setSelectedPath?.(undefined);
    this.targetTree?.setSelectedPath?.(undefined);
  }

  private getSchemaNodePropertiesModel(properties: SchemaNodeProperties): SchemaNodePropertiesViewModel {
    const node = properties.node;
    const occurrence = `${node.minOccurs ?? (node.isOptional ? 0 : 1)}..${node.maxOccurs ?? 1}`;
    const rawRows: [string, string | number | boolean | undefined][] = [
      ['XPath', node.path],
      ['Node kind', node.type || 'element'],
      ['Data type', node.dataType],
      ['Base type', node.baseType || node.restrictions?.baseType],
      ['Namespace', properties.schemaNamespace],
      ['Type namespace', node.dataTypeNamespace],
      ['Occurrence', occurrence],
      ['Optional', node.isOptional],
      ['Nillable', node.nillable],
      ['Default value', node.defaultValue],
      ['Fixed value', node.fixedValue],
    ];
    const rows: SchemaNodePropertyRow[] = rawRows
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([label, value]) => ({ label, value: String(value), isXPath: label === 'XPath' }));
    if (node.restrictions) {
      for (const [name, value] of Object.entries(node.restrictions)) {
        if (value !== undefined) {
          rows.push({ label: name, value: Array.isArray(value) ? value.join(', ') : String(value) });
        }
      }
    }

    const schema = properties.side === 'source' ? this.state.sourceSchema : this.state.targetSchema;
    const resolver = new SchemaPathResolver(schema ?? undefined, this.state.map?.options.ignoreNamespacesForLinks);
    const resolved = resolver.resolve(node.path);
    const values = properties.side === 'source' ? this.state.map?.testValues : this.state.map?.targetValues;
    const storedValue =
      values?.[node.path] ?? Object.entries(values ?? {}).find(([path]) => resolver.resolve(path)?.path === node.path)?.[1];
    let disabledReason: string | undefined;
    if (!resolved) {
      disabledReason = 'This node is no longer available in the schema.';
    } else if (
      !resolved.attribute &&
      (resolved.node.type !== 'element' || resolved.node.wildcard || resolved.node.children.some((child) => child.type !== 'any'))
    ) {
      disabledReason = 'Values can only be assigned to leaf elements and attributes.';
    } else if (resolved.ancestors.some((ancestor) => ancestor.maxOccurs === 0)) {
      disabledReason = 'This node cannot occur in an instance.';
    } else if (
      properties.side === 'target' &&
      this.state.map?.pages.some((page) =>
        page.links.some(
          (link) => link.targetType === 'schemaNode' && resolver.resolve(link.targetPath || link.targetId)?.path === node.path
        )
      )
    ) {
      disabledReason = 'This target already has an incoming link. Remove it before assigning a constant.';
    }
    return {
      title: `${properties.side === 'source' ? 'Source' : 'Target'} Schema Node Properties`,
      nodeName: node.name,
      rows,
      description: node.annotation,
      value: { label: properties.side === 'source' ? 'Test value' : 'Constant value', storedValue, disabledReason },
    };
  }

  private saveSchemaNodeValue(properties: SchemaNodeProperties, value: string | undefined): void {
    const map = this.state.map;
    if (!map) {
      return;
    }
    const model = this.getSchemaNodePropertiesModel(properties);
    if (value !== undefined && model.value?.disabledReason) {
      this.showNotification(model.value.disabledReason, 'warning');
      return;
    }
    const field = properties.side === 'source' ? 'testValues' : 'targetValues';
    const schema = properties.side === 'source' ? this.state.sourceSchema : this.state.targetSchema;
    const resolver = new SchemaPathResolver(schema ?? undefined, map.options.ignoreNamespacesForLinks);
    const values = { ...map[field] };
    for (const path of Object.keys(values)) {
      if (path === properties.node.path || resolver.resolve(path)?.path === properties.node.path) {
        delete values[path];
      }
    }
    if (value !== undefined) {
      values[properties.node.path] = value;
    }
    if (Object.keys(values).length) {
      map[field] = values;
    } else {
      delete map[field];
    }
    this.updateMap(map);
    this.lastModalKey = '';
    this.renderView();
  }

  /**
   * Functoid connector clicked (input = left/target side, output = right/source side)
   */
  private onFunctoidConnectorClick(functoidId: string, connector: 'input' | 'output'): void {
    if (this.replacingLink && (this.replacingLink.end === 'source') !== (connector === 'output')) {
      return;
    }
    if (connector === 'input') {
      // Functoid input = this is a "target" endpoint
      if (this.pendingLink && this.pendingLink.side === 'source') {
        // Complete: pending source → functoid input
        this.completeLinkCreation({ type: this.pendingLink.type, id: this.pendingLink.id }, { type: 'functoid', id: functoidId });
      } else {
        // Store as pending target
        this.pendingLink = { type: 'functoid', id: functoidId, side: 'target' };
        const name = this.getFunctoidName(functoidId);
        this.updateStatusMessage(`Target: ${name} input → click source node or functoid output`);
      }
    } else if (this.pendingLink && this.pendingLink.side === 'target') {
      // Complete: functoid output → pending target
      this.completeLinkCreation({ type: 'functoid', id: functoidId }, { type: this.pendingLink.type, id: this.pendingLink.id });
    } else {
      // Store as pending source
      this.pendingLink = { type: 'functoid', id: functoidId, side: 'source' };
      const name = this.getFunctoidName(functoidId);
      this.updateStatusMessage(`Source: ${name} output → click target node or functoid input`);
    }
  }

  private onFunctoidConnectorPointerUp(functoidId: string, connector: 'input' | 'output'): void {
    if (connector === 'input' && this.pendingLink?.side === 'source') {
      this.completeLinkCreation({ type: this.pendingLink.type, id: this.pendingLink.id }, { type: 'functoid', id: functoidId });
    } else if (connector === 'output' && this.pendingLink?.side === 'target') {
      this.completeLinkCreation({ type: 'functoid', id: functoidId }, { type: this.pendingLink.type, id: this.pendingLink.id });
    }
    this.finishLinkPointer();
  }

  /**
   * Creates a link between source and target endpoints
   */
  private beginLinkRetarget(linkId: string, end: 'source' | 'target', clientX?: number, clientY?: number): void {
    const page = this.state.map?.pages[this.state.activePage];
    const link = page?.links.find((candidate) => candidate.id === linkId);
    if (!page || !link) {
      return;
    }
    this.hideContextMenu();
    this.setSelection([linkId], []);
    this.replacingLink = { pageId: page.id, linkId, end };
    this.pendingLink =
      end === 'source'
        ? { type: link.targetType, id: link.targetPath || link.targetId, side: 'target' }
        : { type: link.sourceType, id: link.sourcePath || link.sourceId, side: 'source' };
    if (clientX !== undefined && clientY !== undefined) {
      this.beginLinkPointer(clientX, clientY);
    }
    this.updateStatusMessage(`Choose a new link ${end}; Escape cancels`);
    this.redrawLinks();
  }

  private completeLinkCreation(
    source: { type: 'schemaNode' | 'functoid'; id: string },
    target: { type: 'schemaNode' | 'functoid'; id: string }
  ): void {
    if (!this.state.map) {
      return;
    }
    const page = this.state.map.pages[this.state.activePage];

    if (this.replacingLink) {
      const replacement = this.replacingLink;
      const endpoint = replacement.end === 'source' ? source : target;
      const functoid = endpoint.type === 'functoid' ? page.functoids.find((item) => item.id === endpoint.id) : undefined;
      const definition = functoid ? this.state.functoids.find((item) => item.id === functoid.functoidId) : undefined;
      const targetFunctoid = target.type === 'functoid' ? page.functoids.find((item) => item.id === target.id) : undefined;
      const targetDefinition = targetFunctoid ? this.state.functoids.find((item) => item.id === targetFunctoid.functoidId) : undefined;
      const error =
        replacement.pageId !== page.id
          ? 'Page changed; link was not modified'
          : replacement.end === 'source' && definition?.hasOutput === false
            ? 'Functoid has no output'
            : replaceLinkEndpoint(
                page,
                replacement.linkId,
                replacement.end,
                endpoint,
                targetDefinition?.maxInputs,
                this.getLinkValidationContext()
              );
      this.replacingLink = null;
      this.pendingLink = null;
      this.updateStatusMessage(error || 'Link updated');
      if (!error) {
        this.updateMap(this.state.map);
        this.renderView();
      }
      return;
    }

    const candidate = {
      id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      sourceId: source.id,
      sourcePath: source.type === 'schemaNode' ? source.id : undefined,
      targetId: target.id,
      targetPath: target.type === 'schemaNode' ? target.id : undefined,
      sourceType: source.type === 'schemaNode' ? LinkEndpointType.SchemaNode : LinkEndpointType.Functoid,
      targetType: target.type === 'schemaNode' ? LinkEndpointType.SchemaNode : LinkEndpointType.Functoid,
    };
    const error = validateMappingLink(page, candidate, this.getLinkValidationContext());
    if (error) {
      this.pendingLink = null;
      this.updateStatusMessage(error);
      return;
    }
    page.links.push(candidate);
    synchronizeFunctoidLinks(page);

    this.pendingLink = null;
    this.updateStatusMessage('Link created ✓');
    setTimeout(() => this.updateStatusMessage(''), 2000);
    this.updateMap(this.state.map);
    this.renderView();
  }

  private getLinkValidationContext() {
    return {
      sourceRoot: this.state.sourceSchema?.rootElement,
      targetRoot: this.state.targetSchema?.rootElement,
      definitions: this.state.functoids,
      targetValues: this.state.map?.targetValues,
    };
  }

  private getFunctoidName(id: string): string {
    const page = this.state.map?.pages[this.state.activePage];
    const f = page?.functoids.find((fn: any) => fn.id === id);
    return f?.name || 'Functoid';
  }

  private redrawLinks(geometryOnly = false): void {
    this.pendingFullCanvasRedraw ||= !geometryOnly;
    if (this.disposed || this.redrawFrame !== null) {
      return;
    }
    this.redrawFrame = requestAnimationFrame(() => {
      this.redrawFrame = null;
      if (!this.disposed) {
        const renderFullCanvas = this.pendingFullCanvasRedraw;
        this.pendingFullCanvasRedraw = false;
        this.redrawLinksNow(renderFullCanvas);
      }
    });
  }

  private redrawLinksNow(renderFullCanvas: boolean): void {
    if (!this.state.map) {
      return;
    }

    const page = this.state.map.pages[this.state.activePage];
    if (!page) {
      return;
    }

    const positions: Map<string, { x: number; y: number }> = new Map();

    if (this.sourceTree) {
      this.sourceTree.setConnectedPaths(this.getConnectedPaths('source'));
      const sourcePaths = new Set<string>();
      for (const link of page.links) {
        if (link.sourcePath && link.sourceType !== 'functoid') {
          sourcePaths.add(link.sourcePath);
        }
      }
      for (const link of this.state.compilerLinks ?? []) {
        sourcePaths.add(link.sourcePath);
      }
      for (const [path, position] of this.sourceTree.getNodePositions(sourcePaths)) {
        positions.set(`src:${path}`, position);
      }
    }

    if (this.targetTree) {
      this.targetTree.setConnectedPaths(this.getConnectedPaths('target'));
      const targetPaths = new Set<string>();
      for (const link of page.links) {
        if (link.targetPath && link.targetType !== 'functoid') {
          targetPaths.add(link.targetPath);
        }
      }
      for (const link of this.state.compilerLinks ?? []) {
        targetPaths.add(link.targetPath);
      }
      for (const [path, position] of this.targetTree.getNodePositions(targetPaths)) {
        positions.set(`tgt:${path}`, position);
      }
    }

    this.canvas.renderWithPositions(positions, page, renderFullCanvas);
  }

  private submitCopilotPrompt(prompt: string): void {
    const trimmed = prompt.trim();
    if (!trimmed || !this.state.map || this.copilotBusy) {
      return;
    }
    this.copilotDraft = trimmed;
    this.copilotBusy = true;
    this.copilotMessage = 'Data Mapper Assistant is preparing a validated map edit…';
    this.renderView();
    this.vscode.postMessage({
      type: 'copilotPrompt',
      data: { prompt: trimmed, activePage: this.state.activePage },
    });
  }

  private updateStatusMessage(msg: string): void {
    if (this.disposed) {
      return;
    }
    this.toolbarStatusMessage = msg;
    this.syncToolbar();
  }

  private updateMap(map: any): void {
    this.state.compilerLinks = undefined;
    this.state.map = map;
    this.updateLinkTrace();
    this.vscode.postMessage({ type: 'update', data: map });
  }

  private addFunctoidToCanvas(functoid: any): void {
    if (!this.state.map) {
      return;
    }
    const page = this.state.map.pages[this.state.activePage];
    page.functoids.push({
      id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      functoidId: functoid.id,
      category: functoid.category,
      name: functoid.name,
      x: 200,
      y: 80 + page.functoids.length * 60,
      inputLinks: [],
      outputLinks: [],
      parameters: [],
    });
    this.updateMap(this.state.map);
    this.redrawLinks();
  }

  private addFunctoidAtPosition(functoid: any, x: number, y: number): void {
    if (!this.state.map) {
      return;
    }
    const page = this.state.map.pages[this.state.activePage];
    page.functoids.push({
      id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      functoidId: functoid.id,
      category: functoid.category,
      name: functoid.name,
      x: x,
      y: y,
      inputLinks: [],
      outputLinks: [],
      parameters: [],
    });
    this.updateMap(this.state.map);
    this.redrawLinks();
  }

  private addPage(): void {
    if (!this.state.map) {
      return;
    }
    const idx = this.state.map.pages.length + 1;
    this.state.map.pages.push({ id: `page${idx}`, name: `Page ${idx}`, links: [], functoids: [] });
    this.state.activePage = this.state.map.pages.length - 1;
    this.updateMap(this.state.map);
    this.renderView();
  }

  private deletePage(pageIndex: number): void {
    if (!this.state.map || this.state.map.pages.length <= 1) {
      return;
    }
    const page = this.state.map.pages[pageIndex];
    if (!page) {
      return;
    }
    if ((page.links.length > 0 || page.functoids.length > 0) && !window.confirm(`Delete page "${page.name}" and all of its mappings?`)) {
      return;
    }
    this.state.map.pages.splice(pageIndex, 1);
    if (this.state.activePage > pageIndex) {
      this.state.activePage--;
    } else if (this.state.activePage >= this.state.map.pages.length) {
      this.state.activePage = this.state.map.pages.length - 1;
    }
    this.updateMap(this.state.map);
    this.renderView();
  }

  private deleteSelected(): void {
    if (!this.state.map) {
      return;
    }
    const page = this.state.map.pages[this.state.activePage];
    const selection = this.getSelection();
    if (selection.links.length > 0 || selection.functoids.length > 0) {
      page.links = page.links.filter(
        (link) =>
          !selection.links.includes(link.id) &&
          !(link.sourceType === 'functoid' && selection.functoids.includes(link.sourceId)) &&
          !(link.targetType === 'functoid' && selection.functoids.includes(link.targetId))
      );
      page.functoids = page.functoids.filter((functoid) => !selection.functoids.includes(functoid.id));
      synchronizeFunctoidLinks(page);
      this.setSelection([], []);
      this.updateMap(this.state.map);
      this.renderView();
    }
  }

  private autoLinkByName(): void {
    if (!this.state.sourceSchema || !this.state.targetSchema || !this.state.map) {
      return;
    }
    const page = this.state.map.pages[this.state.activePage];
    const sourceNodes = this.flattenLeafNodes(this.state.sourceSchema.rootElement);
    const targetNodes = this.flattenLeafNodes(this.state.targetSchema.rootElement);
    let added = 0;

    for (const src of sourceNodes) {
      const match = targetNodes.find((t: any) => t.name.toLowerCase() === src.name.toLowerCase());
      if (match && !page.links.find((l: any) => l.sourcePath === src.path && l.targetPath === match.path)) {
        const link: MapLink = {
          id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 6)}_${added}`,
          sourceId: src.path,
          sourcePath: src.path,
          targetId: match.path,
          targetPath: match.path,
          sourceType: LinkEndpointType.SchemaNode,
          targetType: LinkEndpointType.SchemaNode,
        };
        if (!validateMappingLink(page, link, this.getLinkValidationContext())) {
          page.links.push(link);
          added++;
        }
      }
    }
    if (added > 0) {
      this.updateMap(this.state.map);
      this.renderView();
      setTimeout(() => this.redrawLinks(), 150);
    }
  }

  private validateAndCompile(): void {
    if (!this.state.map) {
      return;
    }

    // First validate
    const issues = this.getValidationIssues();
    const errors = issues.filter((i) => i.startsWith('✗'));

    if (errors.length > 0) {
      // Has errors — show validation results and don't compile
      const warnings = issues.filter((i) => i.startsWith('⚠'));
      const summary = `${errors.length} error(s), ${warnings.length} warning(s) — compilation aborted`;
      this.showNotification(`Validation failed: ${summary}`, 'error', issues.join('\n'));
      return;
    }

    // Validation passed (may have warnings) — proceed to compile
    if (issues.length > 0) {
      // Show warnings but continue
      this.showNotification(`Validation: ${issues.length} warning(s) — compiling...`, 'warning', issues.join('\n'));
    }

    // Send compile message
    this.vscode.postMessage({ type: 'compile', data: this.state.map });
  }

  private getValidationIssues(): string[] {
    if (!this.state.map) {
      return ['✗ No map loaded'];
    }
    const page = this.state.map.pages[this.state.activePage];
    const issues: string[] = [];

    // Check links with missing endpoints
    for (const link of page.links) {
      if (!link.sourceId || !link.targetId) {
        issues.push(`⚠ Link ${link.id}: missing endpoint`);
      }
    }

    // Check for dangling functoids
    for (const functoid of page.functoids || []) {
      const hasInput = page.links.some((l: any) => l.targetId === functoid.id);
      const hasOutput = page.links.some((l: any) => l.sourceId === functoid.id);

      if (!hasInput && !hasOutput) {
        issues.push(`✗ Functoid "${functoid.name}" (${functoid.id}): not connected — no input or output links`);
      } else if (!hasInput) {
        const noInputOk = ['Date', 'Time', 'Date and Time', 'Iteration', 'Scripting'].includes(functoid.name);
        if (!noInputOk) {
          issues.push(`⚠ Functoid "${functoid.name}" (${functoid.id}): no input links`);
        }
      } else if (!hasOutput) {
        issues.push(`⚠ Functoid "${functoid.name}" (${functoid.id}): no output link — result is not connected to target`);
      }
    }

    // Check for schemas
    if (!this.state.sourceSchema) {
      issues.push('✗ No source schema loaded');
    }
    if (!this.state.targetSchema) {
      issues.push('✗ No target schema loaded');
    }

    return issues;
  }

  private runTestMap(): void {
    if (!this.state.map) {
      return;
    }
    // Combined flow: generate instance (if needed) → run XSLT transform
    this.bottomPanelCollapsed = false;
    this.bottomPanelActiveTab = 'instance';
    this.bottomPanel?.setCollapsed(false);
    this.bottomPanel?.setActiveTab('instance');

    const existingInput = this.bottomPanel?.getInputXml() || '';

    if (existingInput) {
      // Already have input — go straight to transform
      this.bottomPanelActiveTab = 'output';
      this.bottomPanel?.setActiveTab('output');
      this.vscode.postMessage({ type: 'testMapWithInput', data: { inputXml: existingInput, map: this.state.map } });
    } else {
      // Generate instance first, then auto-run transform on response
      this.pendingTestAfterGenerate = true;
      this.vscode.postMessage({ type: 'generateInstance', side: 'source' });
    }
  }

  private pendingTestAfterGenerate = false;

  private validateMap(): void {
    if (!this.state.map) {
      return;
    }
    const issues = this.getValidationIssues();

    if (issues.length === 0) {
      this.showNotification('Map is valid ✓', 'success');
    } else {
      const errors = issues.filter((i) => i.startsWith('✗')).length;
      const warnings = issues.filter((i) => i.startsWith('⚠')).length;
      const summary = `${errors} error(s), ${warnings} warning(s)`;
      this.showNotification(`Validation: ${summary}`, errors > 0 ? 'error' : 'warning', issues.join('\n'));
    }
  }

  private showCompileResult(result: any): void {
    this.state.compilerLinks = result.success ? (result.compilerLinks ?? []) : [];
    this.redrawLinks();
    if (result.success) {
      this.showNotification('Compiled ✓', 'success');
    } else {
      this.showNotification('Compilation failed', 'error', result.errors.map((e: any) => e.message).join('\n'));
    }
  }

  private showNotification(title: string, type: NotificationType, details?: string): void {
    const notification = this.elements.notification;
    const close = (): void => {
      notification.hidden = true;
      if (this.notificationTimeout) {
        clearTimeout(this.notificationTimeout);
        this.notificationTimeout = null;
      }
    };
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    notification.hidden = false;
    notification.configure(title, type, details, close);
    this.notificationTimeout = setTimeout(close, 5000);
  }

  private getLinkedPaths(side: 'source' | 'target'): Set<string> {
    const paths = new Set<string>();
    if (!this.state.map) {
      return paths;
    }
    const page = this.state.map.pages[this.state.activePage];
    if (!page) {
      return paths;
    }
    for (const link of page.links) {
      const p = side === 'source' ? link.sourcePath : link.targetPath;
      if (p) {
        const parts = p.split('/').filter((s: string) => s);
        let cur = '';
        for (const part of parts) {
          cur += `/${part}`;
          paths.add(cur);
        }
      }
    }
    return paths;
  }

  private getConnectedPaths(side: 'source' | 'target'): Set<string> {
    const page = this.state.map?.pages[this.state.activePage];
    return new Set(
      page?.links.map((link) => (side === 'source' ? link.sourcePath : link.targetPath)).filter((path): path is string => !!path)
    );
  }

  private flattenLeafNodes(node: any, result: any[] = []): any[] {
    if (!node.children || node.children.length === 0) {
      result.push(node);
    }
    if (node.children) {
      for (const c of node.children) {
        this.flattenLeafNodes(c, result);
      }
    }
    return result;
  }

  private getFileName(p?: string): string {
    return p ? p.split(/[/\\]/).pop() || p : 'None';
  }
  private getLastSegment(p: string): string {
    return (
      p
        .split('/')
        .filter((s) => s)
        .pop() || p
    );
  }

  // Real BizTalk FIDs for the Scripting functoid
  private static readonly SCRIPTING_FIDS = new Set([600, 260]);

  private isScriptingFunctoid(functoid: any): boolean {
    return MapperAppController.SCRIPTING_FIDS.has(functoid?.functoidId);
  }

  private onFunctoidDoubleClick(functoidId: string): void {
    const functoid = this.getCurrentPageFunctoid(functoidId);
    if (!functoid) {
      return;
    }
    this.setSelection([], [functoidId]);
    if (!this.isScriptingFunctoid(functoid)) {
      this.functoidPropertiesId = functoidId;
      this.functoidInputsDraft = this.createFunctoidInputsDraft(functoid);
      this.functoidLabelDraft = functoid.label || '';
      this.functoidCommentsDraft = functoid.comments || '';
      this.renderView();
      setTimeout(() => this.redrawLinks(), 0);
      return;
    }

    // Script type and body can come from either:
    // 1. Parameters array (our format: scriptType/scriptBody entries)
    // 2. Top-level functoid properties (BizTalk native: scriptType/scriptContent from BTM parser)
    const scriptTypeFromParams = this.getFunctoidParameter(functoid, 'scriptType');
    const scriptBodyFromParams = this.getFunctoidParameter(functoid, 'scriptBody');

    let resolvedScriptType = scriptTypeFromParams || functoid.scriptType || 'inlineCSharp';
    const externalImplementation = functoid.scriptImplementations?.find(
      (implementation: any) => implementation.type === 'externalAssembly'
    );
    const inlineImplementation = functoid.scriptImplementations?.find((implementation: any) => implementation.type === resolvedScriptType);
    // Map BizTalk ScriptType enum values to config types
    if (resolvedScriptType === 'inlineCSharp' || resolvedScriptType === 'csharp') {
      resolvedScriptType = 'inlineCSharp';
    } else if (resolvedScriptType === 'inlineVbNet' || resolvedScriptType === 'vbnet') {
      resolvedScriptType = 'inlineVbNet';
    } else if (resolvedScriptType === 'inlineJScript' || resolvedScriptType === 'jscript') {
      resolvedScriptType = 'inlineJScript';
    } else if (resolvedScriptType === 'inlineXslt' || resolvedScriptType === 'xslt') {
      resolvedScriptType = 'inlineXslt';
    } else if (resolvedScriptType === 'inlineXsltCallTemplate' || resolvedScriptType === 'xsltcalltemplate') {
      resolvedScriptType = 'inlineXsltCallTemplate';
    } else if (resolvedScriptType === 'externalAssembly') {
      resolvedScriptType = 'externalAssembly';
    }

    this.scriptingConfigDraft = {
      functoidId,
      label: functoid.label || '',
      comments: functoid.comments || '',
      scriptType: resolvedScriptType as ScriptingConfigType,
      scriptBody: scriptBodyFromParams || functoid.scriptContent || '',
      assemblyReferences: inlineImplementation?.assemblyReferences?.join('\n') || '',
      assemblyPath: this.getFunctoidParameter(functoid, 'assemblyPath') || externalImplementation?.assemblyPath || '',
      className: this.getFunctoidParameter(functoid, 'className') || externalImplementation?.className || '',
      methodName: this.getFunctoidParameter(functoid, 'methodName') || externalImplementation?.methodName || '',
    };

    this.renderView();
    setTimeout(() => {
      this.redrawLinks();
    }, 0);
  }

  private closeScriptingConfig(): void {
    this.scriptingConfigDraft = null;
    this.scriptingDialog = null;
    this.renderView();
    setTimeout(() => this.redrawLinks(), 0);
  }

  private closeFunctoidDialog(): void {
    this.functoidPropertiesId = null;
    this.functoidInputsDraft = null;
    this.functoidLabelDraft = '';
    this.functoidCommentsDraft = '';
    this.scriptingConfigDraft = null;
    this.scriptingDialog = null;
    this.renderView();
    setTimeout(() => this.redrawLinks(), 0);
  }

  private saveScriptingConfig(): void {
    if (!this.scriptingConfigDraft) {
      return;
    }

    const functoid = this.getCurrentPageFunctoid(this.scriptingConfigDraft.functoidId);
    if (!functoid) {
      this.closeScriptingConfig();
      return;
    }

    functoid.parameters = (functoid.parameters || [])
      .filter((parameter: any) => parameter.type === ParameterType.Link || parameter.type === ParameterType.Constant)
      .map((parameter: any, index: number) => ({ ...parameter, index }));
    functoid.scriptType = this.scriptingConfigDraft.scriptType;
    functoid.label = this.scriptingConfigDraft.label.trim() || undefined;
    functoid.comments = this.scriptingConfigDraft.comments.trim() || undefined;
    functoid.scriptContent =
      this.scriptingConfigDraft.scriptType === 'externalAssembly' ? undefined : this.scriptingConfigDraft.scriptBody || '';

    if (this.scriptingConfigDraft.scriptType === 'externalAssembly') {
      functoid.scriptImplementations = [
        {
          type: 'externalAssembly',
          assemblyPath: this.scriptingConfigDraft.assemblyPath || '',
          className: this.scriptingConfigDraft.className || '',
          methodName: this.scriptingConfigDraft.methodName || '',
          parameterTypes: this.getSelectedAssemblyMethod()?.parameterTypes,
          returnType: this.getSelectedAssemblyMethod()?.returnType,
          isStatic: this.getSelectedAssemblyMethod()?.isStatic,
        },
      ];
    } else {
      functoid.scriptImplementations = [
        {
          type: this.scriptingConfigDraft.scriptType,
          content: this.scriptingConfigDraft.scriptBody || '',
          assemblyReferences: this.scriptingConfigDraft.assemblyReferences
            .split(/\r?\n/)
            .map((reference) => reference.trim())
            .filter((reference, index, references) => reference.length > 0 && references.indexOf(reference) === index),
        },
      ];
    }

    this.updateMap(this.state.map);
    this.closeScriptingConfig();
    this.showNotification('Scripting functoid updated', 'success');
  }

  private configureScriptingConfigDialog(dialog: ScriptingConfigDialog): void {
    const draft = this.scriptingConfigDraft!;
    const functoid = this.getCurrentPageFunctoid(draft.functoidId);
    this.scriptingDialog = dialog;
    dialog.configure(
      {
        summary: this.buildScriptingFunctoidSummary(functoid),
        label: draft.label,
        comments: draft.comments,
        scriptType: draft.scriptType,
        scriptBody: draft.scriptBody,
        assemblyReferences: draft.assemblyReferences,
        assemblyPath: draft.assemblyPath,
        className: draft.className,
        methodName: draft.methodName,
        assemblyClasses: draft.assemblyClasses || [],
      },
      {
        onSave: (result) => this.applyScriptingDialogResult(result),
        onCancel: () => this.closeScriptingConfig(),
        onBrowseAssembly: () => this.vscode.postMessage({ type: 'browseAssembly' }),
      }
    );
  }

  private applyScriptingDialogResult(result: ScriptingConfigResult): void {
    if (!this.scriptingConfigDraft) {
      return;
    }
    this.scriptingConfigDraft.scriptType = result.scriptType;
    this.scriptingConfigDraft.label = result.label;
    this.scriptingConfigDraft.comments = result.comments;
    this.scriptingConfigDraft.scriptBody = result.scriptBody;
    this.scriptingConfigDraft.assemblyReferences = result.assemblyReferences;
    this.scriptingConfigDraft.assemblyPath = result.assemblyPath;
    this.scriptingConfigDraft.className = result.className;
    this.scriptingConfigDraft.methodName = result.methodName;
    this.saveScriptingConfig();
  }

  private buildScriptingFunctoidSummary(functoid: any): ScriptingFunctoidSummary {
    const definition = this.state.functoids.find((item) => item.id === functoid?.functoidId);
    const page = this.state.map?.pages?.[this.state.activePage];
    const inputLinks = this.orderFunctoidInputLinks(
      functoid,
      (page?.links || []).filter((link: any) => link.targetType === 'functoid' && link.targetId === functoid?.id)
    );
    const constants = (functoid?.parameters || []).filter((parameter: any) => parameter.type === 'constant');
    const outputLinks = (page?.links || []).filter((link: any) => link.sourceType === 'functoid' && link.sourceId === functoid?.id);
    const minInputs = definition?.minInputs ?? 0;
    const maxInputs = definition?.maxInputs ?? minInputs;
    const expectedInputs =
      maxInputs >= 100 ? `${minInputs} or more` : minInputs === maxInputs ? `${minInputs}` : `${minInputs} to ${maxInputs}`;
    return {
      name: functoid?.name || definition?.name || 'Functoid',
      meta: `${definition?.category || functoid?.category || 'Custom'} · FID ${functoid?.functoidId ?? ''}`,
      description: definition?.description || definition?.tooltip || 'No functionality description is available for this functoid.',
      expectedInputs,
      inputs: [
        ...inputLinks.map((link: any, index: number) => `Input ${index + 1}: ${this.describeLinkSource(link)}`),
        ...constants.map((parameter: any) => `Input ${Number(parameter.index) + 1}: Constant: ${String(parameter.value ?? '')}`),
      ],
      outputs: outputLinks.map((link: any) => this.describeLinkTarget(link)),
      hasOutput: definition?.hasOutput !== false,
    };
  }

  private getSelectedAssemblyMethod(): AssemblyMethodInfo | undefined {
    const draft = this.scriptingConfigDraft;
    if (!draft) {
      return undefined;
    }
    return draft.assemblyClasses
      ?.find((item) => item.className === draft.className)
      ?.methods.find((method) => method.name === draft.methodName);
  }

  private configureFunctoidPropertiesDialog(dialog: FunctoidConfigDialog): void {
    const functoid = this.getCurrentPageFunctoid(this.functoidPropertiesId!);
    const definition = this.state.functoids.find((item) => item.id === functoid?.functoidId);
    const page = this.state.map?.pages?.[this.state.activePage];
    const outputLinks = (page?.links || []).filter(
      (link: any) => link.sourceType === LinkEndpointType.Functoid && link.sourceId === functoid?.id
    );
    const minInputs = definition?.minInputs ?? 0;
    const maxInputs = definition?.maxInputs ?? 100;
    const description = definition?.description || definition?.tooltip || 'No description is available for this functoid.';

    const inputs: FunctoidConfigInput[] = (this.functoidInputsDraft || []).map((input) => {
      const isConstant = input.type === ParameterType.Constant;
      const link = isConstant ? undefined : page?.links?.find((item: any) => item.id === input.linkId);
      const sourceLabel = isConstant ? '' : link ? this.describeLinkSource(link) : `Missing link: ${input.linkId || ''}`;
      return { isConstant, value: input.value, defaultValue: input.defaultValue || '', sourceLabel, raw: input };
    });

    dialog.configure(
      {
        title: functoid?.name || definition?.name || 'Functoid',
        meta: `${definition?.category || functoid?.category || 'Custom'} · FID ${functoid?.functoidId ?? ''}`,
        description,
        minInputs,
        maxInputs,
        hasOutput: definition?.hasOutput !== false,
        outputs: outputLinks.map((link: any) => this.describeLinkTarget(link)),
        inputs,
        label: this.functoidLabelDraft,
        comments: this.functoidCommentsDraft,
      },
      {
        onSave: (result) => this.applyFunctoidDialogResult(result),
        onCancel: () => this.closeFunctoidDialog(),
      }
    );
  }

  private applyFunctoidDialogResult(result: FunctoidConfigResult): void {
    this.functoidInputsDraft = result.inputs.map((item) => {
      const raw = item.raw as FunctoidInputDraft | undefined;
      if (raw) {
        return raw.type === ParameterType.Constant ? { ...raw, value: item.value } : { ...raw, defaultValue: item.defaultValue };
      }
      return { type: ParameterType.Constant, value: item.value };
    });
    this.functoidLabelDraft = result.label;
    this.functoidCommentsDraft = result.comments;
    this.saveFunctoidProperties();
  }

  private createFunctoidInputsDraft(functoid: any): FunctoidInputDraft[] {
    const page = this.state.map?.pages?.[this.state.activePage];
    const incomingLinks = (page?.links || []).filter(
      (link: any) => link.targetType === LinkEndpointType.Functoid && link.targetId === functoid.id
    );
    const linksById = new Map(incomingLinks.map((link: any) => [link.id, link]));
    const usedLinks = new Set<string>();
    const inputs: Array<FunctoidInputDraft | undefined> = [];

    for (const parameter of functoid.parameters || []) {
      const index = Number(parameter.index);
      if (!Number.isInteger(index) || index < 0) {
        continue;
      }
      if (parameter.type === ParameterType.Constant) {
        inputs[index] = {
          type: ParameterType.Constant,
          value: String(parameter.value ?? ''),
          guid: parameter.guid,
          defaultValue: parameter.defaultValue,
        };
      } else if (parameter.type === ParameterType.Link && linksById.has(String(parameter.value))) {
        const linkId = String(parameter.value);
        inputs[index] = {
          type: ParameterType.Link,
          linkId,
          value: linkId,
          guid: parameter.guid,
          defaultValue: parameter.defaultValue,
        };
        usedLinks.add(linkId);
      }
    }

    for (const link of this.orderFunctoidInputLinks(functoid, incomingLinks)) {
      if (!usedLinks.has(link.id)) {
        const emptyIndex = inputs.findIndex((input) => input === undefined);
        inputs[emptyIndex >= 0 ? emptyIndex : inputs.length] = {
          type: ParameterType.Link,
          linkId: link.id,
          value: link.id,
        };
      }
    }
    return Array.from({ length: inputs.length }, (_, index) => inputs[index] || { type: ParameterType.Constant, value: '' });
  }

  private saveFunctoidProperties(): void {
    const functoid = this.getCurrentPageFunctoid(this.functoidPropertiesId!);
    if (!functoid || !this.functoidInputsDraft) {
      this.closeFunctoidDialog();
      return;
    }
    const definition = this.state.functoids.find((item) => item.id === functoid.functoidId);
    const minInputs = definition?.minInputs ?? 0;
    const maxInputs = definition?.maxInputs ?? 100;
    if (this.functoidInputsDraft.length < minInputs || this.functoidInputsDraft.length > maxInputs) {
      this.showNotification(
        `Configure between ${minInputs} and ${maxInputs >= 100 ? 'the supported maximum number of' : maxInputs} inputs`,
        'error'
      );
      return;
    }
    const nonInputParameters = (functoid.parameters || []).filter(
      (parameter: any) => parameter.type !== ParameterType.Link && parameter.type !== ParameterType.Constant
    );
    functoid.parameters = [
      ...this.functoidInputsDraft.map((input, index) => ({
        index,
        type: input.type,
        value: input.type === ParameterType.Link ? input.linkId || '' : input.value,
        ...(input.guid ? { guid: input.guid } : {}),
        ...(input.type === ParameterType.Link && input.defaultValue !== undefined ? { defaultValue: input.defaultValue } : {}),
      })),
      ...nonInputParameters,
    ];
    functoid.inputLinks = this.functoidInputsDraft
      .filter((input) => input.type === ParameterType.Link && input.linkId)
      .map((input) => input.linkId!);
    functoid.label = this.functoidLabelDraft.trim() || undefined;
    functoid.comments = this.functoidCommentsDraft.trim() || undefined;
    this.updateMap(this.state.map);
    this.closeFunctoidDialog();
    this.showNotification('Functoid inputs updated', 'success');
  }

  private orderFunctoidInputLinks(functoid: any, links: any[]): any[] {
    if (!Array.isArray(functoid.inputLinks) || functoid.inputLinks.length === 0) {
      return links;
    }
    const order = new Map<string, number>(functoid.inputLinks.map((linkId: string, index: number) => [linkId, index]));
    return [...links].sort(
      (left, right) => (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    );
  }

  private describeLinkSource(link: any): string {
    if (link.label) {
      return link.label;
    }
    if (link.sourceType === 'functoid') {
      return `Functoid: ${this.getFunctoidName(link.sourceId)}`;
    }
    return `Source: ${link.sourcePath || link.sourceId}`;
  }

  private describeLinkTarget(link: any): string {
    if (link.label) {
      return link.label;
    }
    if (link.targetType === 'functoid') {
      return `Functoid: ${this.getFunctoidName(link.targetId)}`;
    }
    return `Target: ${link.targetPath || link.targetId}`;
  }

  private getCurrentPageFunctoid(functoidId: string): any | undefined {
    const page = this.state.map?.pages?.[this.state.activePage];
    return page?.functoids?.find((fn: any) => fn.id === functoidId);
  }

  private getFunctoidParameter(functoid: any, type: string): string {
    return functoid.parameters?.find((param: any) => param.type === type)?.value || '';
  }

  private bottomPanelActiveTab: BottomPanelTab = 'instance';
  private bottomPanelCollapsed = true;

  private showInstanceResult(data: any): void {
    this.bottomPanelCollapsed = false;
    this.bottomPanelActiveTab = 'instance';
    this.bottomPanel?.setCollapsed(false);
    this.bottomPanel?.setActiveTab('instance');
    this.bottomPanel?.setInputXml(data.xml || data.error || '');

    // If Test Map triggered the generation, auto-run the transform now
    if (this.pendingTestAfterGenerate && data.xml && this.state.map) {
      this.pendingTestAfterGenerate = false;
      this.bottomPanelActiveTab = 'output';
      this.bottomPanel?.setActiveTab('output');
      this.vscode.postMessage({ type: 'testMapWithInput', data: { inputXml: data.xml, map: this.state.map } });
    } else {
      this.pendingTestAfterGenerate = false;
    }
  }

  private showTestMapResult(data: any): void {
    this.bottomPanelCollapsed = false;
    this.bottomPanelActiveTab = 'output';
    this.bottomPanel?.setCollapsed(false);
    this.bottomPanel?.setActiveTab('output');
    if (data.error) {
      this.bottomPanel?.setOutput(`Error: ${data.error}`, true);
    } else {
      this.bottomPanel?.setOutput(data.output || data.xslt || '', false);
    }
  }
}
