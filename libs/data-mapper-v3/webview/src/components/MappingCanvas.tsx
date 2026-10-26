import {
  Button,
  FluentProvider,
  Menu,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
  ToggleButton,
  makeStyles,
} from '@fluentui/react-components';
import { ArrowRouting20Regular, Code20Regular, Color20Regular, Eye20Regular, Target20Regular } from '@fluentui/react-icons';
import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getFunctoidBrand, getFunctoidIcon } from './functoidCategoryIcons';
import { getFunctoidShortName } from './functoidDisplayName';
import { layoutFunctoids } from './functoidAutoLayout';
import { createPortal } from 'react-dom';
import type { MapFunctoid, MapLink, MapPage } from '../../../src/model/mapModel';
import type { MapperViewState } from '../../../src/protocol/mapEditorProtocol';
import { getVsCodeFluentTheme } from '../fluentTheme';

export interface CanvasCallbacks {
  onLinkViewChange?: (view: NonNullable<MapperViewState['linkView']>) => void;
  onAreaSelect?: (linkIds: string[], functoidIds: string[], additive: boolean) => void;
  onLinkSelect?: (linkId: string, additive?: boolean) => void;
  onLinkDoubleClick?: (linkId: string) => void;
  onLinkRetarget?: (linkId: string, end: 'source' | 'target', clientX: number, clientY: number) => void;
  onFunctoidSelect?: (functoidId: string, additive?: boolean) => void;
  onFunctoidDoubleClick?: (functoidId: string) => void;
  onFunctoidDrop?: (functoid: unknown, x: number, y: number) => void;
  onFunctoidMove?: (functoidId: string, x: number, y: number) => void;
  onFunctoidsMove?: (moves: { id: string; x: number; y: number }[]) => void;
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
  clientX: number;
  clientY: number;
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
const canvasEdgePadding = 24;
const dotRadius = 8;
const panThreshold = 3;
const dragHoldMs = 250;
const dragHoldTolerance = 4;
const edgeScrollMargin = 40;
const edgeScrollStep = 24;
const minZoom = 0.1;
const maxZoom = 2;
const defaultLinkView: NonNullable<MapperViewState['linkView']> = {
  scope: 'all',
  colorPartial: true,
  trace: false,
  autoReveal: true,
  compiler: false,
};
const useCanvasStyles = makeStyles({
  tools: {
    position: 'absolute',
    top: '4px',
    left: '4px',
    width: 'fit-content',
    maxWidth: 'calc(100% - 8px)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2px',
    zIndex: 12,
    backgroundColor: 'var(--vscode-editor-background)',
    borderRadius: '4px',
  },
});

function endpointVisible(host: MappingCanvas, link: MapLink, end: 'source' | 'target', point: Point): boolean {
  const { offsetX, offsetY } = host.getLinkRenderData();
  if (link[`${end}Type`] === 'functoid') {
    return point.x >= offsetX && point.x <= offsetX + host.clientWidth && point.y >= offsetY && point.y <= offsetY + host.clientHeight;
  }
  const side = end === 'source' ? 'source' : 'target';
  const path = link[`${end}Path`];
  const tree = host.closest('.mapping-area')?.querySelector<HTMLElement>(`.${side}-tree biztalk-schema-tree`);
  const row = tree && Array.from(tree.querySelectorAll<HTMLElement>('.tree-node[data-path]')).find((node) => node.dataset.path === path);
  const connector = row?.querySelector<HTMLElement>('.node-connector');
  if (!tree || !row || !connector || connector.getClientRects().length === 0) {
    return false;
  }
  const bounds = connector.getBoundingClientRect();
  const center = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
  const treeBounds = tree.getBoundingClientRect();
  const headerBottom = tree.querySelector('.schema-sticky')?.getBoundingClientRect().bottom ?? treeBounds.top;
  if (center.y < headerBottom) {
    return false;
  }
  for (let ancestor: HTMLElement | null = connector; ancestor; ancestor = ancestor.parentElement) {
    const style = getComputedStyle(ancestor);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
      return false;
    }
    const rect = ancestor.getBoundingClientRect();
    const clipsX = /auto|scroll|hidden|clip/.test(style.overflowX);
    const clipsY = /auto|scroll|hidden|clip/.test(style.overflowY);
    if (
      (clipsX && (center.x < rect.left + ancestor.clientLeft || center.x > rect.left + ancestor.clientLeft + ancestor.clientWidth)) ||
      (clipsY && (center.y < rect.top + ancestor.clientTop || center.y > rect.top + ancestor.clientTop + ancestor.clientHeight))
    ) {
      return false;
    }
  }
  return true;
}

