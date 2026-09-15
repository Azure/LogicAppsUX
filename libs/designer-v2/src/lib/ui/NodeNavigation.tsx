import { getAdjacentNode, removeIdTag, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { useReactFlow } from '@xyflow/react';
import { type RefObject, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDispatch } from 'react-redux';
import {
  useNodeSelectAdditionalCallback,
  useSuppressDefaultNodeSelectFunctionality,
} from '../core/state/designerOptions/designerOptionsSelectors';
import { useOperationPanelSelectedNodeId } from '../core/state/panel/panelSelectors';
import { changePanelNode, setSelectedNodeId } from '../core/state/panel/panelSlice';
import { setFocusNode } from '../core/state/workflow/workflowSlice';
import type { AppDispatch } from '../core/store';

interface NodeNavigationProps {
  canvasRef: RefObject<HTMLElement>;
  onNavigate: () => void;
}

export const NodeNavigation = ({ canvasRef, onNavigate }: NodeNavigationProps) => {
  const { getNodes } = useReactFlow();
  const selectedNodeId = useOperationPanelSelectedNodeId();
  const nodeSelectCallback = useNodeSelectAdditionalCallback();
  const suppressDefaultNodeSelect = useSuppressDefaultNodeSelectFunctionality();
  const dispatch = useDispatch<AppDispatch>();

  const navigate = useCallback(
    (event: KeyboardEvent, direction: 'next' | 'previous') => {
      if (!(event.target instanceof Element) || !canvasRef.current?.contains(event.target)) {
        return;
      }
      event.preventDefault();
      const node = getAdjacentNode(getNodes(), selectedNodeId, direction);
      if (!node) {
        return;
      }
      onNavigate();
      const actionId = node.type === WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE ? removeIdTag(node.id) : node.id;
      nodeSelectCallback?.(actionId);
      dispatch(suppressDefaultNodeSelect ? setSelectedNodeId(actionId) : changePanelNode(actionId));
      dispatch(setFocusNode(node.id));
    },
    [canvasRef, dispatch, getNodes, nodeSelectCallback, onNavigate, selectedNodeId, suppressDefaultNodeSelect]
  );

  useHotkeys(['ctrl+down', 'meta+down'], (event) => navigate(event, 'next'), [navigate]);
  useHotkeys(['ctrl+up', 'meta+up'], (event) => navigate(event, 'previous'), [navigate]);

  return null;
};
