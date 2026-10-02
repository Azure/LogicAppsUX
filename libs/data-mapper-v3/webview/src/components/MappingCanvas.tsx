// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React, { useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getFunctoidDisplayName } from './functoidDisplayName';
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
  onFunctoidInputPointerUp?: (functoidId: string) => void;
  onFunctoidOutputPointerUp?: (functoidId: string) => void;
  onLinkPointerDown?: (clientX: number, clientY: number) => void;
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

const accents: Record<string, string> = {
  String: '#4caf50',
  Math: '#9c27b0',
  Logical: '#ff9800',
  DateTime: '#03a9f4',
  Conversion: '#8bc34a',
  Scientific: '#e91e63',
  Advanced: '#607d8b',
  Custom: '#795548',
};

const functoidWidth = 56;
const functoidHeight = 26;
const functoidHalfWidth = functoidWidth / 2;
const functoidHalfHeight = functoidHeight / 2;
const minZoom = 0.1;
const maxZoom = 2;

function getDisplayName(name: string): string {
  const displayName = getFunctoidDisplayName(name);
  if (displayName.length <= 4) {
    return displayName;
  }
  return displayName.substring(0, 4);
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
    const functoid = page.functoids.find((item) => item.id === link.sourceId);
    if (functoid) {
      source = {
        x: offsetX + (functoid.x + functoidHalfWidth) * zoom - scrollLeft,
        y: offsetY + functoid.y * zoom - scrollTop,
      };
    }
  } else if (link.sourcePath) {
    const raw = positions.get(`src:${link.sourcePath}`);
    if (raw) {
      source = raw;
    }
  }

  if (link.targetType === 'functoid') {
    const functoid = page.functoids.find((item) => item.id === link.targetId);
    if (functoid) {
      target = {
        x: offsetX + (functoid.x - functoidHalfWidth) * zoom - scrollLeft,
        y: offsetY + functoid.y * zoom - scrollTop,
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
  onSelect,
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
        onClick={(event) => {
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
  dragging,
  inputConnected,
  outputConnected,
  dragTarget,
  setDragTarget,
}: {
  functoid: MapFunctoid;
  selected: boolean;
  zoom: number;
  svgRef: React.RefObject<SVGSVGElement>;
  callbacks: CanvasCallbacks;
  dragging: boolean;
  inputConnected: boolean;
  outputConnected: boolean;
  dragTarget: React.MutableRefObject<DragTarget | null>;
  setDragTarget(target: DragTarget): void;
}): React.ReactElement {
  const clickTimer = useRef<number | null>(null);
  const connectorPointerStarted = useRef<'input' | 'output' | null>(null);

  return (
    <g
      className={`functoid-node${dragging ? ' dragging' : ''}`}
      data-id={functoid.id}
      transform={`translate(${functoid.x * zoom}, ${functoid.y * zoom}) scale(${zoom})`}
      onClick={(event) => {
        event.stopPropagation();
        clickTimer.current = window.setTimeout(() => callbacks.onFunctoidSelect?.(functoid.id), 250);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (clickTimer.current) {
          clearTimeout(clickTimer.current);
          clickTimer.current = null;
        }
        callbacks.onFunctoidDoubleClick?.(functoid.id);
      }}
      onMouseDown={(event) => {
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
          offsetY: (event.clientY - svgRect.top) / zoom - functoid.y,
        };
        dragTarget.current = target;
        setDragTarget(target);
      }}
    >
      <title>{functoid.name}</title>
      <rect
        className="functoid-body"
        x={-functoidHalfWidth}
        y={-functoidHalfHeight}
        width={functoidWidth}
        height={functoidHeight}
        rx={functoidHalfHeight}
        fill="var(--vscode-editor-background, #1e1e1e)"
        stroke={selected ? '#007fd4' : accents[functoid.category] || '#9e9e9e'}
        strokeWidth={selected ? 2 : 1}
      />
      <text textAnchor="middle" dominantBaseline="middle" fill="var(--vscode-foreground, #fff)" fontSize="10">
        {getDisplayName(functoid.name)}
      </text>
      <circle
        cx={-functoidHalfWidth}
        cy="0"
        r="7"
        className={`functoid-connector input-connector${inputConnected ? ' connected' : ''}`}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          connectorPointerStarted.current = 'input';
          const rect = event.currentTarget.getBoundingClientRect();
          callbacks.onLinkPointerDown?.(rect.left + rect.width / 2, rect.top + rect.height / 2);
          callbacks.onFunctoidInputClick?.(functoid.id);
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          event.stopPropagation();
          callbacks.onFunctoidInputPointerUp?.(functoid.id);
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (connectorPointerStarted.current === 'input') {
            connectorPointerStarted.current = null;
            return;
          }
          callbacks.onFunctoidInputClick?.(functoid.id);
        }}
      />
      <circle
        cx={functoidHalfWidth}
        cy="0"
        r="7"
        className={`functoid-connector output-connector${outputConnected ? ' connected' : ''}`}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          connectorPointerStarted.current = 'output';
          const rect = event.currentTarget.getBoundingClientRect();
          callbacks.onLinkPointerDown?.(rect.left + rect.width / 2, rect.top + rect.height / 2);
          callbacks.onFunctoidOutputClick?.(functoid.id);
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          event.stopPropagation();
          callbacks.onFunctoidOutputPointerUp?.(functoid.id);
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (connectorPointerStarted.current === 'output') {
            connectorPointerStarted.current = null;
            return;
          }
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
  onZoomChange,
}: CanvasViewProps): React.ReactElement {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragTarget = useRef<DragTarget | null>(null);
  const [currentDrag, setCurrentDrag] = useState<DragTarget | null>(null);
  const zoomPercent = Math.round(zoom * 100);
  const mappingArea = host.closest('.mapping-area');

  const finishDrag = (): void => {
    const target = dragTarget.current;
    if (!target || !page) {
      return;
    }
    const functoid = page.functoids.find((item) => item.id === target.id);
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
        onMouseMove={(event) => {
          const target = dragTarget.current;
          if (!target || !page || !svgRef.current) {
            return;
          }
          const functoid = page.functoids.find((item) => item.id === target.id);
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
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          host.classList.add('drop-active');
        }}
        onDragLeave={() => host.classList.remove('drop-active')}
        onDrop={(event) => {
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
        {page?.functoids.map((functoid) => (
          <FunctoidNode
            key={functoid.id}
            functoid={functoid}
            selected={state.selectedFunctoid === functoid.id}
            zoom={zoom}
            svgRef={svgRef}
            callbacks={callbacks}
            dragging={currentDrag?.id === functoid.id}
            inputConnected={page.links.some((link) => link.targetType === 'functoid' && link.targetId === functoid.id)}
            outputConnected={page.links.some((link) => link.sourceType === 'functoid' && link.sourceId === functoid.id)}
            dragTarget={dragTarget}
            setDragTarget={(target) => setCurrentDrag(target)}
          />
        ))}
        <text x="8" y="16" fill="#888" fontSize="10">
          {page ? `${page.links.length} link${page.links.length === 1 ? '' : 's'}` : '0 links'}
        </text>
      </svg>
      <div className="canvas-zoom-controls">
        <button type="button" title="Zoom Out" disabled={zoom <= minZoom} onClick={() => onZoomChange(Math.max(minZoom, zoom - 0.1))}>
          −
        </button>
        <span data-zoom={zoomPercent}>{zoomPercent}%</span>
        <button type="button" title="Zoom In" disabled={zoom >= maxZoom} onClick={() => onZoomChange(Math.min(maxZoom, zoom + 0.1))}>
          +
        </button>
        <button type="button" title="Reset Zoom" onClick={() => onZoomChange(1)}>
          1:1
        </button>
      </div>
      {mappingArea &&
        createPortal(
          <svg className="mapping-links-overlay">
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#4fc1ff" />
              </marker>
            </defs>
            {page?.links.map((link) => {
              const points = getLinkPoints(link, positions, page, offsetX, offsetY, host.scrollLeft, host.scrollTop, zoom);
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
  private previewStart: Point | null = null;
  private previewPath: SVGPathElement | null = null;

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

  public beginLinkPreview(clientX: number, clientY: number): void {
    this.clearLinkPreview();
    this.previewStart = this.toMappingAreaPoint(clientX, clientY);
    const overlay = this.closest('.mapping-area')?.querySelector<SVGSVGElement>('.mapping-links-overlay');
    if (!overlay) {
      return;
    }
    this.previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.previewPath.classList.add('mapping-link-preview');
    this.previewPath.setAttribute('fill', 'none');
    this.previewPath.setAttribute('marker-end', 'url(#arrowhead)');
    this.previewPath.style.stroke = 'var(--vscode-charts-blue, #4fc1ff)';
    this.previewPath.style.strokeWidth = '2';
    this.previewPath.style.strokeDasharray = '6 4';
    this.previewPath.style.strokeLinecap = 'round';
    this.previewPath.style.opacity = '0.9';
    overlay.appendChild(this.previewPath);
    this.updateLinkPreview(clientX, clientY);
  }

  public updateLinkPreview(clientX: number, clientY: number): void {
    if (!this.previewStart || !this.previewPath) {
      return;
    }
    const end = this.toMappingAreaPoint(clientX, clientY);
    const controlOffset = Math.max(Math.abs(end.x - this.previewStart.x) * 0.4, 40);
    this.previewPath.setAttribute(
      'd',
      `M ${this.previewStart.x} ${this.previewStart.y} C ${this.previewStart.x + controlOffset} ${this.previewStart.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`
    );
  }

  public clearLinkPreview(): void {
    this.previewPath?.remove();
    this.previewPath = null;
    this.previewStart = null;
  }

  private toMappingAreaPoint(clientX: number, clientY: number): Point {
    const rect = this.closest('.mapping-area')?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
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
        onZoomChange={(zoom) => this.setZoom(zoom)}
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
