import { clamp, useThrottledEffect } from '@microsoft/logic-apps-shared';
import { useOnViewportChange, useReactFlow } from '@xyflow/react';
import { useLayout } from '../../../core/graphlayout';
import { DEFAULT_NODE_SIZE } from '../../../core/utils/graph';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDragDropManager } from 'react-dnd';
import { useResizeObserver } from '@react-hookz/web';

interface XY {
	x: number;
	y: number;
}

const zoneSize = 160;
const speed = 40;
const pollingRate = 16;

interface DragPanMonitorProps {
	canvasRef: React.RefObject<Element>;
}

export const DragPanMonitor = (props: DragPanMonitorProps) => {
	const { canvasRef } = props;

	const [_nodes, _edges, flowSize] = useLayout();

	const [containerDimensions, setContainerDimentions] = useState(canvasRef.current?.getBoundingClientRect() ?? { width: 0, height: 0 });
	useResizeObserver(canvasRef, (el) => setContainerDimentions(el.contentRect));

	const [zoom, setZoom] = useState(1);

	useOnViewportChange({ onChange: (v) => setZoom(v.zoom) });

	const translateExtent = useMemo((): {
		x: { min: number; max: number };
		y: { min: number; max: number };
	} => {
		const padding = 120 * zoom;
		const [flowWidth, flowHeight] = flowSize;

		return {
			x: {
				min: -flowWidth * zoom + DEFAULT_NODE_SIZE.width * zoom + padding,
				max: containerDimensions.width - DEFAULT_NODE_SIZE.width * zoom - padding,
			},
			y: {
				min: -flowHeight * zoom + DEFAULT_NODE_SIZE.height * zoom + padding,
				max: containerDimensions.height - DEFAULT_NODE_SIZE.height * zoom - padding,
			},
		};
	}, [zoom, flowSize, containerDimensions]);

	/////

	const [dragPos, setDragPos] = useState<XY | null>(null);
	const [dragging, setDragging] = useState(false);

	const dragDropManager = useDragDropManager();
	useEffect(() => {
		const monitor = dragDropManager.getMonitor();
		monitor.subscribeToOffsetChange(() => setDragPos(monitor.getClientOffset()));
		monitor.subscribeToStateChange(() => setDragging(monitor.isDragging()));
	}, [dragDropManager]);

	const { getViewport, setViewport } = useReactFlow();
	const panCanvas = useCallback(
		(pan: XY) => {
			const v = getViewport();
			v.x += pan.x;
			v.y += pan.y;
			v.x = clamp(v.x, translateExtent.x.min, translateExtent.x.max);
			v.y = clamp(v.y, translateExtent.y.min, translateExtent.y.max);
			setViewport(v);
		},
		[translateExtent, getViewport, setViewport]
	);

	const handleDragPos = useCallback(
		({ x, y }: XY) => {
			const screen = { width: window.innerWidth, height: window.innerHeight };
			const pan = { x: 0, y: 0 };
			if (x < zoneSize) {
				const ratio = 1 - x / zoneSize;
				pan.x = speed * ratio;
			}
			if (x > screen.width - zoneSize) {
				const ratio = 1 - (screen.width - x) / zoneSize;
				pan.x = -speed * ratio;
			}
			if (y < zoneSize) {
				const ratio = 1 - y / zoneSize;
				pan.y = speed * ratio;
			}
			if (y > screen.height - zoneSize) {
				const ratio = 1 - (screen.height - y) / zoneSize;
				pan.y = -speed * ratio;
			}

			if (pan.x !== 0 || pan.y !== 0) {
				panCanvas(pan);
			}
		},
		[panCanvas]
	);

	const [retrigger, setRetrigger] = useState(0);
	useThrottledEffect(
		() => {
			if (!dragging || !dragPos) {
				return;
			}
			setRetrigger(retrigger + 1);
			handleDragPos(dragPos);
		},
		[dragPos, retrigger, handleDragPos],
		pollingRate
	);

	return null;
};
