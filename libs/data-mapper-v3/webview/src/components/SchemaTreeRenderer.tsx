import {
  Button,
  Dropdown,
  FluentProvider,
  Input,
  Link,
  makeStyles,
  Menu,
  MenuItem,
  MenuItemCheckbox,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Option,
  ToggleButton,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowDown16Regular,
  ArrowUp16Regular,
  ChevronDoubleDown16Regular,
  ChevronDoubleUp16Regular,
  ChevronRight16Regular,
  Dismiss16Regular,
  Filter16Regular,
  MoreHorizontal16Regular,
  Search16Regular,
  Tag16Regular,
  TextBulletListTree16Regular,
} from '@fluentui/react-icons';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
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
  availableRoots?: string[];
  rootElement?: SchemaNodeView;
}

type SchemaSide = 'source' | 'target';

interface SchemaTreeViewProps {
  schema: SchemaView;
  side: SchemaSide;
  initialExpanded: Set<string>;
  connectedPaths: Set<string>;
  highlightedPaths: Set<string>;
  revealPaths: Set<string>;
  revealVersion: number;
  suggestedPaths: Set<string>;
  subtreeRequests: Array<{ path: string; expanded: boolean }>;
  onSubtreeRequestsHandled(): void;
  onNodeClick(nodePath: string): void;
  onNodeSelect?(node: SchemaNodeView): void;
  selectedPath?: string;
  onNodePointerUp(nodePath: string): void;
  onLinkPointerDown(clientX: number, clientY: number): void;
  onNodeDoubleClick?(node: SchemaNodeView): void;
  onExpansionChange(): void;
  availableSchemas: string[];
  onSchemaSelect(path?: string): void;
  onRootSelect(rootName: string): void;
}

const addNewSchemaValue = '__add_new_schema__';

