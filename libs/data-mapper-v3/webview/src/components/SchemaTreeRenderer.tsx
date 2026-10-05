import { Button, Dropdown, FluentProvider, makeStyles, Option, tokens } from '@fluentui/react-components';
import { ChevronDoubleDown16Regular, ChevronDoubleUp16Regular, Tag16Regular } from '@fluentui/react-icons';
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
  connectedPaths: Set<string>;
  onNodeClick(nodePath: string): void;
  onNodePointerUp(nodePath: string): void;
  onLinkPointerDown(clientX: number, clientY: number): void;
  onNodeDoubleClick?(node: SchemaNodeView): void;
  onExpansionChange(): void;
  availableSchemas: string[];
  onSchemaSelect(path?: string): void;
}

const addNewSchemaValue = '__add_new_schema__';

const useStyles = makeStyles({
  option: { fontSize: tokens.fontSizeBase200 },
  picker: { width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' },
});

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
  connectedPaths,
  onNodeClick,
  onNodePointerUp,
  onLinkPointerDown,
  onNodeDoubleClick,
  onExpansionChange,
  availableSchemas,
  onSchemaSelect,
}: SchemaTreeViewProps): React.ReactElement {
  const styles = useStyles();
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
        className={`node-connector${connectedPaths.has(node.path) ? ' connected' : ''}`}
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
          {!isAttribute && hasChildren && (
            <span className="tree-icon expandable" onClick={(event) => toggleNode(event, node.path)}>
              {isExpanded ? '▼' : '▶'}
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
      <div className="schema-panel">
        <div className="schema-sticky">
          <div className="schema-header">
            <div className="schema-header-row">
              <span className="schema-title">{side === 'source' ? 'Source Schema' : 'Target Schema'}</span>
              <Button
                appearance="subtle"
                aria-label={`${isFullyExpanded ? 'Collapse' : 'Expand'} all schema nodes`}
                className="schema-btn schema-expand-collapse-btn"
                icon={isFullyExpanded ? <ChevronDoubleUp16Regular /> : <ChevronDoubleDown16Regular />}
                size="small"
                title={isFullyExpanded ? 'Collapse All' : 'Expand All'}
                onClick={() => {
                  if (isFullyExpanded) {
                    setExpandedPaths(new Set());
                  } else {
                    setExpandedPaths(expandablePaths);
                  }
                }}
              />
            </div>
          </div>
          <div className="schema-actions">
            <Dropdown
              aria-label={`Choose ${side} schema`}
              className={styles.picker}
              size="small"
              value={filePath.split(/[/\\]/).pop() || ''}
              selectedOptions={[]}
              onOptionSelect={(_event, data) => onSchemaSelect(data.optionValue === addNewSchemaValue ? undefined : data.optionValue)}
            >
              {availableSchemas.map((schemaName) => (
                <Option key={schemaName} value={schemaName} className={styles.option}>
                  {schemaName}
                </Option>
              ))}
              <Option value={addNewSchemaValue} className={styles.option}>
                Add new schema...
              </Option>
            </Dropdown>
          </div>
        </div>
        <div className="schema-tree">{schema.rootElement && renderNode(schema.rootElement, 0)}</div>
      </div>
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
  private availableSchemas: string[] = [];
  private onSchemaSelect: (path?: string) => void = () => {};
  private initialExpanded = new Set<string>();
  private connectedPaths = new Set<string>();
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
    availableSchemas: string[] = [],
    onSchemaSelect: (path?: string) => void = () => {},
    connectedPaths: Set<string> = new Set()
  ): void {
    this.schema = schema;
    this.side = side;
    this.onNodeClick = onNodeClick;
    this.onNodePointerUp = onNodePointerUp;
    this.onLinkPointerDown = onLinkPointerDown;
    this.onNodeDoubleClick = onNodeDoubleClick;
    this.onExpansionChange = onExpansionChange;
    this.availableSchemas = availableSchemas;
    this.onSchemaSelect = onSchemaSelect;
    this.connectedPaths = new Set(connectedPaths);
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

  public setConnectedPaths(paths: Set<string>): void {
    this.connectedPaths.clear();
    for (const path of paths) {
      this.connectedPaths.add(path);
    }
    for (const connector of Array.from(this.querySelectorAll<HTMLElement>('.node-connector[data-path]'))) {
      connector.classList.toggle('connected', this.connectedPaths.has(connector.dataset.path || ''));
    }
  }

  public getNodePosition(path: string): { x: number; y: number } | null {
    return this.getNodePositions([path]).get(path) ?? null;
  }

  public getNodePositions(paths: Iterable<string>): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();
    const visibleNodes = Array.from(this.querySelectorAll<HTMLElement>('.tree-node[data-path]'));
    const nodesByPath = new Map<string, HTMLElement>();
    for (const node of visibleNodes) {
      if (node.dataset.path) {
        nodesByPath.set(node.dataset.path, node);
      }
    }

    const mappingArea = this.closest('.mapping-area');
    if (!mappingArea) {
      return positions;
    }
    const areaRect = mappingArea.getBoundingClientRect();
    const viewportRect = this.getBoundingClientRect();
    const headerHeight = this.querySelector<HTMLElement>('.schema-sticky')?.getBoundingClientRect().height ?? 0;
    const minY = viewportRect.top + headerHeight;
    const maxY = Math.max(minY, viewportRect.bottom);

    for (const path of new Set(paths)) {
      let visiblePath = path;
      let node = nodesByPath.get(visiblePath);
      while (!node) {
        const separatorIndex = visiblePath.lastIndexOf('/');
        if (separatorIndex <= 0) {
          break;
        }
        visiblePath = visiblePath.substring(0, separatorIndex);
        node = nodesByPath.get(visiblePath);
      }

      const connector = node?.querySelector<HTMLElement>('.node-connector');
      if (connector) {
        const connectorRect = connector.getBoundingClientRect();
        const centerY = connectorRect.top + connectorRect.height / 2;
        positions.set(path, {
          x: connectorRect.left - areaRect.left + connectorRect.width / 2,
          y: Math.min(Math.max(centerY, minY), maxY) - areaRect.top,
        });
      }
    }

    return positions;
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
        connectedPaths={this.connectedPaths}
        onNodeClick={this.onNodeClick}
        onNodePointerUp={this.onNodePointerUp}
        onLinkPointerDown={this.onLinkPointerDown}
        onNodeDoubleClick={this.onNodeDoubleClick}
        onExpansionChange={this.onExpansionChange}
        availableSchemas={this.availableSchemas}
        onSchemaSelect={this.onSchemaSelect}
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
