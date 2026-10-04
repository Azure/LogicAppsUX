import { Button, FluentProvider, Input, makeStyles } from '@fluentui/react-components';
import { ChevronDown12Regular, ChevronRight12Regular, Search16Regular } from '@fluentui/react-icons';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React, { useMemo, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getVsCodeFluentTheme } from '../fluentTheme';
import { getFunctoidDisplayName } from './functoidDisplayName';

const useStyles = makeStyles({
  header: {
    padding: '8px 12px',
    fontWeight: 600,
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--vscode-sideBarSectionHeader-foreground)',
    backgroundColor: 'var(--vscode-sideBarSectionHeader-background)',
    borderBottom: '1px solid var(--vscode-panel-border, #333)',
  },
  search: { width: 'calc(100% - 16px)', margin: '6px 8px', fontSize: '11px' },
  categoryHeader: {
    display: 'flex',
    width: '100%',
    minHeight: '30px',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '6px',
    padding: '0 10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--vscode-foreground)',
    ':hover': { backgroundColor: 'var(--vscode-list-hoverBackground, #2a2d2e)' },
    '& .fui-Button__content': {
      display: 'flex',
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'flex-start',
      textAlign: 'left',
    },
  },
  categoryCount: { marginLeft: 'auto', fontSize: '9px', color: 'var(--vscode-descriptionForeground)' },
  categoryItems: { padding: '2px 10px 4px 15px' },
  item: {
    display: 'flex',
    width: '100%',
    height: '30px',
    minHeight: '30px',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '1px 4px',
    cursor: 'grab',
    fontSize: '13px',
    borderRadius: '3px',
    textAlign: 'left',
    ':active': { cursor: 'grabbing' },
    ':hover': { backgroundColor: 'var(--vscode-list-hoverBackground, #2a2d2e)' },
  },
  itemContent: {
    display: 'flex',
    flex: 1,
    width: '100%',
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '8px',
    textAlign: 'left',
  },
  itemIcon: {
    width: '17px',
    height: '17px',
    flex: '0 0 17px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '8px',
    fontWeight: 'bold',
    color: 'white',
  },
  itemName: { minWidth: 0, overflow: 'hidden', fontSize: '13px', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
});

export interface FunctoidPaletteItem {
  id: number;
  name: string;
  category?: string;
  tooltip?: string;
  description?: string;
}

interface FunctoidPaletteViewProps {
  functoids: FunctoidPaletteItem[];
  onSelect(functoid: FunctoidPaletteItem): void;
}

const categoryColors: Record<string, string> = {
  String: '#4caf50',
  Math: '#9c27b0',
  Logical: '#ff9800',
  DateTime: '#2196f3',
  Conversion: '#8bc34a',
  Scientific: '#e91e63',
  Advanced: '#607d8b',
  Custom: '#795548',
};

function FunctoidPaletteView({ functoids, onSelect }: FunctoidPaletteViewProps): React.ReactElement {
  const styles = useStyles();
  const [expandedCategories, setExpandedCategories] = useState(() => new Set(['String', 'Math', 'Logical']));
  const [searchTerm, setSearchTerm] = useState('');
  const groups = useMemo(() => {
    const grouped = new Map<string, FunctoidPaletteItem[]>();
    for (const functoid of functoids) {
      const category = functoid.category || 'Custom';
      grouped.set(category, [...(grouped.get(category) || []), functoid]);
    }
    return grouped;
  }, [functoids]);

  const toggleCategory = (category: string): void => {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <FluentProvider theme={getVsCodeFluentTheme()} style={{ display: 'contents' }}>
      <div className={styles.header}>
        <span>Functoids</span>
      </div>
      <Input
        className={styles.search}
        placeholder="Search functoids..."
        size="small"
        contentBefore={<Search16Regular />}
        value={searchTerm}
        onChange={(_event, data) => setSearchTerm(data.value)}
      />
      {Array.from(groups, ([category, items]) => {
        const filteredItems = searchTerm ? items.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())) : items;
        if (filteredItems.length === 0) {
          return null;
        }

        const isExpanded = expandedCategories.has(category) || searchTerm.length > 0;
        return (
          <div className="palette-category" key={category}>
            <Button
              appearance="transparent"
              className={`category-header ${styles.categoryHeader}`}
              icon={isExpanded ? <ChevronDown12Regular /> : <ChevronRight12Regular />}
              onClick={() => toggleCategory(category)}
            >
              <span className="category-name">{category}</span>
              <span className={styles.categoryCount}>{filteredItems.length}</span>
            </Button>
            {isExpanded && (
              <div className={styles.categoryItems}>
                {filteredItems.map((item) => (
                  <Button
                    appearance="transparent"
                    className={`palette-item ${styles.item}`}
                    title={item.tooltip || item.description || ''}
                    draggable
                    key={item.id}
                    onClick={() => onSelect(item)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData('functoid', JSON.stringify(item));
                    }}
                  >
                    <span className={`${styles.itemContent} palette-item-content`}>
                      <span className={`${styles.itemIcon} item-icon`} style={{ background: categoryColors[category] || '#9e9e9e' }}>
                        fn
                      </span>
                      <span className={`${styles.itemName} item-name`}>{getFunctoidDisplayName(item.name)}</span>
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </FluentProvider>
  );
}

export class FunctoidPalette extends HTMLElement {
  private reactRoot: Root | null = null;
  private functoids: FunctoidPaletteItem[] = [];
  private onSelect: (functoid: FunctoidPaletteItem) => void = () => {};
  private renderVersion = 0;

  public configure(functoids: FunctoidPaletteItem[], onSelect: (functoid: FunctoidPaletteItem) => void): void {
    this.functoids = functoids;
    this.onSelect = onSelect;
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

  private renderReact(): void {
    if (!this.isConnected) {
      return;
    }
    this.reactRoot ??= createRoot(this);
    this.reactRoot.render(<FunctoidPaletteView key={this.renderVersion} functoids={this.functoids} onSelect={this.onSelect} />);
  }
}

customElements.define('biztalk-functoid-palette', FunctoidPalette);

declare global {
  interface HTMLElementTagNameMap {
    'biztalk-functoid-palette': FunctoidPalette;
  }
}