function linkPresentation(
  host: MappingCanvas,
  link: MapLink,
  points: { source: Point; target: Point },
  scope: NonNullable<MapperViewState['linkView']>['scope']
): { visible: boolean; partial: boolean } {
  const source = endpointVisible(host, link, 'source', points.source);
  const target = endpointVisible(host, link, 'target', points.target);
  return { visible: scope === 'all' || (scope === 'partial' ? source || target : source && target), partial: !source || !target };
}

function linkTooltip(link: MapLink, functoids: Map<string, MapFunctoid>): string {
  const source =
    link.sourceType === 'functoid'
      ? `${functoids.get(link.sourceId)?.name ?? 'Functoid'} (${link.sourceId})`
      : link.sourcePath || link.sourceId;
  const target =
    link.targetType === 'functoid'
      ? `${functoids.get(link.targetId)?.name ?? 'Functoid'} (${link.targetId})`
      : link.targetPath || link.targetId;
  return `${link.label ? `${link.label}\n` : ''}Source: ${source}\nTarget: ${target}`;
}

function curveIntersectsRect(source: Point, target: Point, rect: ClipRect): boolean {
  const control = Math.max(Math.abs(target.x - source.x) * 0.4, 40);
  let previous = source;
  const steps = Math.max(32, Math.ceil((Math.abs(target.x - source.x) + Math.abs(target.y - source.y) + control * 2) / 4));
  for (let index = 1; index <= steps; index++) {
    const amount = index / steps;
    const inverse = 1 - amount;
    const point = {
      x:
        inverse ** 3 * source.x +
        3 * inverse ** 2 * amount * (source.x + control) +
        3 * inverse * amount ** 2 * (target.x - control) +
        amount ** 3 * target.x,
      y: inverse ** 3 * source.y + 3 * inverse ** 2 * amount * source.y + 3 * inverse * amount ** 2 * target.y + amount ** 3 * target.y,
    };
    let minimum = 0;
    let maximum = 1;
    for (const axis of ['x', 'y'] as const) {
      const delta = point[axis] - previous[axis];
      const low = rect[axis];
      const high = low + (axis === 'x' ? rect.width : rect.height);
      if (delta === 0) {
        if (previous[axis] < low || previous[axis] > high) {
          maximum = -1;
        }
      } else {
        const first = (low - previous[axis]) / delta;
        const last = (high - previous[axis]) / delta;
        minimum = Math.max(minimum, Math.min(first, last));
        maximum = Math.min(maximum, Math.max(first, last));
      }
    }
    if (minimum <= maximum) {
      return true;
    }
    previous = point;
  }
  return false;
}

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