const useStyles = makeStyles({
  option: { fontSize: tokens.fontSizeBase200 },
  picker: { width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' },
  pickerButton: { minWidth: 0 },
  pickerText: { display: 'block', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rootRow: {
    display: 'flex',
    alignItems: 'baseline',
    columnGap: '6px',
    minWidth: 0,
    padding: '0 10px 4px',
    fontSize: tokens.fontSizeBase200,
    color: 'var(--vscode-descriptionForeground)',
  },
  rootName: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rootLink: { fontSize: tokens.fontSizeBase200, whiteSpace: 'nowrap' },
  toolbar: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px', padding: '4px 10px', minWidth: 0 },
  search: { flexGrow: 1, flexBasis: '120px', minWidth: 0, width: '100%' },
  count: { fontSize: tokens.fontSizeBase200, whiteSpace: 'nowrap', color: tokens.colorNeutralForeground2 },
  compactCount: { flexBasis: '100%', minWidth: 0 },
  match: { backgroundColor: tokens.colorPaletteYellowBackground2 },
  activeMatch: { outline: `1px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '-1px' },
  suggestion: { backgroundColor: tokens.colorBrandBackground2 },
  hiddenGroup: { display: 'flex', alignItems: 'center', minHeight: '24px' },
});

function nodeChildren(node: SchemaNodeView): SchemaNodeView[] {
  return [
    ...(node.attributes || []).map((attribute) => ({
      name: attribute.name,
      path: `${node.path}/@${attribute.name}`,
      type: 'attribute',
      dataType: attribute.type,
      namespace: attribute.namespace,
      defaultValue: attribute.defaultValue,
      fixedValue: attribute.fixedValue,
      minOccurs: attribute.required ? 1 : 0,
      maxOccurs: 1,
      isOptional: !attribute.required,
    })),
    ...(node.children || []),
  ];
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
  connectedPaths,
  highlightedPaths,
  revealPaths,
  revealVersion,
  suggestedPaths,
  subtreeRequests,
  onSubtreeRequestsHandled,
  onNodeClick,
  onNodeSelect,
  selectedPath,
  onNodePointerUp,
  onLinkPointerDown,
  onNodeDoubleClick,
  onExpansionChange,
  availableSchemas,
  onSchemaSelect,
  onRootSelect,
}: SchemaTreeViewProps): React.ReactElement {
  const styles = useStyles();
  const [expandedPaths, setExpandedPaths] = useState(() => new Set(initialExpanded));
  const [query, setQuery] = useState('');
  const [activeMatchPath, setActiveMatchPath] = useState<string>();
  const [coalesced, setCoalesced] = useState(false);
  const [compact, setCompact] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => new Set<string>());
  const [localRevealPath, setLocalRevealPath] = useState<string>();
  const [localRevealVersion, setLocalRevealVersion] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const pointerStartedPath = useRef<string | null>(null);
  const expandablePaths = new Set<string>();
  collectExpandablePaths(schema.rootElement, expandablePaths);
  const isFullyExpanded = Array.from(expandablePaths).every((path) => expandedPaths.has(path));
  const nodes: SchemaNodeView[] = [];
  const collectNodes = (node: SchemaNodeView): void => {
    nodes.push(node);
    nodeChildren(node).forEach(collectNodes);
  };
  if (schema.rootElement) {
    collectNodes(schema.rootElement);
  }
  const normalizedQuery = query.trim().toLowerCase();
  const matches = normalizedQuery
    ? nodes.filter((node) => node.name.toLowerCase().includes(normalizedQuery) || node.path.toLowerCase().includes(normalizedQuery))
    : [];
  const searchPaths = new Set(matches.map((node) => node.path));
  const activeIndex = Math.max(
    0,
    matches.findIndex((node) => node.path === activeMatchPath)
  );
  const activeMatch = matches[activeIndex];
  const retainedPaths = new Set<string>();
  for (const path of [
    ...Array.from(connectedPaths),
    ...Array.from(highlightedPaths),
    ...Array.from(suggestedPaths),
    ...Array.from(searchPaths),
    ...Array.from(revealPaths),
    selectedPath,
    localRevealPath,
  ]) {
    let ancestor = path;
    while (ancestor) {
      retainedPaths.add(ancestor);
      ancestor = ancestor.substring(0, ancestor.lastIndexOf('/'));
    }
  }

  const revealLocal = (path: string): void => {
    setLocalRevealPath(path);
    setLocalRevealVersion((current) => current + 1);
  };
  const changeSubtree = useCallback(
    (path: string, expanded: boolean): void => {
      const subtreePaths = new Set<string>();
      collectExpandablePaths(schema.rootElement, subtreePaths);
      setExpandedPaths((current) => {
        const next = new Set(current);
        for (const candidate of subtreePaths) {
          if (candidate === path || candidate.startsWith(`${path}/`)) {
            if (expanded) {
              next.add(candidate);
            } else {
              next.delete(candidate);
            }
          }
        }
        return next;
      });
    },
    [schema.rootElement]
  );

  useLayoutEffect(() => {
    if (!subtreeRequests.length) {
      return;
    }
    for (const request of subtreeRequests) {
      changeSubtree(request.path, request.expanded);
    }
    onSubtreeRequestsHandled();
  }, [subtreeRequests, changeSubtree, onSubtreeRequestsHandled]);

  useLayoutEffect(() => {
    setLocalRevealPath(activeMatch?.path);
    setLocalRevealVersion((current) => current + 1);
  }, [query, activeMatch?.path]);

  useLayoutEffect(() => {
    setLocalRevealPath(undefined);
  }, [revealPaths, revealVersion]);

  useLayoutEffect(() => {
    onExpansionChange();
  }, [
    expandedPaths,
    coalesced,
    compact,
    openGroups,
    query,
    selectedPath,
    connectedPaths,
    suggestedPaths,
    highlightedPaths,
    onExpansionChange,
  ]);

  useLayoutEffect(() => {
    const paths = localRevealPath ? [...Array.from(revealPaths), localRevealPath] : Array.from(revealPaths);
    if (paths.length === 0) {
      return;
    }
    setExpandedPaths((current) => {
      const next = new Set(current);
      for (const path of paths) {
        let parent = path.substring(0, path.lastIndexOf('/'));
        while (parent) {
          next.add(parent);
          parent = parent.substring(0, parent.lastIndexOf('/'));
        }
      }
      return next.size === current.size ? current : next;
    });
  }, [revealPaths, revealVersion, localRevealPath, localRevealVersion]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const viewport = panel?.closest('biztalk-schema-tree');
    const path = localRevealVersion > 0 && localRevealPath ? localRevealPath : Array.from(revealPaths)[0];
    const row = panel && Array.from(panel.querySelectorAll<HTMLElement>('.tree-node')).find((element) => element.dataset.path === path);
    if (viewport && row) {
      const bounds = viewport.getBoundingClientRect();
      const node = row.getBoundingClientRect();
      const header = panel?.querySelector('.schema-sticky')?.getBoundingClientRect().height ?? 0;
      const contentTop = bounds.top + viewport.clientTop + header;
      const contentBottom = bounds.top + viewport.clientTop + viewport.clientHeight;
      if (node.top < contentTop || node.bottom > contentBottom) {
        viewport.scrollTop += node.top - contentTop - Math.max(0, (contentBottom - contentTop - node.height) / 2);
      }
    }
  }, [revealPaths, revealVersion, expandedPaths, localRevealPath, localRevealVersion, coalesced, openGroups]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const viewport = panel?.closest('biztalk-schema-tree');
    if (!panel || !viewport) {
      return;
    }
    let frame: number | undefined;
    const updateWidth = (): void => {
      frame = undefined;
      setCompact(viewport.clientWidth < 260);
      const bounds = viewport.getBoundingClientRect();
      const viewportBottom = bounds.top + viewport.clientTop + viewport.clientHeight;
      const headerBottom = panel.querySelector('.schema-sticky')?.getBoundingClientRect().bottom ?? bounds.top;
      let width = viewport.clientWidth;
      for (const row of Array.from(panel.querySelectorAll<HTMLElement>('.tree-node'))) {
        const rowBounds = row.getBoundingClientRect();
        if (rowBounds.bottom <= headerBottom || rowBounds.top >= viewportBottom) {
          continue;
        }
        const rowStyle = getComputedStyle(row);
        const children = Array.from(row.children).filter((child) => getComputedStyle(child).display !== 'none');
        const contentWidth = children.reduce((total, child) => {
          const style = getComputedStyle(child);
          const margin = child.classList.contains('node-connector')
            ? 0
            : (Number.parseFloat(style.marginLeft) || 0) + (Number.parseFloat(style.marginRight) || 0);
          return total + child.getBoundingClientRect().width + margin;
        }, 0);
        width = Math.max(
          width,
          Math.ceil(
            contentWidth +
              Math.max(0, children.length - 1) * (Number.parseFloat(rowStyle.columnGap) || 0) +
              Number.parseFloat(rowStyle.paddingLeft) +
              Number.parseFloat(rowStyle.paddingRight)
          )
        );
      }
      const needsHorizontalScroll = width > viewport.clientWidth + 1;
      viewport.style.overflowX = needsHorizontalScroll ? 'auto' : 'hidden';
      const value = `${needsHorizontalScroll ? width : viewport.clientWidth}px`;
      if (panel.style.getPropertyValue('--schema-content-width') !== value) {
        panel.style.setProperty('--schema-content-width', value);
        onExpansionChange();
      }
    };
    const scheduleWidth = (): void => {
      frame ??= requestAnimationFrame(updateWidth);
    };
    const observer = new ResizeObserver(scheduleWidth);
    observer.observe(viewport);
    viewport.addEventListener('scroll', scheduleWidth, { passive: true });
    viewport.addEventListener('pointerover', scheduleWidth);
    viewport.addEventListener('pointerout', scheduleWidth);
    updateWidth();
    return () => {
      observer.disconnect();
      viewport.removeEventListener('scroll', scheduleWidth);
      viewport.removeEventListener('pointerover', scheduleWidth);
      viewport.removeEventListener('pointerout', scheduleWidth);
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    };
  }, [expandedPaths, coalesced, openGroups, query, selectedPath, connectedPaths, suggestedPaths, highlightedPaths, onExpansionChange]);

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

    const descendants = hasChildren && isExpanded ? nodeChildren(node) : [];

    return (
      <React.Fragment key={node.path}>
        <div
          className={`tree-node${highlightedPaths.has(node.path) ? ' link-traced' : ''}${selectedPath === node.path ? ' selected' : ''} ${suggestedPaths.has(node.path) ? styles.suggestion : ''} ${searchPaths.has(node.path) ? styles.match : ''} ${activeMatch?.path === node.path ? styles.activeMatch : ''}`}
          data-path={node.path}
          data-side={side}
          tabIndex={0}
          title="Double-click to view node properties"
          onClick={() => onNodeSelect?.(node)}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) {
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              onNodeDoubleClick?.(node);
            } else if (event.key === ' ') {
              event.preventDefault();
              onNodeSelect?.(node);
            }
          }}
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
        {renderSiblings(descendants, depth + 1)}
      </React.Fragment>
    );
  };

  const renderSiblings = (siblings: SchemaNodeView[], depth: number): React.ReactNode[] => {
    const rendered: React.ReactNode[] = [];
    let hidden: SchemaNodeView[] = [];
    const flushHidden = (): void => {
      if (hidden.length === 0) {
        return;
      }
      const group = hidden;
      const groupKey = group[0].path;
      const expanded = openGroups.has(groupKey);
      rendered.push(
        <React.Fragment key={`hidden:${groupKey}`}>
          <div className={styles.hiddenGroup} style={{ paddingLeft: depth * 16 }}>
            <Button
              appearance="subtle"
              size="small"
              icon={<ChevronRight16Regular style={{ transform: expanded ? 'rotate(90deg)' : undefined }} />}
              aria-expanded={expanded}
              aria-label={`${expanded ? 'Collapse' : 'Expand'} ${group.length} hidden nodes under ${siblings[0]?.path.substring(0, siblings[0].path.lastIndexOf('/'))}`}
              onClick={() =>
                setOpenGroups((current) => {
                  const next = new Set(current);
                  if (expanded) {
                    next.delete(groupKey);
                  } else {
                    next.add(groupKey);
                  }
                  return next;
                })
              }
            >
              {group.length} hidden nodes
            </Button>
          </div>
          {expanded && group.map((child) => renderNode(child, depth))}
        </React.Fragment>
      );
      hidden = [];
    };
    for (const child of siblings) {
      if (coalesced && !retainedPaths.has(child.path)) {
        hidden.push(child);
      } else {
        flushHidden();
        rendered.push(renderNode(child, depth));
      }
    }
    flushHidden();
    return rendered;
  };

  const navigateMatch = (direction: number): void => {
    if (matches.length === 0) {
      return;
    }
    const next = matches[(activeIndex + direction + matches.length) % matches.length];
    setActiveMatchPath(next.path);
    revealLocal(next.path);
    onNodeSelect?.(next);
  };

  const expandLinkedNodes = (): void => {
    const linkedPaths = Array.from(connectedPaths);
    setExpandedPaths(new Set(Array.from(expandablePaths).filter((path) => linkedPaths.some((linked) => linked.startsWith(`${path}/`)))));
  };
  const toggleAllNodes = (): void => {
    setExpandedPaths(isFullyExpanded ? new Set() : new Set(expandablePaths));
  };

  const filePath = schema.filePath || '';
  return (
    <FluentProvider theme={getVsCodeFluentTheme()} style={{ display: 'contents' }}>
      <div className="schema-panel" ref={panelRef}>
        <div className="schema-sticky">
          <div className="schema-header">
            <div className="schema-header-row">
              <span className="schema-title">{side === 'source' ? 'Source Schema' : 'Target Schema'}</span>
              {!compact && (
                <div className="schema-header-buttons">
                  <Button
                    appearance="subtle"
                    aria-label="Expand linked schema nodes"
                    className="schema-btn schema-expand-linked-btn"
                    icon={<TextBulletListTree16Regular />}
                    size="small"
                    title="Expand Linked Nodes"
                    onClick={expandLinkedNodes}
                  />
                  <Button
                    appearance="subtle"
                    aria-label={`${isFullyExpanded ? 'Collapse' : 'Expand'} all schema nodes`}
                    className="schema-btn schema-expand-collapse-btn"
                    icon={isFullyExpanded ? <ChevronDoubleUp16Regular /> : <ChevronDoubleDown16Regular />}
                    size="small"
                    title={isFullyExpanded ? 'Collapse All' : 'Expand All'}
                    onClick={toggleAllNodes}
                  />
                </div>
              )}
            </div>
          </div>
          <div className={styles.toolbar}>
            <Input
              className={styles.search}
              size="small"
              aria-label={`Search ${side} schema names or XPaths`}
              placeholder="Search names or XPaths"
              contentBefore={<Search16Regular />}
              contentAfter={
                query ? (
                  <Button
                    appearance="transparent"
                    size="small"
                    icon={<Dismiss16Regular />}
                    aria-label="Clear schema search"
                    title="Clear search"
                    onClick={() => {
                      setQuery('');
                      setActiveMatchPath(undefined);
                    }}
                  />
                ) : undefined
              }
              value={query}
              onChange={(_event, data) => {
                setQuery(data.value);
                setActiveMatchPath(undefined);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  navigateMatch(event.shiftKey ? -1 : 1);
                } else if (event.key === 'Escape') {
                  setQuery('');
                  setActiveMatchPath(undefined);
                }
              }}
            />
            <span className={`${styles.count} ${compact ? styles.compactCount : ''}`} role="status" aria-live="polite">
              {normalizedQuery ? (matches.length ? `${activeIndex + 1} of ${matches.length}` : 'No results') : ''}
            </span>
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowUp16Regular />}
              disabled={!matches.length}
              aria-label="Previous schema match"
              title="Previous match"
              onClick={() => navigateMatch(-1)}
            />
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowDown16Regular />}
              disabled={!matches.length}
              aria-label="Next schema match"
              title="Next match"
              onClick={() => navigateMatch(1)}
            />
            {!compact && (
              <>
                <ToggleButton
                  appearance="subtle"
                  size="small"
                  icon={<Filter16Regular />}
                  checked={coalesced}
                  aria-label="Coalesce unrelated schema nodes"
                  title="Coalesce unrelated nodes"
                  onClick={() => setCoalesced((current) => !current)}
                />
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<ChevronDoubleDown16Regular />}
                  disabled={!selectedPath}
                  aria-label="Expand selected subtree"
                  title="Expand selected subtree"
                  onClick={() => {
                    if (selectedPath) {
                      changeSubtree(selectedPath, true);
                    }
                  }}
                />
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<ChevronDoubleUp16Regular />}
                  disabled={!selectedPath}
                  aria-label="Collapse selected subtree"
                  title="Collapse selected subtree"
                  onClick={() => {
                    if (selectedPath) {
                      changeSubtree(selectedPath, false);
                    }
                  }}
                />
              </>
            )}
            {compact && (
              <Menu
                checkedValues={{ view: coalesced ? ['coalesced'] : [] }}
                onCheckedValueChange={(_event, data) => setCoalesced(data.checkedItems.includes('coalesced'))}
              >
                <MenuTrigger disableButtonEnhancement>
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<MoreHorizontal16Regular />}
                    aria-label="Schema node tools"
                    title="Schema node tools"
                  />
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <MenuItem onClick={expandLinkedNodes}>Expand linked schema nodes</MenuItem>
                    <MenuItem onClick={toggleAllNodes}>{isFullyExpanded ? 'Collapse' : 'Expand'} all schema nodes</MenuItem>
                    <MenuItemCheckbox name="view" value="coalesced">
                      Coalesce unrelated schema nodes
                    </MenuItemCheckbox>
                    <MenuItem
                      disabled={!selectedPath}
                      onClick={() => {
                        if (selectedPath) {
                          changeSubtree(selectedPath, true);
                        }
                      }}
                    >
                      Expand selected subtree
                    </MenuItem>
                    <MenuItem
                      disabled={!selectedPath}
                      onClick={() => {
                        if (selectedPath) {
                          changeSubtree(selectedPath, false);
                        }
                      }}
                    >
                      Collapse selected subtree
                    </MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
            )}
          </div>
          <div className="schema-actions">
            <Dropdown
              aria-label={`Choose ${side} schema`}
              className={styles.picker}
              button={{
                className: styles.pickerButton,
                title: filePath,
                children: <span className={styles.pickerText}>{filePath.split(/[/\\]/).pop() || ''}</span>,
              }}
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
          {schema.availableRoots && schema.availableRoots.length > 1 && (
            <div className={styles.rootRow}>
              <span className={styles.rootName} title={schema.rootElement?.name}>
                Root: {schema.rootElement?.name}
              </span>
              <Menu
                checkedValues={{ root: schema.rootElement ? [schema.rootElement.name] : [] }}
                onCheckedValueChange={(_event, data) => {
                  const selectedRoot = data.checkedItems[0];
                  if (selectedRoot && selectedRoot !== schema.rootElement?.name) {
                    onRootSelect(selectedRoot);
                  }
                }}
              >
                <MenuTrigger disableButtonEnhancement>
                  <Link as="button" className={styles.rootLink} aria-label={`Change ${side} schema root`}>
                    Change root
                  </Link>
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    {schema.availableRoots.map((rootName) => (
                      <MenuItemRadio key={rootName} name="root" value={rootName}>
                        {rootName}
                      </MenuItemRadio>
                    ))}
                  </MenuList>
                </MenuPopover>
              </Menu>
            </div>
          )}
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
  private onNodeSelect?: (node: SchemaNodeView) => void;
  private selectedPath?: string;
  private onExpansionChange: () => void = () => {};
  private availableSchemas: string[] = [];
  private onSchemaSelect: (path?: string) => void = () => {};
  private onRootSelect: (rootName: string) => void = () => {};
  private initialExpanded = new Set<string>();
  private connectedPaths = new Set<string>();
  private highlightedPaths = new Set<string>();
  private revealPaths = new Set<string>();
  private revealVersion = 0;
  private suggestedPaths = new Set<string>();
  private subtreeRequests: Array<{ path: string; expanded: boolean }> = [];
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
    connectedPaths: Set<string> = new Set(),
    onRootSelect: (rootName: string) => void = () => {},
    onNodeSelect?: (node: SchemaNodeView) => void
  ): void {
    this.schema = schema;
    this.side = side;
    this.onNodeClick = onNodeClick;
    this.onNodePointerUp = onNodePointerUp;
    this.onLinkPointerDown = onLinkPointerDown;
    this.onNodeDoubleClick = onNodeDoubleClick;
    this.onNodeSelect = onNodeSelect;
    this.onExpansionChange = onExpansionChange;
    this.availableSchemas = availableSchemas;
    this.onSchemaSelect = onSchemaSelect;
    this.onRootSelect = onRootSelect;
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

  public setSelectedPath(path?: string): void {
    if (this.selectedPath !== path) {
      this.selectedPath = path;
      this.renderReact();
    }
  }

  public disconnectedCallback(): void {
    this.reactRoot?.unmount();
    this.reactRoot = null;
  }

  public setLinkHighlights(paths: Set<string>, reveal = false): void {
    const unchanged = paths.size === this.highlightedPaths.size && Array.from(paths).every((path) => this.highlightedPaths.has(path));
    if (unchanged && !reveal) {
      return;
    }
    this.highlightedPaths = new Set(paths);
    this.revealPaths = reveal ? new Set(paths) : new Set();
    this.renderReact();
  }

  public setConnectedPaths(paths: Set<string>): void {
    this.updateConnectedPaths(paths);
  }

  public updateConnectedPaths(paths: Set<string>): void {
    if (paths.size === this.connectedPaths.size && Array.from(paths).every((path) => this.connectedPaths.has(path))) {
      return;
    }
    this.connectedPaths = new Set(paths);
    for (const connector of Array.from(this.querySelectorAll<HTMLElement>('.node-connector[data-path]'))) {
      connector.classList.toggle('connected', this.connectedPaths.has(connector.dataset.path || ''));
    }
    this.renderReact();
  }

  public expandSubtree(path: string, expanded: boolean): void {
    this.subtreeRequests = [...this.subtreeRequests, { path, expanded }];
    this.renderReact();
  }

  public revealNode(path: string): void {
    this.revealPaths = new Set([path]);
    this.revealVersion++;
    this.renderReact();
  }

  public setSuggestedMatches(paths: Set<string>): void {
    this.suggestedPaths = new Set(paths);
    const first = Array.from(paths)[0];
    if (first) {
      this.revealNode(first);
    } else {
      this.revealPaths = new Set();
      this.renderReact();
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
        highlightedPaths={this.highlightedPaths}
        revealPaths={this.revealPaths}
        revealVersion={this.revealVersion}
        suggestedPaths={this.suggestedPaths}
        subtreeRequests={this.subtreeRequests}
        onSubtreeRequestsHandled={() => {
          this.subtreeRequests = [];
        }}
        onNodeClick={this.onNodeClick}
        onNodeSelect={(node) => {
          this.setSelectedPath(node.path);
          this.onNodeSelect?.(node);
        }}
        selectedPath={this.selectedPath}
        onNodePointerUp={this.onNodePointerUp}
        onLinkPointerDown={this.onLinkPointerDown}
        onNodeDoubleClick={this.onNodeDoubleClick}
        onExpansionChange={this.onExpansionChange}
        availableSchemas={this.availableSchemas}
        onSchemaSelect={this.onSchemaSelect}
        onRootSelect={this.onRootSelect}
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
