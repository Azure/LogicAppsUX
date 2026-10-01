import { Button, FluentProvider } from '@fluentui/react-components';
import { ChevronDoubleDown16Regular, ChevronDoubleUp16Regular, Edit16Regular, Tag16Regular } from '@fluentui/react-icons';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getVsCodeFluentTheme } from '../fluentTheme';

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
  onNodePointerUp(nodePath: string): void;
  onLinkPointerDown(clientX: number, clientY: number): void;
  onNodeDoubleClick?(node: SchemaNodeView): void;
  onExpansionChange(): void;
  onReload(): void;
}

function collectExpandablePaths(node: SchemaNodeView | undefined, paths: Set<string>): void {
  if (!node) {
    return;
  }
  if ((node.children?.length ?? 0) > 0 || (node.attributes?.length ?? 0) > 0) {
    paths.add(node.path);
  }
  for (const child of node.children || []) {
    collectExpandablePaths(child, paths);
  }
}

function SchemaTreeView({
  schema,
  side,
  initialExpanded,
  onNodeClick,
  onNodePointerUp,
  onLinkPointerDown,
  onNodeDoubleClick,
  onExpansionChange,
  onReload,
}: SchemaTreeViewProps): React.ReactElement {
  const [expandedPaths, setExpandedPaths] = useState(() => new Set(initialExpanded));
  const pointerStartedPath = useRef<string | null>(null);
  const expandablePaths = new Set<string>();
  collectExpandablePaths(schema.rootElement, expandablePaths);
  const isFullyExpanded = Array.from(expandablePaths).every((path) => expandedPaths.has(path));

  useLayoutEffect(() => {
    onExpansionChange();
  }, [expandedPaths, onExpansionChange]);

  const toggleNode = (event: React.MouseEvent, path: string): void => {
    event.stopPropagation();
    setExpandedPaths((current) => {
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
    const hasChildren = children.length > 0 || (node.attributes?.length ?? 0) > 0;
    const isExpanded = expandedPaths.has(node.path);
    const isAttribute = node.type === 'attribute' || node.name.startsWith('@');
    const isRepeating = node.maxOccurs === 'unbounded' || (typeof node.maxOccurs === 'number' && node.maxOccurs > 1);

    const connector = (
      <span
        className="node-connector"
        data-path={node.path}
        data-side={side}
        title="Click or drag to create/complete link"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          pointerStartedPath.current = node.path;
          const element = event.currentTarget;
          const rect = element.getBoundingClientRect();
          onLinkPointerDown(rect.left + rect.width / 2, rect.top + rect.height / 2);
          element.classList.add('active');
          window.setTimeout(() => element.classList.remove('active'), 3000);
          onNodeClick(node.path);
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.classList.remove('active');
          onNodePointerUp(node.path);
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (pointerStartedPath.current === node.path) {
            pointerStartedPath.current = null;
            return;
          }
          onNodeClick(node.path);
        }}
        aria-label={`Connect ${node.name}`}
      />
    );

    const descendants =
      hasChildren && isExpanded
        ? [
            ...(node.attributes || []).map((attribute) => ({
              name: attribute.name,
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
              isOptional: !attribute.required,
            })),
            ...children,
          ]
        : [];

    return (
      <React.Fragment key={node.path}>
        <div
          className="tree-node"
          data-path={node.path}
          data-side={side}
          title="Double-click to view node properties"
          onDoubleClick={(event) => {
            event.stopPropagation();
            onNodeDoubleClick?.(node);
          }}
        >
          <span className="tree-indent" style={{ width: `${depth * 16}px` }} />
          {!isAttribute && (
            <span
              className={`tree-icon ${hasChildren ? 'expandable' : 'leaf'}`}
              onClick={hasChildren ? (event) => toggleNode(event, node.path) : undefined}
            >
              {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
            </span>
          )}
          <span className={`node-type-icon${isAttribute ? ' attribute-icon' : ''}`} title={isAttribute ? 'Attribute' : undefined}>
            {isAttribute ? <Tag16Regular /> : hasChildren ? '📁' : '📄'}
          </span>
          <span className="node-name">{node.name}</span>
          {!node.isOptional && (
            <span className="node-badge required" title="Required">
              *
            </span>
          )}
          {node.dataType && <span className="node-data-type">{node.dataType.replace(/^(xs|xsd):/, '')}</span>}
          {isRepeating && (
            <span className="node-badge repeating" title="Repeating">
              ∞
            </span>
          )}
          {connector}
        </div>
        {descendants.map((child) => renderNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  const filePath = schema.filePath || '';
  return (
    <FluentProvider theme={getVsCodeFluentTheme()} style={{ display: 'contents' }}>
      <div className="schema-header">
        <div className="schema-header-row">
          <span className="schema-title">{side === 'source' ? 'Source Schema' : 'Target Schema'}</span>
          <div className="schema-actions">
            <Button
              appearance="subtle"
              aria-label={`Edit ${side} schema`}
              className="schema-btn schema-edit-btn"
              icon={<Edit16Regular />}
              size="small"
              title={`Edit ${side === 'source' ? 'Source' : 'Target'} Schema`}
              onClick={onReload}
            />
            <Button
              appearance="subtle"
              aria-label={`${isFullyExpanded ? 'Collapse' : 'Expand'} all schema nodes`}
              className="schema-btn schema-expand-collapse-btn"
              icon={isFullyExpanded ? <ChevronDoubleUp16Regular /> : <ChevronDoubleDown16Regular />}
              size="small"
              title={isFullyExpanded ? 'Collapse All' : 'Expand All'}
              onClick={() => {
                if (isFullyExpanded) {
                  const paths = new Set<string>();
                  if (schema.rootElement) {
                    paths.add(schema.rootElement.path);
                  }
                  setExpandedPaths(paths);
                } else {
                  setExpandedPaths(expandablePaths);
                }
              }}
            />
          </div>
        </div>
        <span className="schema-path" title={filePath}>
          {filePath.split(/[/\\]/).pop() || filePath}
        </span>
      </div>
      <div className="schema-tree">{schema.rootElement && renderNode(schema.rootElement, 0)}</div>
    </FluentProvider>
  );
}

export class SchemaTreeRenderer extends HTMLElement {
  private reactRoot: Root | null = null;
  private schema: SchemaView = {};
  private side: SchemaSide = 'source';
  private onNodeClick: (nodePath: string) => void = () => {};
  private onNodePointerUp: (nodePath: string) => void = () => {};
  private onLinkPointerDown: (clientX: number, clientY: number) => void = () => {};
  private onNodeDoubleClick?: (node: SchemaNodeView) => void;
  private onExpansionChange: () => void = () => {};
  private onReload: () => void = () => {};
  private initialExpanded = new Set<string>();
  private renderVersion = 0;

  public configure(
    schema: SchemaView,
    side: SchemaSide,
    onNodeClick: (nodePath: string) => void,
    onNodePointerUp: (nodePath: string) => void,
    onLinkPointerDown: (clientX: number, clientY: number) => void,
    initialExpanded?: Set<string>,
    onNodeDoubleClick?: (node: SchemaNodeView) => void,
    onExpansionChange: () => void = () => {},
    onReload: () => void = () => {}
  ): void {
    this.schema = schema;
    this.side = side;
    this.onNodeClick = onNodeClick;
    this.onNodePointerUp = onNodePointerUp;
    this.onLinkPointerDown = onLinkPointerDown;
    this.onNodeDoubleClick = onNodeDoubleClick;
    this.onExpansionChange = onExpansionChange;
    this.onReload = onReload;
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
    const visibleNodes = Array.from(this.querySelectorAll<HTMLElement>('.tree-node[data-path]'));
    let visiblePath = path;
    let node = visibleNodes.find((element) => element.dataset.path === visiblePath);
    while (!node) {
      const separatorIndex = visiblePath.lastIndexOf('/');
      if (separatorIndex <= 0) {
        return null;
      }
      visiblePath = visiblePath.substring(0, separatorIndex);
      node = visibleNodes.find((element) => element.dataset.path === visiblePath);
    }
    const connector = node?.querySelector<HTMLElement>('.node-connector');
    const mappingArea = this.closest('.mapping-area');
    if (!connector || !mappingArea) {
      return null;
    }

    const connectorRect = connector.getBoundingClientRect();
    const areaRect = mappingArea.getBoundingClientRect();
    return {
      x: connectorRect.left - areaRect.left + connectorRect.width / 2,
      y: connectorRect.top - areaRect.top + connectorRect.height / 2,
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
        onNodePointerUp={this.onNodePointerUp}
        onLinkPointerDown={this.onLinkPointerDown}
        onNodeDoubleClick={this.onNodeDoubleClick}
        onExpansionChange={this.onExpansionChange}
        onReload={this.onReload}
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
