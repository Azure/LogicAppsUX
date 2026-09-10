import React, { useState } from 'react';
import { createRoot, Root } from 'react-dom/client';

export interface SchemaNodeView {
    name: string;
    path: string;
    type?: string;
    dataType?: string;
    dataTypeNamespace?: string;
    namespace?: string;
    nillable?: boolean;
    defaultValue?: string;
    fixedValue?: string;
    baseType?: string;
    minOccurs?: number;
    isOptional?: boolean;
    maxOccurs?: number | 'unbounded';
    annotation?: string;
    restrictions?: {
        baseType?: string;
        minLength?: number;
        maxLength?: number;
        length?: number;
        pattern?: string;
        enumeration?: string[];
        minInclusive?: number;
        maxInclusive?: number;
        minExclusive?: number;
        maxExclusive?: number;
        totalDigits?: number;
        fractionDigits?: number;
        whiteSpace?: string;
        listItemType?: string;
        unionMemberTypes?: string[];
    };
    children?: SchemaNodeView[];
    attributes?: Array<{
        name: string;
        type?: string;
        required?: boolean;
        defaultValue?: string;
        fixedValue?: string;
        namespace?: string;
    }>;
}

interface SchemaView {
    filePath?: string;
    rootElement?: SchemaNodeView;
}

type SchemaSide = 'source' | 'target';

interface SchemaTreeViewProps {
    schema: SchemaView;
    side: SchemaSide;
    initialExpanded: Set<string>;
    onNodeClick(nodePath: string): void;
    onNodeDoubleClick?(node: SchemaNodeView): void;
    onDragLink?(sourcePath: string, targetPath: string): void;
}

function collectAllPaths(node: SchemaNodeView | undefined, paths: Set<string>): void {
    if (!node) {
        return;
    }
    paths.add(node.path);
    for (const child of node.children || []) {
        collectAllPaths(child, paths);
    }
}

