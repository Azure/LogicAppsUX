/**
 * BizTalk Data Mapper - Mapper operations controller
 */

import { SchemaNodeView, SchemaTreeRenderer } from './SchemaTreeRenderer';
import { MappingCanvas } from './MappingCanvas';
import { FunctoidPalette } from './FunctoidPalette';
import {
    AssemblyClassInfo,
    AssemblyMethodInfo,
    createInitialMapperViewState,
    HostToWebviewMessage,
    MapEditorVsCodeApi,
    MapperViewState,
} from '../../../src/protocol/mapEditorProtocol';
import { LinkEndpointType, ParameterType } from '../../../src/model/mapModel';

type ScriptingConfigType = 'inlineCSharp' | 'inlineVbNet' | 'inlineJScript' | 'inlineXslt' | 'inlineXsltCallTemplate' | 'externalAssembly';

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
    type: ParameterType.Link | ParameterType.Constant;
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

export class MapperAppController {
    private state: MapperViewState;
    private sourceTree: SchemaTreeRenderer | null = null;
    private targetTree: SchemaTreeRenderer | null = null;
    private canvas: MappingCanvas | null = null;
    private palette: FunctoidPalette | null = null;
    private mappingAreaEl: HTMLElement | null = null;
    private pendingLink: { type: 'schemaNode' | 'functoid'; id: string; side: 'source' | 'target' } | null = null;
    private scriptingConfigDraft: ScriptingConfigDraft | null = null;
    private functoidPropertiesId: string | null = null;
    private functoidInputsDraft: FunctoidInputDraft[] | null = null;
    private schemaNodeProperties: SchemaNodeProperties | null = null;
    private renamingPageIndex: number | null = null;
    private copilotPanelOpen = false;
    private copilotBusy = false;
    private copilotDraft = 'Take the XSLT file and generate the map.';
    private copilotMessage = '';
    private copilotContextFiles: Array<{ id: string; name: string; size: number }> = [];

    private resizeObserver: ResizeObserver | null = null;

    constructor(
        private readonly container: HTMLElement,
        private readonly vscode: MapEditorVsCodeApi
    ) {
        this.state = createInitialMapperViewState();
    }

    public mount(): void {
        this.renderView();
        this.setupKeyboardShortcuts();
    }

    public dispose(): void {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('contextmenu', this.handleContextMenu);
        window.removeEventListener('resize', this.handleResize);
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        document.querySelectorAll('.context-menu').forEach(menu => menu.remove());
        this.container.replaceChildren();
    }

    private setupKeyboardShortcuts(): void {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('contextmenu', this.handleContextMenu);
    }

