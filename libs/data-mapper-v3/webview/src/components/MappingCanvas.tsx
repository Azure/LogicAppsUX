import React, { useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { createPortal } from 'react-dom';
import type { MapFunctoid, MapLink, MapPage } from '../../../src/model/mapModel';
import type { MapperViewState } from '../../../src/protocol/mapEditorProtocol';

export interface CanvasCallbacks {
    onLinkSelect?: (linkId: string) => void;
    onFunctoidSelect?: (functoidId: string) => void;
    onFunctoidDoubleClick?: (functoidId: string) => void;
    onFunctoidDrop?: (functoid: unknown, x: number, y: number) => void;
    onFunctoidMove?: (functoidId: string, x: number, y: number) => void;
    onFunctoidInputClick?: (functoidId: string) => void;
    onFunctoidOutputClick?: (functoidId: string) => void;
    onDeselect?: () => void;
}

interface Point {
    x: number;
    y: number;
}

interface CanvasViewProps {
    host: MappingCanvas;
    state: MapperViewState;
    callbacks: CanvasCallbacks;
    positions: Map<string, Point>;
    page: MapPage | null;
    offsetX: number;
    offsetY: number;
    zoom: number;
    onZoomChange(zoom: number): void;
}

interface DragTarget {
    id: string;
    offsetX: number;
    offsetY: number;
}

const colors: Record<string, string> = {
    String: '#1b5e20',
    Math: '#4a148c',
    Logical: '#e65100',
    DateTime: '#01579b',
    Conversion: '#33691e',
    Scientific: '#880e4f',
    Advanced: '#263238',
    Custom: '#3e2723'
};

const accents: Record<string, string> = {
    String: '#4caf50',
    Math: '#9c27b0',
    Logical: '#ff9800',
    DateTime: '#03a9f4',
    Conversion: '#8bc34a',
    Scientific: '#e91e63',
    Advanced: '#607d8b',
    Custom: '#795548'
};

const functoidRadius = 32;
const minZoom = 0.1;
const maxZoom = 2;

function abbreviate(name: string): string {
    if (name.length <= 10) {
        return name;
    }
    const words = name.split(' ');
    return words.length > 1
        ? words.map(word => word[0]).join('').toUpperCase()
        : `${name.substring(0, 9)}…`;
}

function getLinkPoints(
    link: MapLink,
    positions: Map<string, Point>,
    page: MapPage,
    offsetX: number,
    offsetY: number,
    scrollLeft: number,
    scrollTop: number,
    zoom: number
): { source: Point; target: Point } | null {
    let source: Point | undefined;
    let target: Point | undefined;

    if (link.sourceType === 'functoid') {
        const functoid = page.functoids.find(item => item.id === link.sourceId);
        if (functoid) {
            source = {
                x: offsetX + (functoid.x + functoidRadius) * zoom - scrollLeft,
                y: offsetY + functoid.y * zoom - scrollTop
            };
        }
    } else if (link.sourcePath) {
        const raw = positions.get(`src:${link.sourcePath}`);
        if (raw) {
            source = raw;
        }
    }

    if (link.targetType === 'functoid') {
        const functoid = page.functoids.find(item => item.id === link.targetId);
        if (functoid) {
            target = {
                x: offsetX + (functoid.x - functoidRadius) * zoom - scrollLeft,
                y: offsetY + functoid.y * zoom - scrollTop
            };
        }
    } else if (link.targetPath) {
        const raw = positions.get(`tgt:${link.targetPath}`);
        if (raw) {
            target = raw;
        }
    }

    return source && target ? { source, target } : null;
}

function LinkPath({
    link,
    from,
    to,
    selected,
    onSelect
}: {
    link: MapLink;
    from: Point;
    to: Point;
    selected: boolean;
    onSelect(): void;
}): React.ReactElement {
    const dx = Math.abs(to.x - from.x);
    const controlOffset = Math.max(dx * 0.4, 40);
    const path = `M ${from.x} ${from.y} C ${from.x + controlOffset} ${from.y}, ${to.x - controlOffset} ${to.y}, ${to.x} ${to.y}`;
    const [hovered, setHovered] = useState(false);

    return (
        <g data-link-id={link.id}>
            <path
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth="14"
                onClick={event => {
                    event.stopPropagation();
                    onSelect();
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{ pointerEvents: 'stroke' }}
            />
            <path
                className="mapping-link"
                d={path}
                fill="none"
                stroke={selected ? '#007fd4' : '#4fc1ff'}
                strokeWidth={selected || hovered ? 3 : 2}
                strokeLinecap="round"
                opacity={selected || hovered ? 1 : 0.75}
                markerEnd="url(#arrowhead)"
            />
            <circle cx={from.x} cy={from.y} r="4" fill="#89d185" />
            <circle cx={to.x} cy={to.y} r="4" fill="#cca700" />
        </g>
    );
}

function FunctoidNode({
    functoid,
    selected,
    zoom,
    svgRef,
    callbacks,
    dragTarget,
    setDragTarget
}: {
    functoid: MapFunctoid;
    selected: boolean;
    zoom: number;
    svgRef: React.RefObject<SVGSVGElement>;
    callbacks: CanvasCallbacks;
    dragTarget: React.MutableRefObject<DragTarget | null>;
    setDragTarget(target: DragTarget): void;
}): React.ReactElement {
    const clickTimer = useRef<number | null>(null);

    return (
        <g
            className="functoid-node"
            data-id={functoid.id}
            transform={`translate(${functoid.x * zoom}, ${functoid.y * zoom}) scale(${zoom})`}
            onClick={event => {
                event.stopPropagation();
                clickTimer.current = window.setTimeout(
                    () => callbacks.onFunctoidSelect?.(functoid.id),
                    250
                );
            }}
            onDoubleClick={event => {
                event.stopPropagation();
                if (clickTimer.current) {
                    clearTimeout(clickTimer.current);
                    clickTimer.current = null;
                }
                callbacks.onFunctoidDoubleClick?.(functoid.id);
            }}
            onMouseDown={event => {
                if ((event.target as Element).classList.contains('functoid-connector')) {
                    return;
                }
                event.preventDefault();
                const svgRect = svgRef.current?.getBoundingClientRect();
                if (!svgRect) {
                    return;
                }
                const target = {
                    id: functoid.id,
                    offsetX: (event.clientX - svgRect.left) / zoom - functoid.x,
                    offsetY: (event.clientY - svgRect.top) / zoom - functoid.y
                };
                dragTarget.current = target;
                setDragTarget(target);
            }}
        >
            <circle
                cx="3"
                cy="3"
                r={functoidRadius}
                fill="rgba(0,0,0,0.25)"
            />
            <circle
                className="functoid-body"
                cx="0"
                cy="0"
                r={functoidRadius}
                fill={colors[functoid.category] || '#424242'}
                stroke={selected ? '#007fd4' : (accents[functoid.category] || '#9e9e9e')}
                strokeWidth={selected ? 4 : 2}
            />
            <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize="9"
            >
                {abbreviate(functoid.name)}
            </text>
            <circle
                cx={-functoidRadius}
                cy="0"
                r="8"
                fill="#89d185"
                stroke="#fff"
                strokeWidth="2"
                className="functoid-connector input-connector"
                style={{ cursor: 'crosshair' }}
                onMouseDown={event => event.stopPropagation()}
                onClick={event => {
                    event.stopPropagation();
                    callbacks.onFunctoidInputClick?.(functoid.id);
                }}
            />
            <circle
                cx={functoidRadius}
                cy="0"
                r="8"
                fill="#cca700"
                stroke="#fff"
                strokeWidth="2"
                className="functoid-connector output-connector"
                style={{ cursor: 'crosshair' }}
                onMouseDown={event => event.stopPropagation()}
                onClick={event => {
                    event.stopPropagation();
                    callbacks.onFunctoidOutputClick?.(functoid.id);
                }}
            />
        </g>
    );
}

function MappingCanvasView({
    host,
    state,
    callbacks,
    positions,
    page,
    offsetX,
    offsetY,
    zoom,
    onZoomChange
}: CanvasViewProps): React.ReactElement {
    const svgRef = useRef<SVGSVGElement>(null);
    const dragTarget = useRef<DragTarget | null>(null);
    const [, setCurrentDrag] = useState<DragTarget | null>(null);
    const zoomPercent = Math.round(zoom * 100);
    const mappingArea = host.closest('.mapping-area');

    const finishDrag = (): void => {
        const target = dragTarget.current;
        if (!target || !page) {
            return;
        }
        const functoid = page.functoids.find(item => item.id === target.id);
        if (functoid) {
            callbacks.onFunctoidMove?.(functoid.id, functoid.x, functoid.y);
        }
        dragTarget.current = null;
        setCurrentDrag(null);
    };

    return (
        <>
            <svg
                ref={svgRef}
                className="mapping-svg"
                width={`${Math.max(100, zoomPercent)}%`}
                height={`${Math.max(100, zoomPercent)}%`}
                onClick={() => callbacks.onDeselect?.()}
                onMouseMove={event => {
                    const target = dragTarget.current;
                    if (!target || !page || !svgRef.current) {
                        return;
                    }
                    const functoid = page.functoids.find(item => item.id === target.id);
                    if (!functoid) {
                        return;
                    }
                    const rect = svgRef.current.getBoundingClientRect();
                    functoid.x = (event.clientX - rect.left) / zoom - target.offsetX;
                    functoid.y = (event.clientY - rect.top) / zoom - target.offsetY;
                    setCurrentDrag({ ...target });
                }}
                onMouseUp={finishDrag}
                onMouseLeave={finishDrag}
                onDragOver={event => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'copy';
                    host.classList.add('drop-active');
                }}
                onDragLeave={() => host.classList.remove('drop-active')}
                onDrop={event => {
                    event.preventDefault();
                    host.classList.remove('drop-active');
                    const data = event.dataTransfer.getData('functoid');
                    if (!data) {
                        return;
                    }
                    try {
                        const rect = host.getBoundingClientRect();
                        const x = (event.clientX - rect.left + host.scrollLeft) / zoom;
                        const y = (event.clientY - rect.top + host.scrollTop) / zoom;
                        callbacks.onFunctoidDrop?.(JSON.parse(data), x, y);
                    } catch {
                        return;
                    }
                }}
            >
                {page?.functoids.map(functoid => (
                    <FunctoidNode
                        key={functoid.id}
                        functoid={functoid}
                        selected={state.selectedFunctoid === functoid.id}
                        zoom={zoom}
                        svgRef={svgRef}
                        callbacks={callbacks}
                        dragTarget={dragTarget}
                        setDragTarget={target => setCurrentDrag(target)}
                    />
                ))}
                <text x="8" y="16" fill="#888" fontSize="10">
                    {page ? `${page.links.length} link${page.links.length === 1 ? '' : 's'}` : '0 links'}
                </text>
            </svg>
            <div className="canvas-zoom-controls">
                <button
                    type="button"
                    title="Zoom Out"
                    disabled={zoom <= minZoom}
                    onClick={() => onZoomChange(Math.max(minZoom, zoom - 0.1))}
                >
                    −
                </button>
                <span data-zoom={zoomPercent}>{zoomPercent}%</span>
                <button
                    type="button"
                    title="Zoom In"
                    disabled={zoom >= maxZoom}
                    onClick={() => onZoomChange(Math.min(maxZoom, zoom + 0.1))}
                >
                    +
                </button>
                <button type="button" title="Reset Zoom" onClick={() => onZoomChange(1)}>
                    1:1
                </button>
            </div>
            {mappingArea && createPortal(
                <svg className="mapping-links-overlay">
                    <defs>
                        <marker
                            id="arrowhead"
                            markerWidth="8"
                            markerHeight="6"
                            refX="8"
                            refY="3"
                            orient="auto"
                        >
                            <polygon points="0 0, 8 3, 0 6" fill="#4fc1ff" />
                        </marker>
                    </defs>
                    {page?.links.map(link => {
                        const points = getLinkPoints(
                            link,
                            positions,
                            page,
                            offsetX,
                            offsetY,
                            host.scrollLeft,
                            host.scrollTop,
                            zoom
                        );
                        return points ? (
                            <LinkPath
                                key={link.id}
                                link={link}
                                from={points.source}
                                to={points.target}
                                selected={state.selectedLink === link.id}
                                onSelect={() => callbacks.onLinkSelect?.(link.id)}
                            />
                        ) : null;
                    })}
                </svg>,
                mappingArea
            )}
        </>
    );
}

export class MappingCanvas extends HTMLElement {
    private reactRoot: Root | null = null;
    private state: MapperViewState | null = null;
    private callbacks: CanvasCallbacks = {};
    private positions = new Map<string, Point>();
    private page: MapPage | null = null;
    private offsetX = 0;
    private offsetY = 0;
    private zoom = 1;

    public configure(state: MapperViewState, callbacks?: CanvasCallbacks): void {
        this.state = state;
        this.callbacks = callbacks || {};
        this.renderReact();
    }

    public connectedCallback(): void {
        this.addEventListener('scroll', this.handleScroll);
        this.renderReact();
    }

    public disconnectedCallback(): void {
        this.removeEventListener('scroll', this.handleScroll);
        this.reactRoot?.unmount();
        this.reactRoot = null;
    }

    public updateState(state: MapperViewState): void {
        this.state = state;
        this.renderReact();
    }

    public renderWithPositions(positions: Map<string, Point>, page: MapPage | null): void {
        this.positions = new Map(positions);
        this.page = page;

        const mappingArea = this.closest('.mapping-area');
        const canvasRect = this.getBoundingClientRect();
        const areaRect = mappingArea?.getBoundingClientRect();
        this.offsetX = areaRect ? canvasRect.left - areaRect.left : 0;
        this.offsetY = areaRect ? canvasRect.top - areaRect.top : 0;
        this.renderReact();
    }

    public setZoom(zoom: number): void {
        this.zoom = Math.min(maxZoom, Math.max(minZoom, zoom));
        this.renderReact();
    }

    private readonly handleScroll = (): void => {
        this.renderReact();
    };

    private renderReact(): void {
        if (!this.isConnected || !this.state) {
            return;
        }
        this.reactRoot ??= createRoot(this);
        this.reactRoot.render(
            <MappingCanvasView
                host={this}
                state={this.state}
                callbacks={this.callbacks}
                positions={this.positions}
                page={this.page}
                offsetX={this.offsetX}
                offsetY={this.offsetY}
                zoom={this.zoom}
                onZoomChange={zoom => this.setZoom(zoom)}
            />
        );
    }
}

customElements.define('biztalk-mapping-canvas', MappingCanvas);

declare global {
    interface HTMLElementTagNameMap {
        'biztalk-mapping-canvas': MappingCanvas;
    }
}
