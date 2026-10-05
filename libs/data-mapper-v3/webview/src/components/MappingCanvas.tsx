import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getFunctoidBrand, getFunctoidIcon } from './functoidCategoryIcons';
import { getFunctoidShortName } from './functoidDisplayName';
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
  page: MapPage | null;
  zoom: number;
  previewRef: React.RefObject<LinkPreviewHandle>;
  linksOverlayRef: React.RefObject<LinksOverlayHandle>;
  onZoomChange(zoom: number): void;
}

interface DragTarget {
  id: string;
  offsetX: number;
  offsetY: number;
}

interface LinkPreviewHandle {
  show(start: Point, end: Point): void;
  update(end: Point): void;
  clear(): void;
}

interface LinksOverlayHandle {
  redraw(): void;
}

const LinkPreview = forwardRef<LinkPreviewHandle>(function LinkPreview(_props, ref): React.ReactElement | null {
  const [points, setPoints] = useState<{ start: Point; end: Point } | null>(null);

  useImperativeHandle(ref, () => ({
    show(start, end): void {
      setPoints({ start, end });
    },
    update(end): void {
      setPoints((current) => (current ? { ...current, end } : current));
    },
    clear(): void {
      setPoints(null);
    },
  }));

  if (!points) {
    return null;
  }

  const controlOffset = Math.max(Math.abs(points.end.x - points.start.x) * 0.4, 40);
  const path = `M ${points.start.x} ${points.start.y} C ${points.start.x + controlOffset} ${points.start.y}, ${points.end.x - controlOffset} ${points.end.y}, ${points.end.x} ${points.end.y}`;
  return (
    <path
      className="mapping-link-preview"
      d={path}
      fill="none"
      markerEnd="url(#arrowhead)"
      stroke="var(--vscode-charts-blue, #4fc1ff)"
      strokeWidth="2"
      strokeDasharray="6 4"
      strokeLinecap="round"
      opacity="0.9"
    />
  );
});

const functoidWidth = 72;
const functoidHeight = 26;
const iconSize = 18;
const functoidHalfWidth = functoidWidth / 2;
const gridSize = 10;
const snapToGrid = (value: number): number => Math.max(0, Math.round(value / gridSize) * gridSize);
const functoidHalfHeight = functoidHeight / 2;
const minZoom = 0.1;
const maxZoom = 2;

function getLinkPoints(
  link: MapLink,
  positions: Map<string, Point>,
  functoidsById: Map<string, MapFunctoid>,
  offsetX: number,
  offsetY: number,
  scrollLeft: number,
  scrollTop: number,
  zoom: number
): { source: Point; target: Point } | null {
  let source: Point | undefined;
  let target: Point | undefined;

  if (link.sourceType === 'functoid') {
    const functoid = functoidsById.get(link.sourceId);
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
    const functoid = functoidsById.get(link.targetId);
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

const MappingLinksOverlay = forwardRef<
  LinksOverlayHandle,
  {
    host: MappingCanvas;
    mappingArea: Element;
    callbacks: CanvasCallbacks;
    previewRef: React.RefObject<LinkPreviewHandle>;
    selectedLinkId: string | null;
  }
>(function MappingLinksOverlay({ host, mappingArea, callbacks, previewRef, selectedLinkId }, ref): React.ReactElement {
  const [, setRenderVersion] = useState(0);
  const { page, positions, functoidsById, offsetX, offsetY, zoom } = host.getLinkRenderData();

  useImperativeHandle(ref, () => ({
    redraw(): void {
      setRenderVersion((version) => version + 1);
    },
  }));

  return createPortal(
    <svg className="mapping-links-overlay">
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#4fc1ff" />
        </marker>
      </defs>
      <LinkPreview ref={previewRef} />
      {page?.links.map((link) => {
        const points = getLinkPoints(link, positions, functoidsById, offsetX, offsetY, host.scrollLeft, host.scrollTop, zoom);
        return points ? (
          <LinkPath
            key={link.id}
            link={link}
            from={points.source}
            to={points.target}
            selected={selectedLinkId === link.id}
            onSelect={() => callbacks.onLinkSelect?.(link.id)}
          />
        ) : null;
      })}
    </svg>,
    mappingArea
  );
});

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
  const FunctoidIcon = getFunctoidIcon(functoid.name, functoid.category);
  const brand = getFunctoidBrand(functoid.category);

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
        x={-functoidHalfWidth}
        y={-functoidHalfHeight}
        width={functoidWidth}
        height={functoidHeight}
        rx={functoidHalfHeight}
        fill="var(--vscode-editor-background, #1e1e1e)"
      />
      <rect
        className="functoid-body"
        x={-functoidHalfWidth}
        y={-functoidHalfHeight}
        width={functoidWidth}
        height={functoidHeight}
        rx={functoidHalfHeight}
        fill={brand.color}
        fillOpacity={0.2}
        stroke={selected ? '#007fd4' : brand.color}
        strokeWidth={selected ? 2 : 1}
      />
      <foreignObject x={-functoidHalfWidth + 9} y={-iconSize / 2} width={iconSize} height={iconSize} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            width: iconSize,
            height: iconSize,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            backgroundColor: brand.color,
            color: brand.iconColor,
          }}
        >
          <FunctoidIcon />
        </div>
      </foreignObject>
      <text x={-functoidHalfWidth + 32} textAnchor="start" dominantBaseline="middle" fill="var(--vscode-foreground, #fff)" fontSize="10">
        {getFunctoidShortName(functoid.name)}
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
  page,
  zoom,
  previewRef,
  linksOverlayRef,
  onZoomChange,
}: CanvasViewProps): React.ReactElement {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragTarget = useRef<DragTarget | null>(null);
  const [currentDrag, setCurrentDrag] = useState<DragTarget | null>(null);
  const zoomPercent = Math.round(zoom * 100);
  const mappingArea = host.closest('.mapping-area');
  const connectedFunctoidInputs = new Set<string>();
  const connectedFunctoidOutputs = new Set<string>();
  for (const link of page?.links ?? []) {
    if (link.sourceType === 'functoid') {
      connectedFunctoidOutputs.add(link.sourceId);
    }
    if (link.targetType === 'functoid') {
      connectedFunctoidInputs.add(link.targetId);
    }
  }

  const finishDrag = (): void => {
    const target = dragTarget.current;
    if (!target || !page) {
      return;
    }
    const functoid = host.getFunctoid(target.id);
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
          const functoid = host.getFunctoid(target.id);
          if (!functoid) {
            return;
          }
          const rect = svgRef.current.getBoundingClientRect();
          functoid.x = snapToGrid((event.clientX - rect.left) / zoom - target.offsetX);
          functoid.y = snapToGrid((event.clientY - rect.top) / zoom - target.offsetY);
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
            inputConnected={connectedFunctoidInputs.has(functoid.id)}
            outputConnected={connectedFunctoidOutputs.has(functoid.id)}
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
      {mappingArea && (
        <MappingLinksOverlay
          ref={linksOverlayRef}
          host={host}
          mappingArea={mappingArea}
          callbacks={callbacks}
          previewRef={previewRef}
          selectedLinkId={state.selectedLink}
        />
      )}
    </>
  );
}

