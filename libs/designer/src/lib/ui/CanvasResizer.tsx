
import { useResizeObserver } from '@react-hookz/web';
import { useReactFlow } from '@xyflow/react';
import React from 'react';

interface CavasResizerProps {
	watch: React.RefObject<Element>;
}

export const CanvasResizer = (props: CavasResizerProps) => {
  const { watch } = props;

	const { getViewport, setViewport } = useReactFlow();

	const [prevSize, setPrevSize] = React.useState({ width: 0, height: 0 });
	const updateCanvas = React.useCallback(({ width, height }: { width: number, height: number }) => {
		
		const xDiff = width - prevSize.width;
		const yDiff = height - prevSize.height;

		setPrevSize({ width, height });

		var v = getViewport();
		v.x += xDiff / 2;
		v.y += yDiff / 2;
		setViewport(v);

	}, [getViewport, prevSize.height, prevSize.width, setViewport]);


	useResizeObserver(watch, (el) => updateCanvas(el.contentRect));

  return null;
};
