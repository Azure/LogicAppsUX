import React, { useMemo, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';

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
    Custom: '#795548'
};

function FunctoidPaletteView({ functoids, onSelect }: FunctoidPaletteViewProps): React.ReactElement {
    const [expandedCategories, setExpandedCategories] = useState(
        () => new Set(['String', 'Math', 'Logical'])
    );
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
        setExpandedCategories(current => {
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
        <>
            <div className="palette-header"><span className="palette-title">Functoids</span></div>
            <input
                className="palette-search"
                placeholder="Search functoids..."
                value={searchTerm}
                onChange={event => setSearchTerm(event.currentTarget.value)}
            />
            {Array.from(groups, ([category, items]) => {
                const filteredItems = searchTerm
                    ? items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    : items;
                if (filteredItems.length === 0) {
                    return null;
                }

                const isExpanded = expandedCategories.has(category) || searchTerm.length > 0;
                return (
                    <div className="palette-category" key={category}>
                        <div className="category-header" onClick={() => toggleCategory(category)}>
                            <span className="category-icon">{isExpanded ? '▼' : '▶'}</span>
                            <span className="category-name">{category}</span>
                            <span className="category-count">{filteredItems.length}</span>
                        </div>
                        {isExpanded && (
                            <div className="category-items">
                                {filteredItems.map(item => (
                                    <div
                                        className="palette-item"
                                        title={item.tooltip || item.description || ''}
                                        draggable
                                        key={item.id}
                                        onClick={() => onSelect(item)}
                                        onDragStart={event => {
                                            event.dataTransfer.setData('functoid', JSON.stringify(item));
                                        }}
                                    >
                                        <span
                                            className="item-icon"
                                            style={{ background: categoryColors[category] || '#9e9e9e' }}
                                        >
                                            fn
                                        </span>
                                        <span className="item-name">{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
}

export class FunctoidPalette extends HTMLElement {
    private reactRoot: Root | null = null;
    private functoids: FunctoidPaletteItem[] = [];
    private onSelect: (functoid: FunctoidPaletteItem) => void = () => {};
    private renderVersion = 0;

    public configure(
        functoids: FunctoidPaletteItem[],
        onSelect: (functoid: FunctoidPaletteItem) => void
    ): void {
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
        this.reactRoot.render(
            <FunctoidPaletteView
                key={this.renderVersion}
                functoids={this.functoids}
                onSelect={this.onSelect}
            />
        );
    }
}

customElements.define('biztalk-functoid-palette', FunctoidPalette);

declare global {
    interface HTMLElementTagNameMap {
        'biztalk-functoid-palette': FunctoidPalette;
    }
}