interface ClipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function LinkPath({
  link,
  from,
  to,
  clip,
  selected,
  highlighted,
  partial,
  tooltip,
  onSelect,
  onDoubleClick,
  onRetarget,
}: {
  link: MapLink;
  from: Point;
  to: Point;
  clip: ClipRect;
  selected: boolean;
  highlighted: boolean;
  partial: boolean;
  tooltip: string;
  onSelect(additive?: boolean): void;
  onDoubleClick(): void;
  onRetarget(end: 'source' | 'target', clientX: number, clientY: number): void;
}): React.ReactElement {
  const dx = Math.abs(to.x - from.x);
  const controlOffset = Math.max(dx * 0.4, 40);
  const path = `M ${from.x} ${from.y} C ${from.x + controlOffset} ${from.y}, ${to.x - controlOffset} ${to.y}, ${to.x} ${to.y}`;
  const [hovered, setHovered] = useState(false);
  const clipId = `mapping-link-clip-${link.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  return (
    <g
      data-link-id={link.id}
      clipPath={`url(#${clipId})`}
      role="button"
      tabIndex={0}
      aria-label={`Link properties: ${tooltip}`}
      aria-pressed={selected}
      style={{ outline: 'none' }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          onDoubleClick();
        } else if (event.key.toLowerCase() === 's') {
          event.preventDefault();
          event.stopPropagation();
          onSelect(event.ctrlKey || event.metaKey || event.shiftKey);
        }
      }}
    >
      <title>{tooltip}</title>
      <clipPath id={clipId}>
        <rect x={clip.x} y={clip.y} width={clip.width} height={clip.height} />
      </clipPath>
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth="14"
        onClick={(event) => {
          event.stopPropagation();
          onSelect(event.ctrlKey || event.metaKey || event.shiftKey);
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onDoubleClick();
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ pointerEvents: 'stroke' }}
      />
      <path
        className="mapping-link"
        d={path}
        fill="none"
        stroke={
          selected
            ? '#007fd4'
            : highlighted
              ? 'var(--vscode-charts-yellow, #cca700)'
              : partial
                ? 'var(--vscode-descriptionForeground, #999)'
                : '#4fc1ff'
        }
        strokeWidth={selected || hovered || highlighted ? 3 : 2}
        strokeLinecap="round"
        opacity={selected || hovered || highlighted ? 1 : partial ? 0.4 : 0.75}
        markerEnd="url(#arrowhead)"
      />
      {(['source', 'target'] as const).map((end) => {
        const point = end === 'source' ? from : to;
        return (
          <circle
            key={end}
            data-link-end={end}
            cx={point.x}
            cy={point.y}
            r={selected ? 6 : 4}
            fill={end === 'source' ? '#89d185' : '#cca700'}
            stroke={selected ? 'var(--vscode-foreground, #ccc)' : 'none'}
            strokeWidth="1"
            style={{ pointerEvents: selected ? 'all' : 'none', cursor: 'grab' }}
            onPointerDown={(event) => {
              if (!selected || event.button !== 0) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              const bounds = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
              const fixed = end === 'source' ? to : from;
              onRetarget(end, bounds.left + fixed.x, bounds.top + fixed.y);
            }}
          >
            <title>{`Change link ${end}`}</title>
          </circle>
        );
      })}
      {link.label && (
        <text
          x={(from.x + to.x) / 2}
          y={(from.y + to.y) / 2 - 6}
          textAnchor="middle"
          fontSize="12"
          fill="var(--vscode-foreground, #ccc)"
          stroke="var(--vscode-editor-background, #1e1e1e)"
          strokeWidth="4"
          paintOrder="stroke"
          pointerEvents="none"
        >
          {link.label}
        </text>
      )}
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
    selectedLinkIds?: string[];
    state: MapperViewState;
  }
>(function MappingLinksOverlay(
  { host, mappingArea, callbacks, previewRef, selectedLinkId, selectedLinkIds, state },
  ref
): React.ReactElement {
  const [, setRenderVersion] = useState(0);
  const { page, positions, functoidsById, offsetX, offsetY, zoom } = host.getLinkRenderData();
  const view = state.linkView ?? defaultLinkView;

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
        if (!points) {
          return null;
        }
        const presentation = linkPresentation(host, link, points, view.scope);
        if (!presentation.visible) {
          return null;
        }
        // Links stay inside the drawing canvas; only a schema-node end may reach out to its own tree connector.
        const clipLeft = link.sourceType === 'schemaNode' ? Math.min(offsetX, points.source.x - dotRadius) : offsetX;
        const clipRight =
          link.targetType === 'schemaNode' ? Math.max(offsetX + host.clientWidth, points.target.x + dotRadius) : offsetX + host.clientWidth;
        return (
          <LinkPath
            key={link.id}
            link={link}
            from={points.source}
            to={points.target}
            clip={{ x: clipLeft, y: offsetY, width: clipRight - clipLeft, height: host.clientHeight }}
            selected={selectedLinkIds ? selectedLinkIds.includes(link.id) : selectedLinkId === link.id}
            highlighted={state.highlightedLinks?.includes(link.id) ?? false}
            partial={view.colorPartial && presentation.partial}
            tooltip={linkTooltip(link, functoidsById)}
            onSelect={(additive) => callbacks.onLinkSelect?.(link.id, additive)}
            onDoubleClick={() => callbacks.onLinkDoubleClick?.(link.id)}
            onRetarget={(end, clientX, clientY) => callbacks.onLinkRetarget?.(link.id, end, clientX, clientY)}
          />
        );
      })}
      {view.compiler &&
        state.compilerLinks?.map((link) => {
          const source = positions.get(`src:${link.sourcePath}`);
          const target = positions.get(`tgt:${link.targetPath}`);
          if (!source || !target) {
            return null;
          }
          const diagnostic: MapLink = {
            ...link,
            sourceId: link.sourcePath,
            targetId: link.targetPath,
            sourceType: 'schemaNode',
            targetType: 'schemaNode',
          };
          if (!linkPresentation(host, diagnostic, { source, target }, view.scope).visible) {
            return null;
          }
          const control = Math.max(Math.abs(target.x - source.x) * 0.4, 40);
          const clipLeft = Math.min(offsetX, source.x - dotRadius);
          const clipRight = Math.max(offsetX + host.clientWidth, target.x + dotRadius);
          const clipId = `compiler-clip-${link.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          return (
            <g key={link.id} pointerEvents="none" aria-hidden="true" clipPath={`url(#${clipId})`}>
              <clipPath id={clipId}>
                <rect x={clipLeft} y={offsetY} width={clipRight - clipLeft} height={host.clientHeight} />
              </clipPath>
              <path
                d={`M ${source.x} ${source.y} C ${source.x + control} ${source.y}, ${target.x - control} ${target.y}, ${target.x} ${target.y}`}
                fill="none"
                stroke="var(--vscode-charts-orange, #d18616)"
                strokeWidth="2"
                strokeDasharray="3 5"
                opacity="0.8"
              />
            </g>
          );
        })}
    </svg>,
    mappingArea
  );
});

