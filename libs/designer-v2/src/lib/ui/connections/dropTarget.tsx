/* eslint-disable react/display-name */
import { useMemo } from 'react';
import { useDrop } from 'react-dnd';
import { css } from '@fluentui/utilities';
import { containsIdTag } from '@microsoft/logic-apps-shared';

import { useNodesTokenDependencies } from '../../core/state/operation/operationSelector';
import { useAllGraphParents, useGetAllOperationNodesWithin, useNodeIds } from '../../core/state/workflow/workflowSelectors';
import { AllowDropTarget } from './dynamicsvgs/allowdroptarget';
import { BlockDropTarget } from './dynamicsvgs/blockdroptarget';
import type { DropItem } from './helpers';
import { canDropItem } from './helpers';
import { useIsDarkMode } from '../../core/state/designerOptions/designerOptionsSelectors';

interface DropTargetProps {
  graphId: string;
  parentId?: string;
  childId?: string;
  upstreamNodesOfChild: string[];
  preventDropItemInA2A: boolean;
  isWithinAgenticLoop: boolean;
}

export const DropTarget: React.FC<DropTargetProps> = ({
  graphId,
  parentId,
  childId,
  upstreamNodesOfChild,
  preventDropItemInA2A,
  isWithinAgenticLoop,
}) => {
  const isDarkMode = useIsDarkMode();

  const immediateAncestor = useGetAllOperationNodesWithin(parentId && !containsIdTag(parentId) ? parentId : '');
  const upstreamNodes = useMemo(() => new Set([...upstreamNodesOfChild, ...immediateAncestor]), [immediateAncestor, upstreamNodesOfChild]);
  const upstreamNodesDependencies = useNodesTokenDependencies(upstreamNodes);
  const upstreamScopeArr = useAllGraphParents(graphId);
  const upstreamScopes = useMemo(() => new Set(upstreamScopeArr), [upstreamScopeArr]);

  // Get all nodes in the workflow to compute downstream dependencies
  const allNodeIds = useNodeIds();
  const allNodesDependencies = useNodesTokenDependencies(new Set(allNodeIds));

  const [{ canDrop }, drop] = useDrop(
    () => ({
      accept: 'BOX',
      drop: () => ({ graphId, parentId, childId }),
      canDrop: (item: DropItem) =>
        canDropItem(
          item,
          upstreamNodes,
          upstreamNodesDependencies,
          upstreamScopes,
          childId,
          parentId,
          preventDropItemInA2A,
          isWithinAgenticLoop,
          allNodesDependencies
        ),
      collect: (monitor) => ({
        canDrop: monitor.canDrop(),
      }),
    }),
    [graphId, parentId, childId, upstreamNodes, upstreamNodesDependencies, preventDropItemInA2A, isWithinAgenticLoop, allNodesDependencies]
  );

  return (
    <div
      ref={drop}
      className={css('msla-drop-zone-viewmanager', canDrop ? 'canDrop' : 'cannotDrop')}
      style={{ display: 'grid', placeItems: 'center' }}
    >
      {canDrop ? <AllowDropTarget fill="#0078D4" /> : <BlockDropTarget fill={isDarkMode ? '#252423' : '#edebe9'} />}
    </div>
  );
};
