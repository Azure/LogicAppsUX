import { useEffect, useRef } from 'react';
import { useInternalNode, useReactFlow } from '@xyflow/react';
import { useIsPanelCollapsed, useOperationPanelSelectedNodeId, useCurrentPanelMode } from '../core/state/panel/panelSelectors';
import type { PanelLocation } from '@microsoft/designer-ui';
import { PanelLocation as PanelLocationEnum } from '@microsoft/designer-ui';

const PANEL_WIDTH_DEFAULT = 480;
const PANEL_PADDING = 40;
const ANIMATION_DURATION = 300;

interface PanelViewportShiftProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  panelLocation: PanelLocation;
}

/**
 * Watches panel open/close state and shifts the ReactFlow viewport when the selected node
 * would be covered by the overlay panel. Animates the translation for a smooth UX.
 */
export const PanelViewportShift = ({ canvasRef, panelLocation }: PanelViewportShiftProps) => {
  const isCollapsed = useIsPanelCollapsed();
  const selectedNodeId = useOperationPanelSelectedNodeId();
  const currentPanelMode = useCurrentPanelMode();
  const selectedNode = useInternalNode(selectedNodeId ?? '');
  const { getViewport, setViewport } = useReactFlow();

  // Track the viewport shift we applied so we can reverse it when the panel closes.
  const appliedShiftRef = useRef(0);
  const prevCollapsedRef = useRef(isCollapsed);

  useEffect(() => {
    const wasCollapsed = prevCollapsedRef.current;
    prevCollapsedRef.current = isCollapsed;

    // Only act on Operation panels (node details / multi-select).
    if (currentPanelMode !== 'Operation') {
      return;
    }

    const canvasEl = canvasRef.current;
    if (!canvasEl) {
      return;
    }

    // Panel just opened
    if (wasCollapsed && !isCollapsed && selectedNode) {
      const canvasRect = canvasEl.getBoundingClientRect();
      const viewport = getViewport();
      const { zoom } = viewport;

      const nodeX = (selectedNode.internals.positionAbsolute?.x ?? 0) * zoom + viewport.x;
      const nodeWidth = (selectedNode.measured?.width ?? 200) * zoom;
      const nodeRightEdge = nodeX + nodeWidth;

      const panelWidth = PANEL_WIDTH_DEFAULT;
      const isRight = panelLocation === PanelLocationEnum.Right;

      // Determine the visible canvas boundary that the panel covers.
      const panelEdge = isRight ? canvasRect.width - panelWidth : panelWidth;

      let shift = 0;
      if (isRight && nodeRightEdge > panelEdge) {
        // Node's right side is behind the panel — shift canvas left.
        shift = -(nodeRightEdge - panelEdge + PANEL_PADDING);
      } else if (!isRight && nodeX < panelEdge) {
        // Left-side panel: node's left side is behind the panel — shift canvas right.
        shift = panelEdge - nodeX + PANEL_PADDING;
      }

      if (shift !== 0) {
        appliedShiftRef.current = shift;
        setViewport({ x: viewport.x + shift, y: viewport.y, zoom }, { duration: ANIMATION_DURATION });
      }
    }

    // Panel just closed — reverse the shift.
    if (!wasCollapsed && isCollapsed && appliedShiftRef.current !== 0) {
      const viewport = getViewport();
      const reverseShift = -appliedShiftRef.current;
      appliedShiftRef.current = 0;
      setViewport({ x: viewport.x + reverseShift, y: viewport.y, zoom: viewport.zoom }, { duration: ANIMATION_DURATION });
    }
  }, [isCollapsed, selectedNode, canvasRef, panelLocation, currentPanelMode, getViewport, setViewport]);

  // Reset the stored shift when the selected node changes (user clicked a different node while panel is open).
  useEffect(() => {
    if (!isCollapsed && selectedNode) {
      const canvasEl = canvasRef.current;
      if (!canvasEl) {
        return;
      }

      const canvasRect = canvasEl.getBoundingClientRect();
      const viewport = getViewport();
      const { zoom } = viewport;

      const nodeX = (selectedNode.internals.positionAbsolute?.x ?? 0) * zoom + viewport.x;
      const nodeWidth = (selectedNode.measured?.width ?? 200) * zoom;
      const nodeRightEdge = nodeX + nodeWidth;

      const panelWidth = PANEL_WIDTH_DEFAULT;
      const isRight = panelLocation === PanelLocationEnum.Right;
      const panelEdge = isRight ? canvasRect.width - panelWidth : panelWidth;

      let shift = 0;
      if (isRight && nodeRightEdge > panelEdge) {
        shift = -(nodeRightEdge - panelEdge + PANEL_PADDING);
      } else if (!isRight && nodeX < panelEdge) {
        shift = panelEdge - nodeX + PANEL_PADDING;
      }

      if (shift !== 0) {
        appliedShiftRef.current = shift;
        setViewport({ x: viewport.x + shift, y: viewport.y, zoom }, { duration: ANIMATION_DURATION });
      } else {
        appliedShiftRef.current = 0;
      }
    }
    // Only re-run when the selected node ID changes, not on every viewport update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  return null;
};
