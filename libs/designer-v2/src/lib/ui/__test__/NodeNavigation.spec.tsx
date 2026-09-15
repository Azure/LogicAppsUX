import { describe } from 'vitest';
import { nodeNavigationTestSuite } from '../../../../../designer/src/lib/ui/__test__/nodeNavigationTestSuite';
import panelReducer, {
  changePanelNode,
  setAlternateSelectedNode,
  setNodeSelection,
  setPinnedPanelActiveTab,
  setSelectedNodeId,
  setSelectedPanelActiveTab,
} from '../../core/state/panel/panelSlice';
import { setFocusNode } from '../../core/state/workflow/workflowSlice';
import { NodeNavigation } from '../NodeNavigation';

describe('NodeNavigation (designer-v2)', () => {
  nodeNavigationTestSuite({
    Navigation: NodeNavigation,
    panelReducer,
    changePanelNode,
    setSelectedNodeId,
    setAlternateSelectedNode,
    setNodeSelection,
    setFocusNode,
    setSelectedPanelActiveTab,
    setPinnedPanelActiveTab,
  });
});