function SchemaTreeView({
    schema,
    side,
    initialExpanded,
    onNodeClick,
    onNodeDoubleClick,
    onDragLink
}: SchemaTreeViewProps): React.ReactElement {
    const [expandedPaths, setExpandedPaths] = useState(() => new Set(initialExpanded));

    const toggleNode = (event: React.MouseEvent, path: string): void => {
        event.stopPropagation();
        setExpandedPaths(current => {
            const next = new Set(current);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const renderNode = (node: SchemaNodeView, depth: number): React.ReactNode => {
        const children = node.children || [];
        const hasChildren = children.length > 0;
        const isExpanded = expandedPaths.has(node.path);
        const isAttribute = node.type === 'attribute' || node.name.startsWith('@');
        const isRepeating = node.maxOccurs === 'unbounded'
            || (typeof node.maxOccurs === 'number' && node.maxOccurs > 1);

        const connector = (
            <span
                className="node-connector"
                data-path={node.path}
                data-side={side}
                title="Click to create/complete link"
                draggable
                onClick={event => {
                    event.stopPropagation();
                    const element = event.currentTarget;
                    element.classList.add('active');
                    window.setTimeout(() => element.classList.remove('active'), 3000);
                    onNodeClick(node.path);
                }}
                onDragStart={event => {
                    event.stopPropagation();
                    event.dataTransfer.setData('link-endpoint', JSON.stringify({ side, path: node.path }));
                    event.dataTransfer.effectAllowed = 'link';
                    event.currentTarget.classList.add('active');
                }}
                onDragEnd={event => event.currentTarget.classList.remove('active')}
                onDragOver={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    event.dataTransfer.dropEffect = 'link';
                    event.currentTarget.classList.add('active');
                }}
                onDragLeave={event => event.currentTarget.classList.remove('active')}
                onDrop={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    event.currentTarget.classList.remove('active');
                    const data = event.dataTransfer.getData('link-endpoint');
                    if (!data || !onDragLink) {
                        return;
                    }
                    try {
                        const endpoint = JSON.parse(data) as { side?: SchemaSide; path?: string };
                        if (!endpoint.path || endpoint.side === side) {
                            return;
                        }
                        if (endpoint.side === 'source') {
                            onDragLink(endpoint.path, node.path);
                        } else {
                            onDragLink(node.path, endpoint.path);
                        }
                    } catch {
                        return;
                    }
                }}
            >
                ●
            </span>
        );

        const descendants = hasChildren && isExpanded
            ? [
                ...(node.attributes || []).map(attribute => ({
                    name: `@${attribute.name}`,
                    path: `${node.path}/@${attribute.name}`,
                    type: 'attribute',
                    dataType: attribute.type,
                    namespace: attribute.namespace,
                    defaultValue: attribute.defaultValue,
                    fixedValue: attribute.fixedValue,
                    children: [],
                    attributes: [],
                    minOccurs: attribute.required ? 1 : 0,
                    maxOccurs: 1,
                    isOptional: !attribute.required
                })),
                ...children
            ]
            : [];

        return (
            <React.Fragment key={node.path}>
                <div
                    className="tree-node"
                    data-path={node.path}
                    data-side={side}
                    title="Double-click to view node properties"
                    onDoubleClick={event => {
                        event.stopPropagation();
                        onNodeDoubleClick?.(node);
                    }}
                >
                    {side === 'target' && connector}
                    <span className="tree-indent" style={{ width: `${depth * 16}px` }} />
                    <span
                        className={`tree-icon ${hasChildren ? 'expandable' : 'leaf'}`}
                        onClick={hasChildren ? event => toggleNode(event, node.path) : undefined}
                    >
                        {hasChildren ? (isExpanded ? '▼' : '▶') : (isAttribute ? '@' : '•')}
                    </span>
                    <span className="node-type-icon">
                        {isAttribute ? '🏷' : (hasChildren ? '📁' : '📄')}
                    </span>
                    <span className="node-name">{node.name}</span>
                    {node.dataType && (
                        <span className="node-data-type">{node.dataType.replace(/^(xs|xsd):/, '')}</span>
                    )}
                    {node.isOptional && <span className="node-badge optional" title="Optional">?</span>}
                    {isRepeating && <span className="node-badge repeating" title="Repeating">∞</span>}
                    {side === 'source' && connector}
                </div>
                {descendants.map(child => renderNode(child, depth + 1))}
            </React.Fragment>
        );
    };

    const filePath = schema.filePath || '';
    return (
        <>
            <div className="schema-header">
                <div className="schema-header-row">
                    <span className="schema-title">
                        {side === 'source' ? '← Source Schema' : 'Target Schema →'}
                    </span>
                    <button
                        className="schema-btn"
                        title="Expand All"
                        onClick={() => {
                            const paths = new Set<string>();
                            collectAllPaths(schema.rootElement, paths);
                            setExpandedPaths(paths);
                        }}
                    >
                        ⊞
                    </button>
                    <button
                        className="schema-btn"
                        title="Collapse All"
                        onClick={() => {
                            const paths = new Set<string>();
                            if (schema.rootElement) {
                                paths.add(schema.rootElement.path);
                            }
                            setExpandedPaths(paths);
                        }}
                    >
                        ⊟
                    </button>
                </div>
                <span className="schema-path" title={filePath}>
                    {filePath.split(/[/\\]/).pop() || filePath}
                </span>
            </div>
            <div className="schema-tree">
                {schema.rootElement && renderNode(schema.rootElement, 0)}
            </div>
        </>
    );
}

export class SchemaTreeRenderer extends HTMLElement {
    private reactRoot: Root | null = null;
    private schema: SchemaView = {};
    private side: SchemaSide = 'source';
    private onNodeClick: (nodePath: string) => void = () => {};
    private onNodeDoubleClick?: (node: SchemaNodeView) => void;
    private onDragLink?: (sourcePath: string, targetPath: string) => void;
    private initialExpanded = new Set<string>();
    private renderVersion = 0;

    public configure(
        schema: SchemaView,
        side: SchemaSide,
        onNodeClick: (nodePath: string) => void,
        initialExpanded?: Set<string>,
        onDragLink?: (sourcePath: string, targetPath: string) => void,
        onNodeDoubleClick?: (node: SchemaNodeView) => void
    ): void {
        this.schema = schema;
        this.side = side;
        this.onNodeClick = onNodeClick;
        this.onDragLink = onDragLink;
        this.onNodeDoubleClick = onNodeDoubleClick;
        this.initialExpanded = initialExpanded ? new Set(initialExpanded) : new Set();
        if (schema.rootElement) {
            this.initialExpanded.add(schema.rootElement.path);
            for (const child of schema.rootElement.children || []) {
                this.initialExpanded.add(child.path);
            }
        }
        this.renderVersion++;
        this.renderReact();
    }

    public connectedCallback(): void {
        this.renderReact();
    }

    public disconnectedCallback(): void {
        this.reactRoot?.unmount();
        this.reactRoot = null;
    }

    public getNodePosition(path: string): { x: number; y: number } | null {
        const node = Array.from(this.querySelectorAll<HTMLElement>('.tree-node[data-path]'))
            .find(element => element.dataset.path === path);
        const connector = node?.querySelector<HTMLElement>('.node-connector');
        const mappingArea = this.closest('.mapping-area');
        if (!connector || !mappingArea) {
            return null;
        }

        const connectorRect = connector.getBoundingClientRect();
        const areaRect = mappingArea.getBoundingClientRect();
        return {
            x: connectorRect.left - areaRect.left + connectorRect.width / 2,
            y: connectorRect.top - areaRect.top + connectorRect.height / 2
        };
    }

    private renderReact(): void {
        if (!this.isConnected) {
            return;
        }
        this.reactRoot ??= createRoot(this);
        this.reactRoot.render(
            <SchemaTreeView
                key={this.renderVersion}
                schema={this.schema}
                side={this.side}
                initialExpanded={this.initialExpanded}
                onNodeClick={this.onNodeClick}
                onNodeDoubleClick={this.onNodeDoubleClick}
                onDragLink={this.onDragLink}
            />
        );
    }
}

customElements.define('biztalk-schema-tree', SchemaTreeRenderer);

declare global {
    interface HTMLElementTagNameMap {
        'biztalk-schema-tree': SchemaTreeRenderer;
    }
}
