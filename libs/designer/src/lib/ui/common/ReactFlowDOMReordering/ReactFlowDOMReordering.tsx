import { useEffect } from "react";
import { useLayout } from "../../../core/graphlayout";

export const ReactFlowDOMReordering = () => {

	const layout = useLayout();

	useEffect(() => {
		// Get the element with classname 'react-flow__nodes'
		const nodeFolder = document.querySelector('.react-flow__nodes');
		const edgeFolder = document.querySelector('.react-flow__edgelabel-renderer');

		// Reorder children of both nodeFolder and edgeFolder, then append them to the node folder
		const reorder = () => {
			if (nodeFolder && edgeFolder) {
				const nodeChildren = Array.from(nodeFolder.children);
				const edgeChildren = Array.from(edgeFolder.children);
				// nodeFolder.innerHTML = '';
				// edgeFolder.innerHTML = '';
				const allChildren = [...nodeChildren, ...edgeChildren];
				// Sort the children by their nodeIndex data property
				allChildren.sort((a, b) => {
					const aIndex = parseInt(a.getAttribute('data-nodeindex') ?? '0');
					const bIndex = parseInt(b.getAttribute('data-nodeindex') ?? '0');
					// If the index is the same, sort by x position then y position
					if (aIndex === bIndex) {
						// get the css 'left' and 'top' properties of the element
						const aX = getX(a);
						const bX = getX(b);
						const aY = getY(a);
						const bY = getY(b);
						// console.log('#> Comparing nodes:', a, b);
						// console.log('    #> Positions:', aX, aY, bX, bY);
						return aY === bY ? aX - bX : aY - bY;
					}
					return aIndex - bIndex;
				});
				// Append the sorted children to the nodeFolder
				allChildren.forEach((child) => edgeFolder.appendChild(child));
				// console.log('#> Node Array:', allChildren);
			}
		}

		// Call reorder function when the nodeFolder is available
		if (nodeFolder && edgeFolder) {
			reorder();
			// console.log('#> Reordered');
		}
	}, [layout]);

	return null;
}

const getX = (element: Element): number => {
	console.log('#> getX:', element)
	const styleMap = element?.computedStyleMap();
	if (!styleMap) return 0;

	const left = parseInt(styleMap.get('left')?.toString() ?? '0');
	if (!isNaN(left)) {
		return left;
	}

	const tX = getTransformX(styleMap.get('transform'));
	if (!isNaN(tX)) {
		return tX;
	}

	return 0
}

const getY = (element: Element): number => {
	const styleMap = element?.computedStyleMap();
	if (!styleMap) return 0;
	const top = parseInt(styleMap.get('top')?.toString() ?? '0');
	const tY = getTransformY(styleMap.get('transform'));
	return top ?? tY ?? 0;
}

const getTransformX = (value?: CSSStyleValue) => {
	if (!value) {
		return 0;
	}
	const transform = value.toString();
	return parseInt(transform?.split('translate(')?.[1]?.split('px,')?.[0] ?? 0);
}

const getTransformY = (value?: CSSStyleValue) => {
	if (!value) {
		return 0;
	}
	const transform = value.toString();
	return parseInt(transform?.split('px, ')?.[1]?.split('px')?.[0] ?? 0);
}
