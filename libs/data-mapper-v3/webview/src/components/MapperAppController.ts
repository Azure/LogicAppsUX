/**
 * BizTalk Data Mapper - Mapper operations controller
 */

import type { SchemaNodeView, SchemaTreeRenderer } from './SchemaTreeRenderer';
import type { MappingCanvas } from './MappingCanvas';
import type { FunctoidPalette } from './FunctoidPalette';
import type { FunctoidConfigDialog, FunctoidConfigInput, FunctoidConfigResult } from './FunctoidConfigDialog';
import type { ScriptingConfigDialog, ScriptingConfigResult, ScriptingConfigType, ScriptingFunctoidSummary } from './ScriptingConfigDialog';
import type { SchemaNodePropertiesDialog, SchemaNodePropertyRow } from './SchemaNodePropertiesDialog';
import type { EmptySchemaPlaceholder } from './EmptySchemaPlaceholder';
import type { MapperStatusBar } from './MapperStatusBar';
import type { MapperPageBar } from './MapperPageBar';
import type { CopilotPanel } from './CopilotPanel';
import type { MapperBottomPanel } from './MapperBottomPanel';
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
import { LinkEndpointType, ParameterType } from '../../../src/model/mapModel';

interface ScriptingConfigDraft {
  functoidId: string;
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
  private canvas: MappingCanvas | null = null;
  private palette: FunctoidPalette | null = null;
  private mappingAreaEl: HTMLElement | null = null;
  private pendingLink: { type: 'schemaNode' | 'functoid'; id: string; side: 'source' | 'target' } | null = null;
  private scriptingConfigDraft: ScriptingConfigDraft | null = null;
  private scriptingDialog: ScriptingConfigDialog | null = null;
  private bottomPanel: MapperBottomPanel | null = null;
  private functoidPropertiesId: string | null = null;
  private functoidInputsDraft: FunctoidInputDraft[] | null = null;
  private functoidLabelDraft = '';
  private functoidCommentsDraft = '';
  private schemaNodeProperties: SchemaNodeProperties | null = null;
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
    this.mappingAreaEl = elements.mappingArea;
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
    document.addEventListener('pointerup', this.handleLinkPointerUp);
  }

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
          this.canvas?.updateLinkPreview(this.pendingLinkPreviewPoint.x, this.pendingLinkPreviewPoint.y);
          this.pendingLinkPreviewPoint = null;
        }
      });
    }
  };

  private readonly handleLinkPointerUp = (): void => this.finishLinkPointer();

  private finishLinkPointer(): void {
    if (this.linkPointerMoved && this.pendingLink) {
      this.pendingLink = null;
      this.updateStatusMessage('');
    }
    this.linkPointerStart = null;
    this.linkPointerMoved = false;
    this.pendingLinkPreviewPoint = null;
    if (this.linkPreviewFrame !== null) {
      cancelAnimationFrame(this.linkPreviewFrame);
      this.linkPreviewFrame = null;
    }
    this.canvas?.clearLinkPreview();
  }

  private beginLinkPointer(clientX: number, clientY: number): void {
    this.linkPointerStart = { x: clientX, y: clientY };
    this.linkPointerMoved = false;
    this.canvas?.beginLinkPreview(clientX, clientY);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && (this.functoidPropertiesId || this.scriptingConfigDraft || this.schemaNodeProperties)) {
      if (this.schemaNodeProperties) {
        this.closeSchemaNodeProperties();
      } else {
        this.closeFunctoidDialog();
      }
      event.preventDefault();
      return;
    }
    if (event.key === 'Delete' || (event.ctrlKey && event.key === 'x')) {
      this.deleteSelected();
      event.preventDefault();
    }
    if (event.key === 'Escape') {
      this.pendingLink = null;
      this.state.selectedLink = null;
      this.state.selectedFunctoid = null;
      this.updateStatusMessage('');
      this.redrawLinks();
    }
    if (event.ctrlKey && event.key === 'c') {
      this.copySelected();
    }
    if (event.ctrlKey && event.key === 'v') {
      this.pasteClipboard();
    }
  };

  private readonly handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    this.showContextMenu(event.clientX, event.clientY);
  };

  private readonly handleResize = (): void => this.redrawLinks(true);
  private readonly handleSchemaScroll = (): void => this.redrawLinks(true);

  private clipboard: any = null;

  private copySelected(): void {
    if (!this.state.map) {
      return;
    }
    const page = this.state.map.pages[this.state.activePage];
    if (this.state.selectedFunctoid) {
      const f = page.functoids.find((fn: any) => fn.id === this.state.selectedFunctoid);
      if (f) {
        this.clipboard = { type: 'functoid', data: { ...f } };
        this.updateStatusMessage('Copied functoid');
      }
    } else if (this.state.selectedLink) {
      const l = page.links.find((ln: any) => ln.id === this.state.selectedLink);
      if (l) {
        this.clipboard = { type: 'link', data: { ...l } };
        this.updateStatusMessage('Copied link');
      }
    }
    setTimeout(() => this.updateStatusMessage(''), 2000);
  }

  private pasteClipboard(): void {
    if (!this.clipboard || !this.state.map) {
      return;
    }
    const page = this.state.map.pages[this.state.activePage];
    if (this.clipboard.type === 'functoid') {
      const f = { ...this.clipboard.data };
      f.id = `f_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      f.x += 30;
      f.y += 30;
      page.functoids.push(f);
      this.updateMap(this.state.map);
      this.redrawLinks();
      this.updateStatusMessage('Pasted functoid');
    }
    setTimeout(() => this.updateStatusMessage(''), 2000);
  }

  private showContextMenu(x: number, y: number): void {
    const hasSelection = !!(this.state.selectedLink || this.state.selectedFunctoid);
    const items: ContextMenuItem[] = [
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
      { label: '', divider: true, action: () => {} },
      { label: '🔗 Auto-Link by Name', disabled: !this.state.map, action: () => this.autoLinkByName() },
      { label: '✓ Validate Map', disabled: !this.state.map, action: () => this.validateMap() },
    ];

    const menu = this.elements.contextMenu;
    menu.hidden = false;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.configure(items, () => this.hideContextMenu());

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

  private hideContextMenu(): void {
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
        this.state.map = message.data;
        this.redrawLinks();
        break;
      }
      case 'schemaStateChanged': {
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
          this.state.map = message.data.map;
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
        (rootName) => this.vscode.postMessage({ type: 'selectSchemaRoot', side: 'source', rootName })
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
        (rootName) => this.vscode.postMessage({ type: 'selectSchemaRoot', side: 'target', rootName })
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
    this.canvas?.configure(this.state, {
      onLinkSelect: (linkId) => {
        this.state.selectedLink = linkId;
        this.state.selectedFunctoid = null;
        this.redrawLinks();
      },
      onFunctoidSelect: (fId) => {
        this.state.selectedFunctoid = fId;
        this.state.selectedLink = null;
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
        this.state.selectedLink = null;
        this.state.selectedFunctoid = null;
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
    const key = this.schemaNodeProperties
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
    this.elements.scriptingDialog.clear();
    this.elements.functoidDialog.clear();
    this.elements.schemaDialog.hidden = true;
    this.elements.scriptingDialog.hidden = true;
    this.elements.functoidDialog.hidden = true;
    if (key === 'schemaNode') {
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

  private openSchemaNodeProperties(node: SchemaNodeView, side: 'source' | 'target'): void {
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

    dialog.configure(
      {
        title: `${properties.side === 'source' ? 'Source' : 'Target'} Schema Node Properties`,
        nodeName: node.name,
        rows,
        description: node.annotation,
      },
      { onClose: () => this.closeSchemaNodeProperties() }
    );
  }

  /**
   * Functoid connector clicked (input = left/target side, output = right/source side)
   */
  private onFunctoidConnectorClick(functoidId: string, connector: 'input' | 'output'): void {
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
  private completeLinkCreation(
    source: { type: 'schemaNode' | 'functoid'; id: string },
    target: { type: 'schemaNode' | 'functoid'; id: string }
  ): void {
    if (!this.state.map) {
      return;
    }
    const page = this.state.map.pages[this.state.activePage];

    // Prevent duplicate
    const exists = page.links.find(
      (l: any) => l.sourceId === source.id && l.targetId === target.id && l.sourceType === source.type && l.targetType === target.type
    );
    if (exists) {
      this.pendingLink = null;
      this.updateStatusMessage('Link already exists');
      setTimeout(() => this.updateStatusMessage(''), 2000);
      return;
    }

    page.links.push({
      id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      sourceId: source.id,
      sourcePath: source.type === 'schemaNode' ? source.id : undefined,
      targetId: target.id,
      targetPath: target.type === 'schemaNode' ? target.id : undefined,
      sourceType: source.type === 'schemaNode' ? LinkEndpointType.SchemaNode : LinkEndpointType.Functoid,
      targetType: target.type === 'schemaNode' ? LinkEndpointType.SchemaNode : LinkEndpointType.Functoid,
    });

    this.pendingLink = null;
    this.updateStatusMessage('Link created ✓');
    setTimeout(() => this.updateStatusMessage(''), 2000);
    this.updateMap(this.state.map);
    this.redrawLinks();
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
    if (!this.canvas || !this.state.map || !this.mappingAreaEl) {
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
    this.state.map = map;
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
    let changed = false;
    if (this.state.selectedLink) {
      page.links = page.links.filter((l: any) => l.id !== this.state.selectedLink);
      this.state.selectedLink = null;
      changed = true;
    }
    if (this.state.selectedFunctoid) {
      page.functoids = page.functoids.filter((f: any) => f.id !== this.state.selectedFunctoid);
      page.links = page.links.filter((l: any) => l.sourceId !== this.state.selectedFunctoid && l.targetId !== this.state.selectedFunctoid);
      this.state.selectedFunctoid = null;
      changed = true;
    }
    if (changed) {
      this.updateMap(this.state.map);
      this.redrawLinks();
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
        page.links.push({
          id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 6)}_${added}`,
          sourceId: src.path,
          sourcePath: src.path,
          targetId: match.path,
          targetPath: match.path,
          sourceType: LinkEndpointType.SchemaNode,
          targetType: LinkEndpointType.SchemaNode,
        });
        added++;
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
    this.state.selectedFunctoid = functoidId;
    this.state.selectedLink = null;
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
    if (link.sourceType === 'functoid') {
      return `Functoid: ${this.getFunctoidName(link.sourceId)}`;
    }
    return `Source: ${link.sourcePath || link.sourceId}`;
  }

  private describeLinkTarget(link: any): string {
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

  private bottomPanelActiveTab: 'instance' | 'output' = 'instance';
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