function FunctoidNode({
  functoid,
  selected,
  highlighted,
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
  highlighted: boolean;
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
  const cancelHold = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelHold.current?.(), []);
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
        const additive = event.ctrlKey || event.metaKey || event.shiftKey;
        clickTimer.current = window.setTimeout(() => callbacks.onFunctoidSelect?.(functoid.id, additive), 250);
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
          clientX: event.clientX,
          clientY: event.clientY,
        };
        // Like a button: a plain click selects, and only a press held for a moment starts a drag.
        cancelHold.current?.();
        const onMove = (moveEvent: MouseEvent): void => {
          if (Math.hypot(moveEvent.clientX - target.clientX, moveEvent.clientY - target.clientY) > dragHoldTolerance) {
            stopHold();
          }
        };
        const holdTimer = window.setTimeout(() => {
          stopHold();
          dragTarget.current = target;
          setDragTarget(target);
        }, dragHoldMs);
        function stopHold(): void {
          window.clearTimeout(holdTimer);
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', stopHold);
          cancelHold.current = null;
        }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', stopHold);
        cancelHold.current = stopHold;
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
        stroke={selected ? '#007fd4' : highlighted ? 'var(--vscode-charts-yellow, #cca700)' : brand.color}
        strokeWidth={selected || highlighted ? 2 : 1}
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
  const styles = useCanvasStyles();
  const linkView = state.linkView ?? defaultLinkView;
  const changeLinkView = (change: Partial<NonNullable<MapperViewState['linkView']>>): void =>
    callbacks.onLinkViewChange?.({ ...linkView, ...change });
  const svgRef = useRef<SVGSVGElement>(null);
  const dragTarget = useRef<DragTarget | null>(null);
  const [currentDrag, setCurrentDrag] = useState<DragTarget | null>(null);
  const lastPointer = useRef<Point | null>(null);
  const panState = useRef<{ clientX: number; clientY: number; scrollLeft: number; scrollTop: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const spacePressed = useRef(false);
  const areaDrag = useRef<{ start: Point; end: Point; additive: boolean; pointerId: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<ClipRect | null>(null);
  const extraRoom = useRef({ page: page?.id ?? null, x: 0, y: 0 });
  const pendingScroll = useRef<{ left: number; top: number } | null>(null);
  const [, setRoomVersion] = useState(0);
  if (extraRoom.current.page !== (page?.id ?? null)) {
    extraRoom.current = { page: page?.id ?? null, x: 0, y: 0 };
  }
  const zoomPercent = Math.round(zoom * 100);
  const hasFunctoids = (page?.functoids.length ?? 0) > 0;
  const contentWidth =
    Math.max(0, ...(page?.functoids ?? []).map((functoid) => (functoid.x + functoidHalfWidth) * zoom)) +
    canvasEdgePadding +
    extraRoom.current.x;
  const contentHeight =
    Math.max(0, ...(page?.functoids ?? []).map((functoid) => (functoid.y + functoidHalfHeight) * zoom)) +
    canvasEdgePadding +
    extraRoom.current.y;

  useLayoutEffect(() => {
    const pending = pendingScroll.current;
    if (!pending) {
      return;
    }
    pendingScroll.current = null;
    host.scrollLeft = pending.left;
    host.scrollTop = pending.top;
  });
  const mappingArea = host.closest('.mapping-area');
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (
        event.code === 'Space' &&
        !target?.closest('input, textarea, select, button, [contenteditable="true"], [role="button"], [role="menuitemradio"]')
      ) {
        spacePressed.current = event.type === 'keydown';
        if (spacePressed.current && host.contains(target)) {
          event.preventDefault();
        }
      }
      if (event.key === 'Escape') {
        const drag = areaDrag.current;
        areaDrag.current = null;
        setSelectionRect(null);
        if (drag && svgRef.current?.hasPointerCapture(drag.pointerId)) {
          svgRef.current.releasePointerCapture(drag.pointerId);
        }
      }
    };
    const onBlur = (): void => {
      spacePressed.current = false;
      areaDrag.current = null;
      panState.current = null;
      host.classList.remove('panning');
      setSelectionRect(null);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', onBlur);
    };
  }, [host]);
  const areaPoint = (clientX: number, clientY: number): Point => {
    const bounds = host.getBoundingClientRect();
    const { offsetX, offsetY } = host.getLinkRenderData();
    return {
      x: offsetX + Math.max(0, Math.min(host.clientWidth, clientX - bounds.left)),
      y: offsetY + Math.max(0, Math.min(host.clientHeight, clientY - bounds.top)),
    };
  };
  const dragRect = (start: Point, end: Point): ClipRect => ({
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  });
  const cancelPointer = (): void => {
    areaDrag.current = null;
    panState.current = null;
    host.classList.remove('panning');
    setSelectionRect(null);
  };
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

  // Keeps the dragged functoid inside the visible canvas; the viewport scrolls instead of letting the node leave it.
  const moveDrag = (): void => {
    const target = dragTarget.current;
    const svg = svgRef.current;
    const pointer = lastPointer.current;
    const functoid = target ? host.getFunctoid(target.id) : undefined;
    if (!target || !svg || !pointer || !functoid) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    const minX = Math.max(functoidHalfWidth, host.scrollLeft / zoom + functoidHalfWidth);
    const maxX = Math.max(minX, (host.scrollLeft + host.clientWidth) / zoom - functoidHalfWidth);
    const minY = Math.max(functoidHalfHeight, host.scrollTop / zoom + functoidHalfHeight);
    const maxY = Math.max(minY, (host.scrollTop + host.clientHeight) / zoom - functoidHalfHeight);
    functoid.x = snapToGrid(Math.min(maxX, Math.max(minX, (pointer.x - rect.left) / zoom - target.offsetX)));
    functoid.y = snapToGrid(Math.min(maxY, Math.max(minY, (pointer.y - rect.top) / zoom - target.offsetY)));
    setCurrentDrag({ ...target });
  };

  // Re-lays out the page's functoids in the visible viewport without overlaps so every link can be seen.
  const fitToView = (): void => {
    const functoids = page?.functoids ?? [];
    if (!page || functoids.length === 0) {
      return;
    }
    const { positions, offsetY } = host.getLinkRenderData();
    const layout = layoutFunctoids({
      functoids,
      links: page.links,
      positions,
      offsetY,
      scrollLeft: host.scrollLeft,
      scrollTop: host.scrollTop,
      layoutLeft: 0,
      layoutTop: 0,
      zoom,
      viewportWidth: host.clientWidth,
      viewportHeight: host.clientHeight,
      functoidWidth,
      functoidHeight,
      gridSize,
      padding: canvasEdgePadding,
      snap: snapToGrid,
    });
    const moves = functoids.map((functoid) => {
      const next = layout.get(functoid.id)!;
      functoid.x = next.x;
      functoid.y = next.y;
      return { id: functoid.id, x: next.x, y: next.y };
    });
    extraRoom.current = { page: page.id, x: 0, y: 0 };
    pendingScroll.current = { left: 0, top: 0 };
    callbacks.onFunctoidsMove?.(moves);
    setRoomVersion((version) => version + 1);
    linksOverlayRef.current?.redraw();
  };

  const dragHandlers = useRef({ moveDrag, finishDrag });
  dragHandlers.current = { moveDrag, finishDrag };
  const draggingId = currentDrag?.id ?? null;

  useEffect(() => {
    if (!draggingId) {
      return;
    }
    const onMove = (event: MouseEvent): void => {
      lastPointer.current = { x: event.clientX, y: event.clientY };
      dragHandlers.current.moveDrag();
    };
    const onUp = (): void => dragHandlers.current.finishDrag();
    const autoScroll = window.setInterval(() => {
      const pointer = lastPointer.current;
      if (!pointer) {
        return;
      }
      const hostRect = host.getBoundingClientRect();
      const stepX =
        pointer.x > hostRect.right - edgeScrollMargin ? edgeScrollStep : pointer.x < hostRect.left + edgeScrollMargin ? -edgeScrollStep : 0;
      const stepY =
        pointer.y > hostRect.bottom - edgeScrollMargin ? edgeScrollStep : pointer.y < hostRect.top + edgeScrollMargin ? -edgeScrollStep : 0;
      if (stepX === 0 && stepY === 0) {
        return;
      }
      const before = { left: host.scrollLeft, top: host.scrollTop };
      host.scrollLeft += stepX;
      host.scrollTop += stepY;
      // Already at the end of the canvas: grow it so the node can keep moving right/down.
      const growX = stepX > 0 && host.scrollLeft === before.left ? stepX : 0;
      const growY = stepY > 0 && host.scrollTop === before.top ? stepY : 0;
      if (growX > 0 || growY > 0) {
        extraRoom.current.x += growX;
        extraRoom.current.y += growY;
        pendingScroll.current = { left: before.left + growX, top: before.top + growY };
        setRoomVersion((version) => version + 1);
      } else if (host.scrollLeft !== before.left || host.scrollTop !== before.top) {
        dragHandlers.current.moveDrag();
      }
    }, 40);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.clearInterval(autoScroll);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [draggingId, host]);

  return (
    <>
      <svg
        ref={svgRef}
        tabIndex={0}
        aria-label="Mapping canvas"
        className="mapping-svg"
        width={`${Math.max(100, zoomPercent)}%`}
        height={`${Math.max(100, zoomPercent)}%`}
        style={{ minWidth: contentWidth, minHeight: contentHeight }}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          callbacks.onDeselect?.();
        }}
        onPointerDown={(event) => {
          const target = event.target as Element;
          if ((event.button !== 0 && event.button !== 1) || target.closest('.functoid-node')) {
            return;
          }
          event.preventDefault();
          svgRef.current?.focus({ preventScroll: true });
          if (event.button === 0 && !spacePressed.current && !event.altKey) {
            const start = areaPoint(event.clientX, event.clientY);
            areaDrag.current = {
              start,
              end: start,
              additive: event.ctrlKey || event.metaKey || event.shiftKey,
              pointerId: event.pointerId,
            };
            svgRef.current?.setPointerCapture(event.pointerId);
            return;
          }
          panState.current = {
            clientX: event.clientX,
            clientY: event.clientY,
            scrollLeft: host.scrollLeft,
            scrollTop: host.scrollTop,
            moved: false,
          };
          svgRef.current?.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = areaDrag.current;
          if (drag) {
            drag.end = areaPoint(event.clientX, event.clientY);
            if (Math.hypot(drag.end.x - drag.start.x, drag.end.y - drag.start.y) >= panThreshold) {
              setSelectionRect(dragRect(drag.start, drag.end));
            }
            return;
          }
          const pan = panState.current;
          if (!pan) {
            return;
          }
          const deltaX = event.clientX - pan.clientX;
          const deltaY = event.clientY - pan.clientY;
          if (!pan.moved) {
            if (Math.abs(deltaX) < panThreshold && Math.abs(deltaY) < panThreshold) {
              return;
            }
            pan.moved = true;
            host.classList.add('panning');
          }
          const desiredLeft = Math.max(0, pan.scrollLeft - deltaX);
          const desiredTop = Math.max(0, pan.scrollTop - deltaY);
          const overflowX = Math.max(0, desiredLeft - (host.scrollWidth - host.clientWidth));
          const overflowY = Math.max(0, desiredTop - (host.scrollHeight - host.clientHeight));
          if (overflowX > 0 || overflowY > 0) {
            // Panning past the current edge grows the canvas so there is always room to keep moving.
            extraRoom.current.x += overflowX;
            extraRoom.current.y += overflowY;
            pendingScroll.current = { left: desiredLeft, top: desiredTop };
            setRoomVersion((version) => version + 1);
          } else {
            host.scrollLeft = desiredLeft;
            host.scrollTop = desiredTop;
          }
        }}
        onPointerUp={(event) => {
          const drag = areaDrag.current;
          if (drag) {
            const end = areaPoint(event.clientX, event.clientY);
            if (Math.hypot(end.x - drag.start.x, end.y - drag.start.y) >= panThreshold) {
              const rect = dragRect(drag.start, end);
              const { positions, functoidsById, offsetX, offsetY } = host.getLinkRenderData();
              const linkIds = (page?.links ?? [])
                .filter((link) => {
                  const points = getLinkPoints(link, positions, functoidsById, offsetX, offsetY, host.scrollLeft, host.scrollTop, zoom);
                  return (
                    points &&
                    linkPresentation(host, link, points, linkView.scope).visible &&
                    curveIntersectsRect(points.source, points.target, rect)
                  );
                })
                .map((link) => link.id);
              const functoidIds = (page?.functoids ?? [])
                .filter((functoid) => {
                  const centerX = offsetX + functoid.x * zoom - host.scrollLeft;
                  const centerY = offsetY + functoid.y * zoom - host.scrollTop;
                  return (
                    centerX + functoidHalfWidth * zoom >= rect.x &&
                    centerX - functoidHalfWidth * zoom <= rect.x + rect.width &&
                    centerY + functoidHalfHeight * zoom >= rect.y &&
                    centerY - functoidHalfHeight * zoom <= rect.y + rect.height
                  );
                })
                .map((functoid) => functoid.id);
              suppressClick.current = true;
              window.setTimeout(() => {
                suppressClick.current = false;
              }, 0);
              callbacks.onAreaSelect?.(linkIds, functoidIds, drag.additive);
            }
            areaDrag.current = null;
            setSelectionRect(null);
            if (svgRef.current?.hasPointerCapture(event.pointerId)) {
              svgRef.current.releasePointerCapture(event.pointerId);
            }
            return;
          }
          const pan = panState.current;
          if (!pan) {
            return;
          }
          panState.current = null;
          host.classList.remove('panning');
          if (svgRef.current?.hasPointerCapture(event.pointerId)) {
            svgRef.current.releasePointerCapture(event.pointerId);
          }
          if (pan.moved) {
            suppressClick.current = true;
            window.setTimeout(() => {
              suppressClick.current = false;
            }, 0);
          }
        }}
        onPointerCancel={cancelPointer}
        onLostPointerCapture={cancelPointer}
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
            selected={state.selectedFunctoids ? state.selectedFunctoids.includes(functoid.id) : state.selectedFunctoid === functoid.id}
            highlighted={state.highlightedFunctoids?.includes(functoid.id) ?? false}
            zoom={zoom}
            svgRef={svgRef}
            callbacks={callbacks}
            dragging={currentDrag?.id === functoid.id}
            inputConnected={connectedFunctoidInputs.has(functoid.id)}
            outputConnected={connectedFunctoidOutputs.has(functoid.id)}
            dragTarget={dragTarget}
            setDragTarget={(target) => {
              lastPointer.current = { x: target.clientX, y: target.clientY };
              setCurrentDrag(target);
            }}
          />
        ))}
        {selectionRect && (
          <rect
            x={selectionRect.x - host.getLinkRenderData().offsetX + host.scrollLeft}
            y={selectionRect.y - host.getLinkRenderData().offsetY + host.scrollTop}
            width={selectionRect.width}
            height={selectionRect.height}
            fill="var(--vscode-editor-selectionBackground, #264f78)"
            fillOpacity="0.25"
            stroke="var(--vscode-focusBorder, #007fd4)"
            strokeDasharray="4 3"
            pointerEvents="none"
          />
        )}
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
        <button type="button" title="Rearrange functoids in the current view without overlaps" disabled={!hasFunctoids} onClick={fitToView}>
          Fit
        </button>
      </div>
      {mappingArea &&
        createPortal(
          <FluentProvider
            theme={getVsCodeFluentTheme()}
            className={styles.tools}
            style={{
              left: host.getLinkRenderData().offsetX + 4,
              top: host.getLinkRenderData().offsetY + 40,
              maxWidth: Math.max(0, host.clientWidth - 8),
            }}
          >
            <Menu
              checkedValues={{ scope: [linkView.scope] }}
              onCheckedValueChange={(_event, data) => {
                const scope = data.checkedItems[0];
                if (scope === 'all' || scope === 'partial' || scope === 'complete') {
                  changeLinkView({ scope });
                }
              }}
            >
              <MenuTrigger disableButtonEnhancement>
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<Eye20Regular />}
                  title="Link viewport scope"
                >{`Links: ${linkView.scope}`}</Button>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItemRadio name="scope" value="all">
                    All links
                  </MenuItemRadio>
                  <MenuItemRadio name="scope" value="partial">
                    At least one endpoint visible
                  </MenuItemRadio>
                  <MenuItemRadio name="scope" value="complete">
                    Both endpoints visible
                  </MenuItemRadio>
                </MenuList>
              </MenuPopover>
            </Menu>
            <ToggleButton
              size="small"
              appearance="subtle"
              icon={<Color20Regular />}
              checked={linkView.colorPartial}
              aria-label="Dim partial links"
              title="Dim and recolor links with hidden endpoints"
              onClick={() => changeLinkView({ colorPartial: !linkView.colorPartial })}
            />
            <ToggleButton
              size="small"
              appearance="subtle"
              icon={<ArrowRouting20Regular />}
              checked={linkView.trace}
              aria-label="Trace selection"
              title="Trace connected paths from selection"
              onClick={() => changeLinkView({ trace: !linkView.trace })}
            />
            <ToggleButton
              size="small"
              appearance="subtle"
              icon={<Target20Regular />}
              checked={linkView.autoReveal}
              aria-label="Auto-reveal selection"
              title="Automatically reveal selected schema endpoints"
              onClick={() => changeLinkView({ autoReveal: !linkView.autoReveal })}
            />
            <ToggleButton
              size="small"
              appearance="subtle"
              icon={<Code20Regular />}
              checked={linkView.compiler}
              aria-label="Compiler links"
              title="Show compiler diagnostic links"
              onClick={() => changeLinkView({ compiler: !linkView.compiler })}
            />
          </FluentProvider>,
          mappingArea
        )}
      {mappingArea && (
        <MappingLinksOverlay
          ref={linksOverlayRef}
          host={host}
          mappingArea={mappingArea}
          callbacks={callbacks}
          previewRef={previewRef}
          selectedLinkId={state.selectedLink}
          selectedLinkIds={state.selectedLinks}
          state={state}
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
  private viewportWidth = 0;
  private zoom = 1;
  private revealedPageId: string | null = null;
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
    const pageChanged = page?.id !== this.page?.id;
    this.page = page;
    this.functoidsById = new Map(page?.functoids.map((functoid) => [functoid.id, functoid]) ?? []);

    const mappingArea = this.closest('.mapping-area');
    const canvasRect = this.getBoundingClientRect();
    const areaRect = mappingArea?.getBoundingClientRect();
    const offsetX = areaRect ? canvasRect.left - areaRect.left : 0;
    const offsetY = areaRect ? canvasRect.top - areaRect.top : 0;
    const geometryChanged = this.offsetX !== offsetX || this.offsetY !== offsetY || this.viewportWidth !== this.clientWidth;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.viewportWidth = this.clientWidth;
    if (!renderFullCanvas && !geometryChanged && this.linksOverlayRef.current) {
      this.linksOverlayRef.current.redraw();
    } else {
      this.renderReact();
    }
    if (pageChanged) {
      this.revealedPageId = null;
    }
    this.revealFunctoids();
  }

  // Functoids saved far from the origin would otherwise sit off-screen: scroll their bounding box into view once per page.
  private revealFunctoids(): void {
    const functoids = this.page?.functoids ?? [];
    if (!this.page || functoids.length === 0 || this.revealedPageId === this.page.id) {
      return;
    }
    const pageId = this.page.id;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!this.isConnected || this.page?.id !== pageId || this.clientWidth === 0) {
          return;
        }
        this.revealedPageId = pageId;
        const minX = Math.min(...functoids.map((functoid) => (functoid.x - functoidHalfWidth) * this.zoom));
        const maxX = Math.max(...functoids.map((functoid) => (functoid.x + functoidHalfWidth) * this.zoom));
        const minY = Math.min(...functoids.map((functoid) => (functoid.y - functoidHalfHeight) * this.zoom));
        const maxY = Math.max(...functoids.map((functoid) => (functoid.y + functoidHalfHeight) * this.zoom));
        this.scrollLeft = maxX + canvasEdgePadding > this.clientWidth ? Math.max(0, minX - canvasEdgePadding) : 0;
        this.scrollTop = maxY + canvasEdgePadding > this.clientHeight ? Math.max(0, minY - canvasEdgePadding) : 0;
        this.linksOverlayRef.current?.redraw();
      });
    });
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