    private readonly handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape' &&
            (this.functoidPropertiesId || this.scriptingConfigDraft || this.schemaNodeProperties)) {
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

    private readonly handleResize = (): void => this.redrawLinks();

    private clipboard: any = null;

    private copySelected(): void {
        if (!this.state.map) { return; }
        const page = this.state.map.pages[this.state.activePage];
        if (this.state.selectedFunctoid) {
            const f = page.functoids.find((fn: any) => fn.id === this.state.selectedFunctoid);
            if (f) { this.clipboard = { type: 'functoid', data: { ...f } }; this.updateStatusMessage('Copied functoid'); }
        } else if (this.state.selectedLink) {
            const l = page.links.find((ln: any) => ln.id === this.state.selectedLink);
            if (l) { this.clipboard = { type: 'link', data: { ...l } }; this.updateStatusMessage('Copied link'); }
        }
        setTimeout(() => this.updateStatusMessage(''), 2000);
    }

    private pasteClipboard(): void {
        if (!this.clipboard || !this.state.map) { return; }
        const page = this.state.map.pages[this.state.activePage];
        if (this.clipboard.type === 'functoid') {
            const f = { ...this.clipboard.data };
            f.id = `f_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            f.x += 30; f.y += 30;
            page.functoids.push(f);
            this.updateMap(this.state.map);
            this.redrawLinks();
            this.updateStatusMessage('Pasted functoid');
        }
        setTimeout(() => this.updateStatusMessage(''), 2000);
    }

    private showContextMenu(x: number, y: number): void {
        // Remove existing menu
        document.querySelectorAll('.context-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        const hasSelection = !!(this.state.selectedLink || this.state.selectedFunctoid);
        const items = [
            { label: '✂️ Cut', shortcut: 'Ctrl+X', action: () => { this.copySelected(); this.deleteSelected(); }, disabled: !hasSelection },
            { label: '📋 Copy', shortcut: 'Ctrl+C', action: () => this.copySelected(), disabled: !hasSelection },
            { label: '📄 Paste', shortcut: 'Ctrl+V', action: () => this.pasteClipboard(), disabled: !this.clipboard },
            { label: '---', shortcut: '', action: () => {}, disabled: false },
            { label: '🗑️ Delete', shortcut: 'Del', action: () => this.deleteSelected(), disabled: !hasSelection },
            { label: '---', shortcut: '', action: () => {}, disabled: false },
            { label: '🔗 Auto-Link by Name', shortcut: '', action: () => this.autoLinkByName(), disabled: !this.state.map },
            { label: '✓ Validate Map', shortcut: '', action: () => this.validateMap(), disabled: !this.state.map },
        ];

        for (const item of items) {
            if (item.label === '---') {
                const sep = document.createElement('div');
                sep.className = 'context-menu-separator';
                menu.appendChild(sep);
                continue;
            }
            const el = document.createElement('div');
            el.className = `context-menu-item${item.disabled ? ' disabled' : ''}`;
            el.innerHTML = `<span class="menu-label">${item.label}</span><span class="menu-shortcut">${item.shortcut}</span>`;
            if (!item.disabled) {
                el.addEventListener('click', () => { menu.remove(); item.action(); });
            }
            menu.appendChild(el);
        }

        document.body.appendChild(menu);

        // Close on click outside
        const closeHandler = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node)) { menu.remove(); document.removeEventListener('click', closeHandler); }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    }

    public handleMessage(message: HostToWebviewMessage): void {
        switch (message.type) {
            case 'init':
                this.state.map = message.data.map;
                this.state.sourceSchema = message.data.sourceSchema;
                this.state.targetSchema = message.data.targetSchema;
                this.state.functoids = message.data.functoids;
                this.renderView();
                setTimeout(() => this.redrawLinks(), 150);
                break;
            case 'documentChanged':
                this.state.map = message.data;
                this.redrawLinks();
                break;
            case 'schemaLoaded':
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
            case 'compileResult':
                this.showCompileResult(message.data);
                break;
            case 'assemblySelected':
                if (this.scriptingConfigDraft) {
                    this.scriptingConfigDraft.assemblyPath = message.data.path || '';
                    this.scriptingConfigDraft.assemblyClasses = message.data.classes || [];
                    const assemblyInput = this.container.querySelector('#config-assembly-path') as HTMLInputElement | null;
                    if (assemblyInput) {
                        assemblyInput.value = this.scriptingConfigDraft.assemblyPath;
                    }
                    // Auto-select first class and method
                    const classes = this.scriptingConfigDraft.assemblyClasses;
                    if (classes && classes.length > 0) {
                        const firstClass = classes[0];
                        this.scriptingConfigDraft.className = firstClass.className;
                        if (firstClass.methods.length > 0) {
                            this.scriptingConfigDraft.methodName = firstClass.methods[0].name;
                        }
                    }

                    this.refreshScriptingAssemblySuggestions();
                }
                break;
            case 'instanceGenerated':
                this.showInstanceResult(message.data);
                break;
            case 'testMapResult':
                this.showTestMapResult(message.data);
                break;
            case 'copilotResult':
                this.copilotBusy = false;
                this.copilotMessage = message.data.message;
                if (message.data.applied && message.data.map) {
                    this.state.map = message.data.map;
                }
                this.renderView();
                break;
            case 'copilotContextChanged':
                this.copilotContextFiles = message.data.files;
                if (message.data.message) {
                    this.copilotMessage = message.data.message;
                }
                this.renderView();
                break;
        }
    }

    private renderView(): void {
        this.container.innerHTML = '';
        this.container.className = 'mapper-container';

        // Toolbar
        this.container.appendChild(this.createToolbar());
        if (this.copilotPanelOpen) {
            this.container.appendChild(this.createCopilotPanel());
        }

        // Main content area
        const content = document.createElement('div');
        content.className = 'mapper-content';

        // Functoid palette
        const paletteContainer = new FunctoidPalette();
        paletteContainer.className = 'functoid-palette-container';
        this.palette = paletteContainer;
        this.palette.configure(this.state.functoids, (functoid) => {
            this.addFunctoidToCanvas(functoid);
        });
        content.appendChild(paletteContainer);

        // Mapping area
        const mappingArea = document.createElement('div');
        mappingArea.className = 'mapping-area';
        this.mappingAreaEl = mappingArea;

        // Source schema tree
        let sourceContainer: HTMLElement;
        if (this.state.sourceSchema) {
            const sourceTree = new SchemaTreeRenderer();
            sourceContainer = sourceTree;
            sourceContainer.className = 'schema-tree-container source-tree';
            const expandedPaths = this.getLinkedPaths('source');
            this.sourceTree = sourceTree;
            this.sourceTree.configure(
                this.state.sourceSchema, 'source',
                (nodePath) => this.onSourceNodeClick(nodePath),
                expandedPaths,
                (srcPath, tgtPath) => this.completeLinkCreation({ type: 'schemaNode', id: srcPath }, { type: 'schemaNode', id: tgtPath }),
                (node) => this.openSchemaNodeProperties(node, 'source')
            );
        } else {
            sourceContainer = document.createElement('div');
            sourceContainer.className = 'schema-tree-container source-tree';
            this.sourceTree = null;
            sourceContainer.innerHTML = `<div class="empty-schema"><div class="empty-schema-content"><div class="empty-icon">📄</div><p>No source schema</p><button class="load-schema-btn">Load Source Schema</button></div></div>`;
            sourceContainer.querySelector('.load-schema-btn')?.addEventListener('click', () => {
                this.vscode.postMessage({ type: 'loadSchema', side: 'source' });
            });
        }
        mappingArea.appendChild(sourceContainer);

        // Canvas
        const canvasContainer = new MappingCanvas();
        canvasContainer.className = 'canvas-container';
        this.canvas = canvasContainer;
        this.canvas.configure(this.state, {
            onLinkSelect: (linkId) => { this.state.selectedLink = linkId; this.state.selectedFunctoid = null; this.redrawLinks(); },
            onFunctoidSelect: (fId) => { this.state.selectedFunctoid = fId; this.state.selectedLink = null; this.redrawLinks(); },
            onFunctoidDoubleClick: (fId) => { this.onFunctoidDoubleClick(fId); },
            onFunctoidDrop: (functoid, x, y) => { this.addFunctoidAtPosition(functoid, x, y); },
            onFunctoidMove: (fId, x, y) => {
                const page = this.state.map?.pages[this.state.activePage];
                const f = page?.functoids.find((fn: any) => fn.id === fId);
                if (f) { f.x = x; f.y = y; this.updateMap(this.state.map); }
            },
            onFunctoidInputClick: (fId) => { this.onFunctoidConnectorClick(fId, 'input'); },
            onFunctoidOutputClick: (fId) => { this.onFunctoidConnectorClick(fId, 'output'); },
            onDeselect: () => { this.state.selectedLink = null; this.state.selectedFunctoid = null; this.redrawLinks(); }
        });
        mappingArea.appendChild(canvasContainer);

        // Target schema tree
        let targetContainer: HTMLElement;
        if (this.state.targetSchema) {
            const targetTree = new SchemaTreeRenderer();
            targetContainer = targetTree;
            targetContainer.className = 'schema-tree-container target-tree';
            const expandedPaths = this.getLinkedPaths('target');
            this.targetTree = targetTree;
            this.targetTree.configure(
                this.state.targetSchema, 'target',
                (nodePath) => this.onTargetNodeClick(nodePath),
                expandedPaths,
                (srcPath, tgtPath) => this.completeLinkCreation({ type: 'schemaNode', id: srcPath }, { type: 'schemaNode', id: tgtPath }),
                (node) => this.openSchemaNodeProperties(node, 'target')
            );
        } else {
            targetContainer = document.createElement('div');
            targetContainer.className = 'schema-tree-container target-tree';
            this.targetTree = null;
            targetContainer.innerHTML = `<div class="empty-schema"><div class="empty-schema-content"><div class="empty-icon">📄</div><p>No target schema</p><button class="load-schema-btn">Load Target Schema</button></div></div>`;
            targetContainer.querySelector('.load-schema-btn')?.addEventListener('click', () => {
                this.vscode.postMessage({ type: 'loadSchema', side: 'target' });
            });
        }
        mappingArea.appendChild(targetContainer);

        content.appendChild(mappingArea);
        this.container.appendChild(content);

        // Bottom panel (Instance Generator / Test Output)
        this.container.appendChild(this.createBottomPanel());

        // Status bar
        this.container.appendChild(this.createStatusBar());

        if (this.schemaNodeProperties) {
            this.container.appendChild(this.createSchemaNodePropertiesModal());
        } else if (this.scriptingConfigDraft) {
            this.container.appendChild(this.createScriptingConfigModal());
        } else if (this.functoidPropertiesId) {
            this.container.appendChild(this.createFunctoidPropertiesModal());
        }

        // Scroll listeners for redraw
        sourceContainer.addEventListener('scroll', () => this.redrawLinks());
        targetContainer.addEventListener('scroll', () => this.redrawLinks());

        // Redraw links on resize
        this.resizeObserver?.disconnect();
        this.resizeObserver = new ResizeObserver(() => this.redrawLinks());
        this.resizeObserver.observe(mappingArea);
        this.resizeObserver.observe(canvasContainer);

        window.removeEventListener('resize', this.handleResize);
        window.addEventListener('resize', this.handleResize);
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
            this.completeLinkCreation(
                { type: 'schemaNode', id: nodePath },
                { type: this.pendingLink.type, id: this.pendingLink.id }
            );
        } else {
            // Start new link from source
            this.pendingLink = { type: 'schemaNode', id: nodePath, side: 'source' };
            this.updateStatusMessage(`Source: ${this.getLastSegment(nodePath)} → click target node or functoid input`);
        }
    }

    /**
     * Target schema node connector clicked
     */
    private onTargetNodeClick(nodePath: string): void {
        if (this.pendingLink && this.pendingLink.side === 'source') {
            // Complete: pending source → target node
            this.completeLinkCreation(
                { type: this.pendingLink.type, id: this.pendingLink.id },
                { type: 'schemaNode', id: nodePath }
            );
        } else {
            // No pending source — store as pending target (for functoid output → target)
            this.pendingLink = { type: 'schemaNode', id: nodePath, side: 'target' };
            this.updateStatusMessage(`Target: ${this.getLastSegment(nodePath)} → click source node or functoid output`);
        }
    }

    private openSchemaNodeProperties(node: SchemaNodeView, side: 'source' | 'target'): void {
        const schema = side === 'source' ? this.state.sourceSchema : this.state.targetSchema;
        this.schemaNodeProperties = {
            node,
            side,
            schemaNamespace: node.namespace || schema?.targetNamespace
        };
        this.renderView();
        setTimeout(() => this.redrawLinks(), 0);
    }

    private closeSchemaNodeProperties(): void {
        this.schemaNodeProperties = null;
        this.renderView();
        setTimeout(() => this.redrawLinks(), 0);
    }

    private createSchemaNodePropertiesModal(): HTMLElement {
        const properties = this.schemaNodeProperties!;
        const node = properties.node;
        const occurrence = `${node.minOccurs ?? (node.isOptional ? 0 : 1)}..${node.maxOccurs ?? 1}`;
        const rows: Array<[string, string | number | boolean | undefined]> = [
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
            ['Fixed value', node.fixedValue]
        ];
        const restrictions = node.restrictions
            ? Object.entries(node.restrictions)
                .filter(([, value]) => value !== undefined)
                .map(([name, value]) =>
                    `<div class="schema-property-row"><dt>${this.escapeHtml(name)}</dt><dd>${this.escapeHtml(Array.isArray(value) ? value.join(', ') : String(value))}</dd></div>`
                ).join('')
            : '';
        const modal = document.createElement('div');
        modal.className = 'functoid-config-modal';
        modal.innerHTML = `
            <div class="functoid-config-panel schema-properties-panel" role="dialog"
                aria-modal="true" aria-label="Schema Node Properties">
                <div class="config-title">${properties.side === 'source' ? 'Source' : 'Target'} Schema Node Properties</div>
                <div class="schema-property-name">${this.escapeHtml(node.name)}</div>
                <dl class="schema-property-list">
                    ${rows.filter(([, value]) => value !== undefined && value !== '').map(([label, value]) => `
                        <div class="schema-property-row">
                            <dt>${this.escapeHtml(label)}</dt>
                            <dd${label === 'XPath' ? ' class="schema-property-xpath"' : ''}>${this.escapeHtml(String(value))}</dd>
                        </div>`).join('')}
                    ${restrictions}
                </dl>
                ${node.annotation ? `
                    <div class="functoid-property-section">
                        <div class="functoid-property-heading">Description</div>
                        <div class="functoid-property-description">${this.escapeHtml(node.annotation)}</div>
                    </div>` : ''}
                <div class="config-actions">
                    <button type="button" class="config-btn config-btn-primary" id="schema-properties-close">Close</button>
                </div>
            </div>`;
        modal.addEventListener('click', event => {
            if (event.target === modal) { this.closeSchemaNodeProperties(); }
        });
        modal.querySelector('#schema-properties-close')?.addEventListener(
            'click',
            () => this.closeSchemaNodeProperties()
        );
        return modal;
    }

    /**
     * Functoid connector clicked (input = left/target side, output = right/source side)
     */
    private onFunctoidConnectorClick(functoidId: string, connector: 'input' | 'output'): void {
        if (connector === 'input') {
            // Functoid input = this is a "target" endpoint
            if (this.pendingLink && this.pendingLink.side === 'source') {
                // Complete: pending source → functoid input
                this.completeLinkCreation(
                    { type: this.pendingLink.type, id: this.pendingLink.id },
                    { type: 'functoid', id: functoidId }
                );
            } else {
                // Store as pending target
                this.pendingLink = { type: 'functoid', id: functoidId, side: 'target' };
                const name = this.getFunctoidName(functoidId);
                this.updateStatusMessage(`Target: ${name} input → click source node or functoid output`);
            }
        } else {
            // Functoid output = this is a "source" endpoint
            if (this.pendingLink && this.pendingLink.side === 'target') {
                // Complete: functoid output → pending target
                this.completeLinkCreation(
                    { type: 'functoid', id: functoidId },
                    { type: this.pendingLink.type, id: this.pendingLink.id }
                );
            } else {
                // Store as pending source
                this.pendingLink = { type: 'functoid', id: functoidId, side: 'source' };
                const name = this.getFunctoidName(functoidId);
                this.updateStatusMessage(`Source: ${name} output → click target node or functoid input`);
            }
        }
    }

    /**
     * Creates a link between source and target endpoints
     */
    private completeLinkCreation(
        source: { type: 'schemaNode' | 'functoid'; id: string },
        target: { type: 'schemaNode' | 'functoid'; id: string }
    ): void {
        if (!this.state.map) { return; }
        const page = this.state.map.pages[this.state.activePage];

        // Prevent duplicate
        const exists = page.links.find((l: any) =>
            l.sourceId === source.id && l.targetId === target.id &&
            l.sourceType === source.type && l.targetType === target.type
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
            sourceType: source.type === 'schemaNode'
                ? LinkEndpointType.SchemaNode
                : LinkEndpointType.Functoid,
            targetType: target.type === 'schemaNode'
                ? LinkEndpointType.SchemaNode
                : LinkEndpointType.Functoid
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

    private redrawLinks(): void {
        if (!this.canvas || !this.state.map || !this.mappingAreaEl) { return; }

        const page = this.state.map.pages[this.state.activePage];
        if (!page) { return; }

        const positions: Map<string, { x: number; y: number }> = new Map();

        if (this.sourceTree) {
            for (const link of page.links) {
                if (link.sourcePath && link.sourceType !== 'functoid') {
                    const pos = this.sourceTree.getNodePosition(link.sourcePath);
                    if (pos) { positions.set(`src:${link.sourcePath}`, pos); }
                }
            }
        }

        if (this.targetTree) {
            for (const link of page.links) {
                if (link.targetPath && link.targetType !== 'functoid') {
                    const pos = this.targetTree.getNodePosition(link.targetPath);
                    if (pos) { positions.set(`tgt:${link.targetPath}`, pos); }
                }
            }
        }

        this.canvas.renderWithPositions(positions, page);
    }

    private createToolbar(): HTMLElement {
        const toolbar = document.createElement('div');
        toolbar.className = 'mapper-toolbar';
        const hasMap = !!this.state.map;
        const mapName = this.state.map?.name || 'No Map';

        toolbar.innerHTML = `
            <div class="toolbar-group"><span class="toolbar-map-name">📐 ${mapName}</span></div>
            <div class="toolbar-group">
                <button class="toolbar-btn primary" id="btn-validate-compile" ${!hasMap ? 'disabled' : ''}>▶ Validate and Compile</button>
                <button class="toolbar-btn" id="btn-test-map" ${!hasMap ? 'disabled' : ''}>🧪 Test Map</button>
                <button class="toolbar-btn" id="btn-deploy-logicapp" ${!hasMap ? 'disabled' : ''}>☁️ Deploy to Logic Apps</button>
                <button class="toolbar-btn copilot" id="btn-copilot" ${!hasMap ? 'disabled' : ''}>✨ Data Mapper Assistant</button>
            </div>
            <div class="toolbar-group page-tabs">
                ${this.state.map?.pages?.map((p: any, i: number) =>
                    i === this.renamingPageIndex
                        ? `<input class="page-name-input" data-page="${i}" type="text"
                            value="${this.escapeHtml(p.name)}" aria-label="Page name">`
                        : `<span class="page-tab-group">
                            <button class="page-tab ${i === this.state.activePage ? 'active' : ''}"
                                data-page="${i}" title="Double-click to rename">${this.escapeHtml(p.name)}</button>
                            <button class="page-delete-btn" data-page="${i}" title="${this.state.map!.pages.length === 1 ? 'A map must have at least one page' : `Delete ${this.escapeHtml(p.name)}`}"
                                aria-label="Delete ${this.escapeHtml(p.name)}" ${this.state.map!.pages.length === 1 ? 'disabled' : ''}>×</button>
                           </span>`
                ).join('') || ''}
                <button class="toolbar-btn small" id="btn-add-page">+</button>
            </div>
            <div class="toolbar-group"><span class="toolbar-status" id="toolbar-status"></span></div>
        `;

        toolbar.querySelector('#btn-validate-compile')?.addEventListener('click', () => this.validateAndCompile());
        toolbar.querySelector('#btn-deploy-logicapp')?.addEventListener('click', () => {
            if (this.state.map) {
                this.vscode.postMessage({ type: 'deployToLogicApps', data: this.state.map });
            }
        });
        toolbar.querySelector('#btn-test-map')?.addEventListener('click', () => this.runTestMap());
        toolbar.querySelector('#btn-copilot')?.addEventListener('click', () => {
            this.copilotPanelOpen = !this.copilotPanelOpen;
            this.renderView();
            if (this.copilotPanelOpen) {
                setTimeout(() => this.container.querySelector<HTMLTextAreaElement>('#copilot-prompt')?.focus());
            }
        });
        toolbar.querySelector('#btn-add-page')?.addEventListener('click', () => this.addPage());
        toolbar.querySelectorAll<HTMLButtonElement>('.page-delete-btn').forEach(button => {
            button.addEventListener('click', event => {
                event.stopPropagation();
                this.deletePage(Number(button.dataset.page));
            });
        });
        toolbar.querySelectorAll('.page-tab').forEach(tab => {
            let clickTimer: number | undefined;
            tab.addEventListener('click', (e) => {
                const pageIndex = parseInt((e.currentTarget as HTMLElement).dataset.page || '0', 10);
                if (clickTimer !== undefined) {
                    window.clearTimeout(clickTimer);
                }
                clickTimer = window.setTimeout(() => {
                    this.state.activePage = pageIndex;
                    this.renderView();
                }, 200);
            });
            tab.addEventListener('dblclick', (e) => {
                if (clickTimer !== undefined) {
                    window.clearTimeout(clickTimer);
                }
                const pageIndex = parseInt((e.currentTarget as HTMLElement).dataset.page || '0', 10);
                this.state.activePage = pageIndex;
                this.renamingPageIndex = pageIndex;
                this.renderView();
                const input = this.container.querySelector<HTMLInputElement>(
                    `.page-name-input[data-page="${pageIndex}"]`
                );
                input?.focus();
                input?.select();
            });
        });
        const pageNameInput = toolbar.querySelector<HTMLInputElement>('.page-name-input');
        if (pageNameInput) {
            const pageIndex = Number(pageNameInput.dataset.page);
            const commitRename = (): void => {
                if (this.renamingPageIndex !== pageIndex || !this.state.map) { return; }
                const name = pageNameInput.value.trim();
                const page = this.state.map.pages[pageIndex];
                this.renamingPageIndex = null;
                if (name && page && page.name !== name) {
                    page.name = name;
                    this.updateMap(this.state.map);
                }
                this.renderView();
            };
            pageNameInput.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    commitRename();
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    this.renamingPageIndex = null;
                    this.renderView();
                }
            });
            pageNameInput.addEventListener('blur', commitRename);
        }

        return toolbar;
    }

    private createCopilotPanel(): HTMLElement {
        const panel = document.createElement('section');
        panel.className = 'copilot-prompt-panel';
        panel.innerHTML = `
            <div class="copilot-prompt-heading">
                <div>
                    <strong>Data Mapper Assistant</strong>
                    <span>Describe links, functoids, constants, or page changes. Review is required before the BTM is updated.</span>
                </div>
                <button class="copilot-close" id="copilot-close" title="Close" aria-label="Close Data Mapper Assistant">×</button>
            </div>
            <div class="copilot-prompt-controls">
                <textarea id="copilot-prompt" rows="3" ${this.copilotBusy ? 'disabled' : ''}
                    placeholder="Example: On this page, connect CustomerName to FullName using String Concatenate.">${this.escapeHtml(this.copilotDraft)}</textarea>
                <button class="toolbar-btn primary" id="copilot-submit"
                    ${this.copilotBusy || !this.state.map ? 'disabled' : ''}>${this.copilotBusy ? 'Working…' : 'Apply with Assistant'}</button>
            </div>
            <div class="copilot-context-toolbar">
                <button class="toolbar-btn small" id="copilot-add-context" ${this.copilotBusy ? 'disabled' : ''}>＋ Add context files</button>
                ${this.copilotContextFiles.length > 0
                    ? `<button class="copilot-clear-context" id="copilot-clear-context" ${this.copilotBusy ? 'disabled' : ''}>Clear all</button>`
                    : '<span class="copilot-context-empty">No additional context files</span>'}
            </div>
            ${this.copilotContextFiles.length > 0 ? `<div class="copilot-context-files">
                ${this.copilotContextFiles.map(file => `<span class="copilot-context-file" title="${this.escapeHtml(file.name)} (${this.formatFileSize(file.size)})">
                    <span>${this.escapeHtml(file.name)}</span>
                    <button class="copilot-remove-context" data-context-id="${this.escapeHtml(file.id)}"
                        aria-label="Remove ${this.escapeHtml(file.name)}" ${this.copilotBusy ? 'disabled' : ''}>×</button>
                </span>`).join('')}
            </div>` : ''}
            ${this.copilotMessage ? `<div class="copilot-result">${this.escapeHtml(this.copilotMessage)}</div>` : ''}
            <div class="copilot-hint">Press Ctrl+Enter to submit. Assistant output is validated and applied as one undoable edit.</div>
        `;

        const input = panel.querySelector<HTMLTextAreaElement>('#copilot-prompt');
        input?.addEventListener('input', () => {
            this.copilotDraft = input.value;
        });
        input?.addEventListener('keydown', event => {
            if (event.ctrlKey && event.key === 'Enter') {
                event.preventDefault();
                this.submitCopilotPrompt();
            }
        });
        panel.querySelector('#copilot-submit')?.addEventListener('click', () => this.submitCopilotPrompt());
        panel.querySelector('#copilot-add-context')?.addEventListener('click', () => {
            this.vscode.postMessage({ type: 'browseCopilotContext' });
        });
        panel.querySelector('#copilot-clear-context')?.addEventListener('click', () => {
            this.vscode.postMessage({ type: 'clearCopilotContext' });
        });
        panel.querySelectorAll<HTMLButtonElement>('.copilot-remove-context').forEach(button => {
            button.addEventListener('click', () => {
                this.vscode.postMessage({
                    type: 'removeCopilotContext',
                    data: { id: button.dataset.contextId || '' }
                });
            });
        });
        panel.querySelector('#copilot-close')?.addEventListener('click', () => {
            this.copilotPanelOpen = false;
            this.renderView();
        });
        return panel;
    }

    private formatFileSize(bytes: number): string {
        return bytes < 1024 ? `${bytes} B` : `${Math.ceil(bytes / 1024)} KB`;
    }

    private submitCopilotPrompt(): void {
        const prompt = this.copilotDraft.trim();
        if (!prompt || !this.state.map || this.copilotBusy) {
            return;
        }
        this.copilotBusy = true;
        this.copilotMessage = 'Data Mapper Assistant is preparing a validated map edit…';
        this.renderView();
        this.vscode.postMessage({
            type: 'copilotPrompt',
            data: { prompt, activePage: this.state.activePage }
        });
    }

    private createStatusBar(): HTMLElement {
        const statusBar = document.createElement('div');
        statusBar.className = 'mapper-statusbar';
        const page = this.state.map?.pages?.[this.state.activePage];
        statusBar.innerHTML = `
            <span class="status-item">Links: <strong>${page?.links?.length || 0}</strong></span>
            <span class="status-item">Functoids: <strong>${page?.functoids?.length || 0}</strong></span>
            <span class="status-sep">|</span>
            <span class="status-item">Src: ${this.getFileName(this.state.map?.sourceSchema?.location)}</span>
            <span class="status-item">Tgt: ${this.getFileName(this.state.map?.targetSchema?.location)}</span>
        `;
        return statusBar;
    }

    private updateStatusMessage(msg: string): void {
        const el = document.getElementById('toolbar-status');
        if (el) { el.textContent = msg; el.style.color = msg ? '#4fc1ff' : ''; }
    }

    private updateMap(map: any): void {
        this.state.map = map;
        this.vscode.postMessage({ type: 'update', data: map });
    }

    private addFunctoidToCanvas(functoid: any): void {
        if (!this.state.map) { return; }
        const page = this.state.map.pages[this.state.activePage];
        page.functoids.push({
            id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            functoidId: functoid.id,
            category: functoid.category,
            name: functoid.name,
            x: 200, y: 80 + (page.functoids.length * 60),
            inputLinks: [], outputLinks: [], parameters: []
        });
        this.updateMap(this.state.map);
        this.redrawLinks();
    }

    private addFunctoidAtPosition(functoid: any, x: number, y: number): void {
        if (!this.state.map) { return; }
        const page = this.state.map.pages[this.state.activePage];
        page.functoids.push({
            id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            functoidId: functoid.id,
            category: functoid.category,
            name: functoid.name,
            x: x, y: y,
            inputLinks: [], outputLinks: [], parameters: []
        });
        this.updateMap(this.state.map);
        this.redrawLinks();
    }

    private addPage(): void {
        if (!this.state.map) { return; }
        const idx = this.state.map.pages.length + 1;
        this.state.map.pages.push({ id: `page${idx}`, name: `Page ${idx}`, links: [], functoids: [] });
        this.state.activePage = this.state.map.pages.length - 1;
        this.updateMap(this.state.map);
        this.renderView();
    }

    private deletePage(pageIndex: number): void {
        if (!this.state.map || this.state.map.pages.length <= 1) { return; }
        const page = this.state.map.pages[pageIndex];
        if (!page) { return; }
        if ((page.links.length > 0 || page.functoids.length > 0) &&
            !window.confirm(`Delete page "${page.name}" and all of its mappings?`)) {
            return;
        }
        this.state.map.pages.splice(pageIndex, 1);
        if (this.state.activePage > pageIndex) {
            this.state.activePage--;
        } else if (this.state.activePage >= this.state.map.pages.length) {
            this.state.activePage = this.state.map.pages.length - 1;
        }
        this.renamingPageIndex = null;
        this.updateMap(this.state.map);
        this.renderView();
    }

    private deleteSelected(): void {
        if (!this.state.map) { return; }
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
        if (changed) { this.updateMap(this.state.map); this.redrawLinks(); }
    }

    private autoLinkByName(): void {
        if (!this.state.sourceSchema || !this.state.targetSchema || !this.state.map) { return; }
        const page = this.state.map.pages[this.state.activePage];
        const sourceNodes = this.flattenLeafNodes(this.state.sourceSchema.rootElement);
        const targetNodes = this.flattenLeafNodes(this.state.targetSchema.rootElement);
        let added = 0;

        for (const src of sourceNodes) {
            const match = targetNodes.find((t: any) => t.name.toLowerCase() === src.name.toLowerCase());
            if (match && !page.links.find((l: any) => l.sourcePath === src.path && l.targetPath === match.path)) {
                page.links.push({
                    id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 6)}_${added}`,
                    sourceId: src.path, sourcePath: src.path,
                    targetId: match.path, targetPath: match.path,
                    sourceType: LinkEndpointType.SchemaNode,
                    targetType: LinkEndpointType.SchemaNode
                });
                added++;
            }
        }
        if (added > 0) { this.updateMap(this.state.map); this.renderView(); setTimeout(() => this.redrawLinks(), 150); }
    }

    private validateAndCompile(): void {
        if (!this.state.map) { return; }

        // First validate
        const issues = this.getValidationIssues();
        const errors = issues.filter(i => i.startsWith('✗'));

        if (errors.length > 0) {
            // Has errors — show validation results and don't compile
            const warnings = issues.filter(i => i.startsWith('⚠'));
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
        for (const functoid of (page.functoids || [])) {
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
        if (!this.state.map) { return; }
        // Combined flow: generate instance (if needed) → run XSLT transform
        this.bottomPanelCollapsed = false;
        this.bottomPanelActiveTab = 'instance';
        const panel = this.container.querySelector('.bottom-panel') as HTMLElement;
        if (panel) { this.refreshBottomPanel(panel); }

        const textarea = this.container.querySelector('#instance-xml') as HTMLTextAreaElement;
        const existingInput = textarea?.value?.trim() || '';

        if (existingInput) {
            // Already have input — go straight to transform
            this.bottomPanelActiveTab = 'output';
            if (panel) { this.refreshBottomPanel(panel); }
            this.vscode.postMessage({ type: 'testMapWithInput', data: { inputXml: existingInput, map: this.state.map } });
        } else {
            // Generate instance first, then auto-run transform on response
            this.pendingTestAfterGenerate = true;
            this.vscode.postMessage({ type: 'generateInstance', side: 'source' });
        }
    }

    private pendingTestAfterGenerate = false;

    private validateMap(): void {
        if (!this.state.map) { return; }
        const issues = this.getValidationIssues();

        if (issues.length === 0) {
            this.showNotification('Map is valid ✓', 'success');
        } else {
            const errors = issues.filter(i => i.startsWith('✗')).length;
            const warnings = issues.filter(i => i.startsWith('⚠')).length;
            const summary = `${errors} error(s), ${warnings} warning(s)`;
            this.showNotification(`Validation: ${summary}`, errors > 0 ? 'error' : 'warning', issues.join('\n'));
        }
    }

    private showCompileResult(result: any): void {
        if (!result.success) { this.showNotification('Compilation failed', 'error', result.errors.map((e: any) => e.message).join('\n')); }
        else { this.showNotification('Compiled ✓', 'success'); }
    }

    private showNotification(title: string, type: 'success' | 'warning' | 'error', details?: string): void {
        this.container.querySelectorAll('.notification').forEach(n => n.remove());
        const notif = document.createElement('div');
        notif.className = `notification notification-${type}`;
        notif.innerHTML = `<div class="notif-header"><strong>${title}</strong><span class="notif-close">✕</span></div>${details ? `<pre class="notif-details">${details}</pre>` : ''}`;
        notif.querySelector('.notif-close')?.addEventListener('click', () => notif.remove());
        this.container.appendChild(notif);
        setTimeout(() => notif.remove(), 5000);
    }

    private getLinkedPaths(side: 'source' | 'target'): Set<string> {
        const paths = new Set<string>();
        if (!this.state.map) { return paths; }
        const page = this.state.map.pages[this.state.activePage];
        if (!page) { return paths; }
        for (const link of page.links) {
            const p = side === 'source' ? link.sourcePath : link.targetPath;
            if (p) { const parts = p.split('/').filter((s: string) => s); let cur = ''; for (const part of parts) { cur += '/' + part; paths.add(cur); } }
        }
        return paths;
    }

    private flattenLeafNodes(node: any, result: any[] = []): any[] {
        if (!node.children || node.children.length === 0) { result.push(node); }
        if (node.children) { for (const c of node.children) this.flattenLeafNodes(c, result); }
        return result;
    }

    private getFileName(p?: string): string { return p ? (p.split(/[/\\]/).pop() || p) : 'None'; }
    private getLastSegment(p: string): string { return p.split('/').filter(s => s).pop() || p; }

    // Real BizTalk FIDs for the Scripting functoid
    private static readonly SCRIPTING_FIDS = new Set([600, 260]);

    private isScriptingFunctoid(functoid: any): boolean {
        return MapperAppController.SCRIPTING_FIDS.has(functoid?.functoidId);
    }

    private onFunctoidDoubleClick(functoidId: string): void {
        const functoid = this.getCurrentPageFunctoid(functoidId);
        if (!functoid) { return; }
        this.state.selectedFunctoid = functoidId;
        this.state.selectedLink = null;
        if (!this.isScriptingFunctoid(functoid)) {
            this.functoidPropertiesId = functoidId;
            this.functoidInputsDraft = this.createFunctoidInputsDraft(functoid);
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
        const inlineImplementation = functoid.scriptImplementations?.find(
            (implementation: any) => implementation.type === resolvedScriptType
        );
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
            assemblyPath: this.getFunctoidParameter(functoid, 'assemblyPath')
                || externalImplementation?.assemblyPath || '',
            className: this.getFunctoidParameter(functoid, 'className')
                || externalImplementation?.className || '',
            methodName: this.getFunctoidParameter(functoid, 'methodName')
                || externalImplementation?.methodName || ''
        };

        this.renderView();
        setTimeout(() => {
            this.redrawLinks();
            this.refreshScriptingAssemblySuggestions();
        }, 0);
    }

    private closeScriptingConfig(): void {
        this.scriptingConfigDraft = null;
        this.renderView();
        setTimeout(() => this.redrawLinks(), 0);
    }

    private closeFunctoidDialog(): void {
        this.functoidPropertiesId = null;
        this.functoidInputsDraft = null;
        this.scriptingConfigDraft = null;
        this.renderView();
        setTimeout(() => this.redrawLinks(), 0);
    }

    private saveScriptingConfig(): void {
        if (!this.scriptingConfigDraft) { return; }

        const functoid = this.getCurrentPageFunctoid(this.scriptingConfigDraft.functoidId);
        if (!functoid) {
            this.closeScriptingConfig();
            return;
        }

        functoid.parameters = (functoid.parameters || [])
            .filter((parameter: any) =>
                parameter.type === ParameterType.Link || parameter.type === ParameterType.Constant
            )
            .map((parameter: any, index: number) => ({ ...parameter, index }));
        functoid.scriptType = this.scriptingConfigDraft.scriptType;
        functoid.scriptContent = this.scriptingConfigDraft.scriptType === 'externalAssembly'
            ? undefined
            : this.scriptingConfigDraft.scriptBody || '';

        if (this.scriptingConfigDraft.scriptType === 'externalAssembly') {
            functoid.scriptImplementations = [{
                type: 'externalAssembly',
                assemblyPath: this.scriptingConfigDraft.assemblyPath || '',
                className: this.scriptingConfigDraft.className || '',
                methodName: this.scriptingConfigDraft.methodName || '',
                parameterTypes: this.getSelectedAssemblyMethod()?.parameterTypes,
                returnType: this.getSelectedAssemblyMethod()?.returnType,
                isStatic: this.getSelectedAssemblyMethod()?.isStatic
            }];
        } else {
            functoid.scriptImplementations = [{
                type: this.scriptingConfigDraft.scriptType,
                content: this.scriptingConfigDraft.scriptBody || '',
                assemblyReferences: this.scriptingConfigDraft.assemblyReferences
                    .split(/\r?\n/)
                    .map(reference => reference.trim())
                    .filter((reference, index, references) =>
                        reference.length > 0 && references.indexOf(reference) === index
                    )
            }];
        }

        this.updateMap(this.state.map);
        this.closeScriptingConfig();
        this.showNotification('Scripting functoid updated', 'success');
    }

    private createScriptingConfigModal(): HTMLElement {
        const draft = this.scriptingConfigDraft!;
        const functoid = this.getCurrentPageFunctoid(draft.functoidId);
        const modal = document.createElement('div');
        modal.className = 'functoid-config-modal';
        modal.innerHTML = `
            <div class="functoid-config-panel" role="dialog" aria-modal="true" aria-label="Scripting Functoid Properties">
                <div class="config-title">Scripting Functoid Properties and Configuration</div>
                ${this.createFunctoidSummaryHtml(functoid)}
                <div class="config-section">
                    <label class="config-label">Script Type</label>
                    <div class="config-radio-group">
                        <label><input type="radio" name="scriptType" value="inlineCSharp" ${draft.scriptType === 'inlineCSharp' ? 'checked' : ''}> Inline C#</label>
                        <label><input type="radio" name="scriptType" value="inlineVbNet" ${draft.scriptType === 'inlineVbNet' ? 'checked' : ''}> Inline VB.NET</label>
                        <label><input type="radio" name="scriptType" value="inlineJScript" ${draft.scriptType === 'inlineJScript' ? 'checked' : ''}> Inline JScript</label>
                        <label><input type="radio" name="scriptType" value="inlineXslt" ${draft.scriptType === 'inlineXslt' ? 'checked' : ''}> Inline XSLT</label>
                        <label><input type="radio" name="scriptType" value="inlineXsltCallTemplate" ${draft.scriptType === 'inlineXsltCallTemplate' ? 'checked' : ''}> Inline XSLT Call Template</label>
                        <label><input type="radio" name="scriptType" value="externalAssembly" ${draft.scriptType === 'externalAssembly' ? 'checked' : ''}> External Assembly</label>
                    </div>
                </div>
                <div class="config-section config-inline-section" ${draft.scriptType === 'externalAssembly' ? 'style="display:none;"' : ''}>
                    <label class="config-label" for="config-script-body">Script</label>
                    <textarea id="config-script-body" class="config-textarea" spellcheck="false">${this.escapeHtml(draft.scriptBody)}</textarea>
                </div>
                <div class="config-section config-reference-section"
                    ${this.supportsScriptAssemblyReferences(draft.scriptType) ? '' : 'style="display:none;"'}>
                    <label class="config-label" for="config-assembly-references">Assembly References</label>
                    <textarea id="config-assembly-references" class="config-textarea" spellcheck="false"
                        placeholder="One assembly name or DLL path per line">${this.escapeHtml(draft.assemblyReferences)}</textarea>
                </div>
                <div class="config-external-section" ${draft.scriptType === 'externalAssembly' ? '' : 'style="display:none;"'}>
                    <div class="config-section">
                        <label class="config-label" for="config-assembly-path">Assembly Path</label>
                        <div class="config-row">
                            <input id="config-assembly-path" class="config-input" type="text" value="${this.escapeHtml(draft.assemblyPath)}" placeholder="C:\\path\\to\\Assembly.dll" readonly>
                            <button type="button" class="config-browse-btn" id="config-browse-assembly">Browse...</button>
                        </div>
                    </div>
                    <div class="config-section">
                        <label class="config-label" for="config-class-name">Class Name</label>
                        <select id="config-class-name" class="config-input config-select">
                            <option value="">-- Browse a DLL to load classes --</option>
                        </select>
                        <div class="config-helper" id="config-class-helper"></div>
                    </div>
                    <div class="config-section">
                        <label class="config-label" for="config-method-name">Method Name</label>
                        <select id="config-method-name" class="config-input config-select">
                            <option value="">-- Select a class first --</option>
                        </select>
                        <div class="config-helper" id="config-method-helper"></div>
                    </div>
                </div>
                <div class="config-actions">
                    <button type="button" class="config-btn config-btn-cancel" id="config-cancel">Cancel</button>
                    <button type="button" class="config-btn config-btn-primary" id="config-save">Save</button>
                </div>
            </div>
        `;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeScriptingConfig();
            }
        });

        const inlineSection = modal.querySelector('.config-inline-section') as HTMLElement;
        const externalSection = modal.querySelector('.config-external-section') as HTMLElement;
        const scriptBodyInput = modal.querySelector('#config-script-body') as HTMLTextAreaElement | null;
        const assemblyReferencesInput = modal.querySelector('#config-assembly-references') as HTMLTextAreaElement | null;
        const referenceSection = modal.querySelector('.config-reference-section') as HTMLElement;
        const assemblyPathInput = modal.querySelector('#config-assembly-path') as HTMLInputElement | null;
        const classNameSelect = modal.querySelector('#config-class-name') as HTMLSelectElement | null;
        const methodNameSelect = modal.querySelector('#config-method-name') as HTMLSelectElement | null;

        modal.querySelectorAll('input[name="scriptType"]').forEach((radio) => {
            radio.addEventListener('change', (e) => {
                if (!this.scriptingConfigDraft) { return; }
                this.scriptingConfigDraft.scriptType = (e.target as HTMLInputElement).value as ScriptingConfigType;
                inlineSection.style.display = this.scriptingConfigDraft.scriptType === 'externalAssembly' ? 'none' : '';
                externalSection.style.display = this.scriptingConfigDraft.scriptType === 'externalAssembly' ? '' : 'none';
                referenceSection.style.display = this.supportsScriptAssemblyReferences(
                    this.scriptingConfigDraft.scriptType
                ) ? '' : 'none';
            });
        });

        scriptBodyInput?.addEventListener('input', () => {
            if (this.scriptingConfigDraft) {
                this.scriptingConfigDraft.scriptBody = scriptBodyInput.value;
            }
        });
        assemblyReferencesInput?.addEventListener('input', () => {
            if (this.scriptingConfigDraft) {
                this.scriptingConfigDraft.assemblyReferences = assemblyReferencesInput.value;
            }
        });

        classNameSelect?.addEventListener('change', () => {
            if (this.scriptingConfigDraft) {
                this.scriptingConfigDraft.className = classNameSelect.value;
                // Reset method when class changes
                this.scriptingConfigDraft.methodName = '';
                this.refreshScriptingAssemblySuggestions(modal);
                // Auto-select first method of the new class
                const selectedClass = this.scriptingConfigDraft.assemblyClasses?.find(c => c.className === classNameSelect.value);
                if (selectedClass && selectedClass.methods.length > 0) {
                    this.scriptingConfigDraft.methodName = selectedClass.methods[0].name;
                    if (methodNameSelect) { methodNameSelect.value = selectedClass.methods[0].name; }
                }
            }
        });

        methodNameSelect?.addEventListener('change', () => {
            if (this.scriptingConfigDraft) {
                this.scriptingConfigDraft.methodName = methodNameSelect.value;
            }
        });

        modal.querySelector('#config-browse-assembly')?.addEventListener('click', () => this.vscode.postMessage({ type: 'browseAssembly' }));
        modal.querySelector('#config-cancel')?.addEventListener('click', () => this.closeScriptingConfig());
        modal.querySelector('#config-save')?.addEventListener('click', () => this.saveScriptingConfig());

        this.refreshScriptingAssemblySuggestions(modal);
        return modal;
    }

    private supportsScriptAssemblyReferences(scriptType: ScriptingConfigType): boolean {
        return scriptType === 'inlineCSharp'
            || scriptType === 'inlineVbNet'
            || scriptType === 'inlineJScript';
    }

    private getSelectedAssemblyMethod(): AssemblyMethodInfo | undefined {
        const draft = this.scriptingConfigDraft;
        if (!draft) { return undefined; }
        return draft.assemblyClasses
            ?.find(item => item.className === draft.className)
            ?.methods.find(method => method.name === draft.methodName);
    }

    private createFunctoidPropertiesModal(): HTMLElement {
        const functoid = this.getCurrentPageFunctoid(this.functoidPropertiesId!);
        const inputs = this.functoidInputsDraft || [];
        const modal = document.createElement('div');
        modal.className = 'functoid-config-modal';
        modal.innerHTML = `
            <div class="functoid-config-panel functoid-properties-panel" role="dialog" aria-modal="true" aria-label="Functoid Properties">
                <div class="config-title">Functoid Properties</div>
                ${this.createFunctoidSummaryHtml(functoid, false)}
                <div class="functoid-property-section">
                    <div class="functoid-property-heading">Inputs</div>
                    <div class="functoid-property-requirement">Inputs are evaluated from top to bottom.</div>
                    <ol class="functoid-input-editor">
                        ${inputs.length === 0
                            ? '<li class="functoid-property-empty">No inputs configured</li>'
                            : inputs.map((input, index) => this.createFunctoidInputEditorHtml(input, index)).join('')}
                    </ol>
                </div>
                <div class="config-actions">
                    <button type="button" class="config-btn config-btn-cancel" id="properties-cancel">Cancel</button>
                    <button type="button" class="config-btn config-btn-primary" id="properties-save">Save</button>
                </div>
            </div>
        `;
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.closeFunctoidDialog();
            }
        });
        modal.querySelectorAll<HTMLInputElement>('.functoid-default-input').forEach(input => {
            input.addEventListener('input', () => {
                const index = Number(input.dataset.index);
                if (this.functoidInputsDraft?.[index]) {
                    const draft = this.functoidInputsDraft[index];
                    if (draft.type === ParameterType.Constant) {
                        draft.value = input.value;
                    } else {
                        draft.defaultValue = input.value;
                    }
                }
            });
        });
        modal.querySelectorAll<HTMLButtonElement>('[data-input-action]').forEach(button => {
            button.addEventListener('click', () => {
                const index = Number(button.dataset.index);
                const action = button.dataset.inputAction;
                if (!this.functoidInputsDraft || !Number.isInteger(index)) { return; }
                if (action === 'up' && index > 0) {
                    [this.functoidInputsDraft[index - 1], this.functoidInputsDraft[index]] =
                        [this.functoidInputsDraft[index], this.functoidInputsDraft[index - 1]];
                } else if (action === 'down' && index < this.functoidInputsDraft.length - 1) {
                    [this.functoidInputsDraft[index], this.functoidInputsDraft[index + 1]] =
                        [this.functoidInputsDraft[index + 1], this.functoidInputsDraft[index]];
                } else if (action === 'remove' && this.functoidInputsDraft[index].type === ParameterType.Constant) {
                    this.functoidInputsDraft.splice(index, 1);
                } else {
                    return;
                }
                this.renderView();
                setTimeout(() => this.redrawLinks(), 0);
            });
        });
        modal.querySelector('#properties-cancel')?.addEventListener('click', () => this.closeFunctoidDialog());
        modal.querySelector('#properties-save')?.addEventListener('click', () => this.saveFunctoidProperties());
        return modal;
    }

    private createFunctoidInputEditorHtml(
        input: FunctoidInputDraft,
        index: number
    ): string {
        const isDefault = input.type === ParameterType.Constant;
        const page = this.state.map?.pages?.[this.state.activePage];
        const link = isDefault ? undefined : page?.links?.find((item: any) => item.id === input.linkId);
        const source = isDefault
            ? '<span class="functoid-input-source">Default value</span>'
            : `<span class="functoid-input-source">${this.escapeHtml(link ? this.describeLinkSource(link) : `Missing link: ${input.linkId || ''}`)}</span>`;
        const defaultValue = isDefault ? input.value : input.defaultValue || '';
        const content = `
            ${source}
            <label class="functoid-default-label">
                Default value
                <input class="config-input functoid-default-input" data-index="${index}" type="text"
                    value="${this.escapeHtml(defaultValue)}" aria-label="Default value for input ${index + 1}">
            </label>`;
        return `
            <li class="functoid-input-row">
                <span class="property-port">Input ${index + 1}</span>
                <div class="functoid-input-content">${content}</div>
                <div class="functoid-input-actions">
                    <button type="button" data-input-action="up" data-index="${index}" title="Move input up"
                        ${index === 0 ? 'disabled' : ''}>↑</button>
                    <button type="button" data-input-action="down" data-index="${index}" title="Move input down"
                        ${index === (this.functoidInputsDraft?.length || 0) - 1 ? 'disabled' : ''}>↓</button>
                    ${isDefault ? `<button type="button" data-input-action="remove" data-index="${index}" title="Remove default input">×</button>` : ''}
                </div>
            </li>`;
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
            if (!Number.isInteger(index) || index < 0) { continue; }
            if (parameter.type === ParameterType.Constant) {
                inputs[index] = {
                    type: ParameterType.Constant,
                    value: String(parameter.value ?? ''),
                    guid: parameter.guid,
                    defaultValue: parameter.defaultValue
                };
            } else if (parameter.type === ParameterType.Link && linksById.has(String(parameter.value))) {
                const linkId = String(parameter.value);
                inputs[index] = {
                    type: ParameterType.Link,
                    linkId,
                    value: linkId,
                    guid: parameter.guid,
                    defaultValue: parameter.defaultValue
                };
                usedLinks.add(linkId);
            }
        }

        for (const link of this.orderFunctoidInputLinks(functoid, incomingLinks)) {
            if (!usedLinks.has(link.id)) {
                const emptyIndex = inputs.findIndex(input => input === undefined);
                inputs[emptyIndex >= 0 ? emptyIndex : inputs.length] = {
                    type: ParameterType.Link,
                    linkId: link.id,
                    value: link.id
                };
            }
        }
        return Array.from(
            { length: inputs.length },
            (_, index) => inputs[index] || { type: ParameterType.Constant, value: '' }
        );
    }

    private saveFunctoidProperties(): void {
        const functoid = this.getCurrentPageFunctoid(this.functoidPropertiesId!);
        if (!functoid || !this.functoidInputsDraft) {
            this.closeFunctoidDialog();
            return;
        }
        const nonInputParameters = (functoid.parameters || []).filter(
            (parameter: any) =>
                parameter.type !== ParameterType.Link && parameter.type !== ParameterType.Constant
        );
        functoid.parameters = [
            ...this.functoidInputsDraft.map((input, index) => ({
                index,
                type: input.type,
                value: input.type === ParameterType.Link ? input.linkId || '' : input.value,
                ...(input.guid ? { guid: input.guid } : {}),
                ...(input.type === ParameterType.Link && input.defaultValue !== undefined
                    ? { defaultValue: input.defaultValue }
                    : {})
            })),
            ...nonInputParameters
        ];
        functoid.inputLinks = this.functoidInputsDraft
            .filter(input => input.type === ParameterType.Link && input.linkId)
            .map(input => input.linkId!);
        this.updateMap(this.state.map);
        this.closeFunctoidDialog();
        this.showNotification('Functoid inputs updated', 'success');
    }

    private createFunctoidSummaryHtml(functoid: any, includeInputs = true): string {
        if (!functoid) {
            return '<div class="functoid-property-empty">The functoid is no longer available.</div>';
        }
        const definition = this.state.functoids.find(
            item => item.id === functoid.functoidId
        );
        const page = this.state.map?.pages?.[this.state.activePage];
        const inputLinks = this.orderFunctoidInputLinks(
            functoid,
            (page?.links || []).filter(
                (link: any) => link.targetType === 'functoid' && link.targetId === functoid.id
            )
        );
        const constants = (functoid.parameters || []).filter(
            (parameter: any) => parameter.type === 'constant'
        );
        const outputLinks = (page?.links || []).filter(
            (link: any) => link.sourceType === 'functoid' && link.sourceId === functoid.id
        );
        const inputItems = [
            ...inputLinks.map((link: any, index: number) =>
                `<li><span class="property-port">Input ${index + 1}</span><span>${this.escapeHtml(this.describeLinkSource(link))}</span></li>`
            ),
            ...constants.map((parameter: any) =>
                `<li><span class="property-port">Input ${Number(parameter.index) + 1}</span><span>Constant: <code>${this.escapeHtml(String(parameter.value ?? ''))}</code></span></li>`
            )
        ];
        const outputItems = outputLinks.map((link: any) =>
            `<li><span class="property-port">Output</span><span>${this.escapeHtml(this.describeLinkTarget(link))}</span></li>`
        );
        const minInputs = definition?.minInputs ?? 0;
        const maxInputs = definition?.maxInputs ?? minInputs;
        const expectedInputs = maxInputs >= 100
            ? `${minInputs} or more`
            : minInputs === maxInputs
                ? `${minInputs}`
                : `${minInputs} to ${maxInputs}`;
        const description = definition?.description || definition?.tooltip ||
            'No functionality description is available for this functoid.';

        return `
            <div class="functoid-property-header">
                <div>
                    <div class="functoid-property-name">${this.escapeHtml(functoid.name || definition?.name || 'Functoid')}</div>
                    <div class="functoid-property-meta">${this.escapeHtml(definition?.category || functoid.category || 'Custom')} · FID ${this.escapeHtml(String(functoid.functoidId))}</div>
                </div>
            </div>
            <div class="functoid-property-section">
                <div class="functoid-property-heading">Functionality</div>
                <div class="functoid-property-description">${this.escapeHtml(description)}</div>
            </div>
            <div class="functoid-property-grid${includeInputs ? '' : ' output-only'}">
                ${includeInputs ? `
                <div class="functoid-property-section">
                    <div class="functoid-property-heading">Inputs</div>
                    <div class="functoid-property-requirement">Expected: ${expectedInputs}; configured: ${inputItems.length}</div>
                    <ul class="functoid-property-list">${inputItems.length > 0 ? inputItems.join('') : '<li class="functoid-property-empty">No inputs connected</li>'}</ul>
                </div>` : ''}
                <div class="functoid-property-section">
                    <div class="functoid-property-heading">Output</div>
                    <div class="functoid-property-requirement">${definition?.hasOutput === false ? 'This functoid has no output.' : `${outputLinks.length} connection${outputLinks.length === 1 ? '' : 's'}`}</div>
                    <ul class="functoid-property-list">${outputItems.length > 0 ? outputItems.join('') : '<li class="functoid-property-empty">Output is not connected</li>'}</ul>
                </div>
            </div>
        `;
    }

    private orderFunctoidInputLinks(functoid: any, links: any[]): any[] {
        if (!Array.isArray(functoid.inputLinks) || functoid.inputLinks.length === 0) {
            return links;
        }
        const order = new Map<string, number>(
            functoid.inputLinks.map((linkId: string, index: number) => [linkId, index])
        );
        return [...links].sort(
            (left, right) => (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
                (order.get(right.id) ?? Number.MAX_SAFE_INTEGER)
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

    private refreshScriptingAssemblySuggestions(root: ParentNode = this.container): void {
        if (!this.scriptingConfigDraft) { return; }

        const classes = this.scriptingConfigDraft.assemblyClasses || [];
        const selectedClass = classes.find(c => c.className === this.scriptingConfigDraft!.className);
        const methods = selectedClass?.methods || [];

        // Populate class dropdown
        const classSelect = root.querySelector('#config-class-name') as HTMLSelectElement | null;
        if (classSelect) {
            classSelect.innerHTML = classes.length === 0
                ? (this.scriptingConfigDraft.className
                    ? `<option value="${this.escapeHtml(this.scriptingConfigDraft.className)}">${this.escapeHtml(this.scriptingConfigDraft.className)}</option>`
                    : '<option value="">-- Browse a DLL to load classes --</option>')
                : classes.map(c =>
                    `<option value="${this.escapeHtml(c.className)}" ${c.className === this.scriptingConfigDraft!.className ? 'selected' : ''}>${this.escapeHtml(c.className)}</option>`
                ).join('');
            classSelect.value = this.scriptingConfigDraft.className || '';
        }

        // Populate method dropdown
        const methodSelect = root.querySelector('#config-method-name') as HTMLSelectElement | null;
        if (methodSelect) {
            methodSelect.innerHTML = methods.length === 0
                ? (this.scriptingConfigDraft.methodName
                    ? `<option value="${this.escapeHtml(this.scriptingConfigDraft.methodName)}">${this.escapeHtml(this.scriptingConfigDraft.methodName)}</option>`
                    : '<option value="">-- Select a class first --</option>')
                : methods.map(m =>
                    `<option value="${this.escapeHtml(m.name)}" ${m.name === this.scriptingConfigDraft!.methodName ? 'selected' : ''}>${this.escapeHtml(m.signature)} : ${this.escapeHtml(m.returnType)}</option>`
                ).join('');
            methodSelect.value = this.scriptingConfigDraft.methodName || '';
        }

        // Update helper text
        const classHelper = root.querySelector('#config-class-helper') as HTMLElement | null;
        if (classHelper) {
            classHelper.textContent = classes.length > 0
                ? `${classes.length} class${classes.length !== 1 ? 'es' : ''} found in assembly`
                : (this.scriptingConfigDraft.className
                    ? 'Configured class from the map. Browse the DLL to refresh available classes.'
                    : 'Browse a .NET DLL to load available classes.');
        }

        const methodHelper = root.querySelector('#config-method-helper') as HTMLElement | null;
        if (methodHelper) {
            methodHelper.textContent = methods.length > 0
                ? `${methods.length} method${methods.length !== 1 ? 's' : ''} available`
                : (this.scriptingConfigDraft.methodName ? 'Configured method from the map.' : '');
        }
    }

    private getCurrentPageFunctoid(functoidId: string): any | undefined {
        const page = this.state.map?.pages?.[this.state.activePage];
        return page?.functoids?.find((fn: any) => fn.id === functoidId);
    }

    private getFunctoidParameter(functoid: any, type: string): string {
        return functoid.parameters?.find((param: any) => param.type === type)?.value || '';
    }

    private escapeHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    private bottomPanelActiveTab: 'instance' | 'output' = 'instance';
    private bottomPanelCollapsed = true;

    private createBottomPanel(): HTMLElement {
        const panel = document.createElement('div');
        panel.className = `bottom-panel${this.bottomPanelCollapsed ? ' collapsed' : ''}`;
        const hasMap = !!this.state.map;

        panel.innerHTML = `
            <div class="bottom-panel-header">
                <div class="bottom-panel-tabs">
                    <button class="bottom-tab${this.bottomPanelActiveTab === 'instance' ? ' active' : ''}" data-tab="instance">📝 Input Instance</button>
                    <button class="bottom-tab${this.bottomPanelActiveTab === 'output' ? ' active' : ''}" data-tab="output">📤 Test Output</button>
                </div>
                <div class="bottom-panel-actions">
                    <button class="toolbar-btn small" id="btn-gen-instance" ${!hasMap ? 'disabled' : ''}>Generate Instance</button>
                    <button class="toolbar-btn small primary" id="btn-run-test" ${!hasMap ? 'disabled' : ''}>▶ Test Map</button>
                    <button class="toolbar-btn small" id="btn-toggle-panel">${this.bottomPanelCollapsed ? '▲' : '▼'}</button>
                </div>
            </div>
            <div class="bottom-panel-body">
                <div class="bottom-tab-content${this.bottomPanelActiveTab === 'instance' ? ' active' : ''}" data-content="instance">
                    <textarea id="instance-xml" class="xml-editor" placeholder="Paste source XML here or click 'Generate Instance' to auto-generate, then click 'Test Map'..." spellcheck="false"></textarea>
                </div>
                <div class="bottom-tab-content${this.bottomPanelActiveTab === 'output' ? ' active' : ''}" data-content="output">
                    <pre id="test-output" class="xml-output"></pre>
                </div>
            </div>
        `;

        // Tab switching
        panel.querySelectorAll('.bottom-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.bottomPanelActiveTab = (e.target as HTMLElement).dataset.tab as 'instance' | 'output';
                this.bottomPanelCollapsed = false;
                this.refreshBottomPanel(panel);
            });
        });

        // Toggle collapse
        panel.querySelector('#btn-toggle-panel')?.addEventListener('click', () => {
            this.bottomPanelCollapsed = !this.bottomPanelCollapsed;
            this.refreshBottomPanel(panel);
        });

        // Generate Instance only (for manual use from bottom panel)
        panel.querySelector('#btn-gen-instance')?.addEventListener('click', () => {
            this.bottomPanelCollapsed = false;
            this.bottomPanelActiveTab = 'instance';
            this.refreshBottomPanel(panel);
            this.vscode.postMessage({ type: 'generateInstance', side: 'source' });
        });

        // Run Test Map from bottom panel
        panel.querySelector('#btn-run-test')?.addEventListener('click', () => {
            this.runTestMap();
        });

        return panel;
    }

    private refreshBottomPanel(panel: HTMLElement): void {
        panel.className = `bottom-panel${this.bottomPanelCollapsed ? ' collapsed' : ''}`;
        panel.querySelectorAll('.bottom-tab').forEach(tab => {
            tab.classList.toggle('active', (tab as HTMLElement).dataset.tab === this.bottomPanelActiveTab);
        });
        panel.querySelectorAll('.bottom-tab-content').forEach(content => {
            content.classList.toggle('active', (content as HTMLElement).dataset.content === this.bottomPanelActiveTab);
        });
        const toggleBtn = panel.querySelector('#btn-toggle-panel');
        if (toggleBtn) { toggleBtn.textContent = this.bottomPanelCollapsed ? '▲' : '▼'; }
    }

    private showInstanceResult(data: any): void {
        this.bottomPanelCollapsed = false;
        this.bottomPanelActiveTab = 'instance';
        const panel = this.container.querySelector('.bottom-panel') as HTMLElement;
        if (panel) { this.refreshBottomPanel(panel); }

        const textarea = this.container.querySelector('#instance-xml') as HTMLTextAreaElement;
        if (textarea) {
            textarea.value = data.xml || data.error || '';
        }

        // If Test Map triggered the generation, auto-run the transform now
        if (this.pendingTestAfterGenerate && data.xml && this.state.map) {
            this.pendingTestAfterGenerate = false;
            this.bottomPanelActiveTab = 'output';
            if (panel) { this.refreshBottomPanel(panel); }
            this.vscode.postMessage({ type: 'testMapWithInput', data: { inputXml: data.xml, map: this.state.map } });
        } else {
            this.pendingTestAfterGenerate = false;
        }
    }

    private showTestMapResult(data: any): void {
        this.bottomPanelCollapsed = false;
        this.bottomPanelActiveTab = 'output';
        const panel = this.container.querySelector('.bottom-panel') as HTMLElement;
        if (panel) { this.refreshBottomPanel(panel); }

        const output = this.container.querySelector('#test-output') as HTMLPreElement;
        if (output) {
            if (data.error) {
                output.textContent = `Error: ${data.error}`;
                output.className = 'xml-output error';
            } else {
                output.textContent = data.output || data.xslt || '';
                output.className = 'xml-output';
            }
        }
    }

}