export class MappingCanvas extends HTMLElement {
  private reactRoot: Root | null = null;
  private state: MapperViewState | null = null;
  private callbacks: CanvasCallbacks = {};
  private positions = new Map<string, Point>();
  private functoidsById = new Map<string, MapFunctoid>();
  private page: MapPage | null = null;
  private offsetX = 0;
  private offsetY = 0;
  private zoom = 1;
  private scrollFrame: number | null = null;
  private readonly previewRef = React.createRef<LinkPreviewHandle>();
  private readonly linksOverlayRef = React.createRef<LinksOverlayHandle>();

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
    if (this.scrollFrame !== null) {
      cancelAnimationFrame(this.scrollFrame);
      this.scrollFrame = null;
    }
    this.reactRoot?.unmount();
    this.reactRoot = null;
  }

  public updateState(state: MapperViewState): void {
    this.state = state;
    this.renderReact();
  }

  public renderWithPositions(positions: Map<string, Point>, page: MapPage | null, renderFullCanvas = true): void {
    this.positions = new Map(positions);
    this.page = page;
    this.functoidsById = new Map(page?.functoids.map((functoid) => [functoid.id, functoid]) ?? []);

    const mappingArea = this.closest('.mapping-area');
    const canvasRect = this.getBoundingClientRect();
    const areaRect = mappingArea?.getBoundingClientRect();
    this.offsetX = areaRect ? canvasRect.left - areaRect.left : 0;
    this.offsetY = areaRect ? canvasRect.top - areaRect.top : 0;
    if (!renderFullCanvas && this.linksOverlayRef.current) {
      this.linksOverlayRef.current.redraw();
    } else {
      this.renderReact();
    }
  }

  public getLinkRenderData(): {
    page: MapPage | null;
    positions: Map<string, Point>;
    functoidsById: Map<string, MapFunctoid>;
    offsetX: number;
    offsetY: number;
    zoom: number;
  } {
    return {
      page: this.page,
      positions: this.positions,
      functoidsById: this.functoidsById,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      zoom: this.zoom,
    };
  }

  public getFunctoid(id: string): MapFunctoid | undefined {
    return this.functoidsById.get(id);
  }

  public setZoom(zoom: number): void {
    this.zoom = Math.min(maxZoom, Math.max(minZoom, zoom));
    this.renderReact();
  }

  public beginLinkPreview(clientX: number, clientY: number): void {
    const start = this.toMappingAreaPoint(clientX, clientY);
    this.previewRef.current?.show(start, start);
  }

  public updateLinkPreview(clientX: number, clientY: number): void {
    this.previewRef.current?.update(this.toMappingAreaPoint(clientX, clientY));
  }

  public clearLinkPreview(): void {
    this.previewRef.current?.clear();
  }

  private toMappingAreaPoint(clientX: number, clientY: number): Point {
    const rect = this.closest('.mapping-area')?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  }

  private readonly handleScroll = (): void => {
    if (this.scrollFrame !== null) {
      return;
    }
    this.scrollFrame = requestAnimationFrame(() => {
      this.scrollFrame = null;
      this.linksOverlayRef.current?.redraw();
    });
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
        page={this.page}
        zoom={this.zoom}
        previewRef={this.previewRef}
        linksOverlayRef={this.linksOverlayRef}
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
