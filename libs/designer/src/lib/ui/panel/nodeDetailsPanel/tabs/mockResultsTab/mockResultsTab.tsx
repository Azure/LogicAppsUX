import constants from '../../../../../common/constants';
import { useSelectedNodeId } from '../../../../../core/state/panel/panelSelectors';
import type { RootState } from '../../../../../core/store';
import type { PanelTabFn } from '@microsoft/designer-ui';
import { Peek } from '@microsoft/designer-ui';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';
import { useSelector } from 'react-redux';

export const MockResultsTab = () => {
  const nodeId = useSelectedNodeId();
  const nodeMockResults = useSelector<RootState, any>((state) => state.unitTest.mockResults.get(nodeId));
  const content = isNullOrUndefined(nodeMockResults) ? '' : JSON.stringify(nodeMockResults, null, 2);

  return <Peek input={content} isReadOnly={false} />;
};

export const mockResultsTab: PanelTabFn = (intl) => ({
  title: intl.formatMessage({
    defaultMessage: 'Mocked Results',
    description: 'The tab label for the mocked results tab on the operation panel',
  }),
  name: constants.PANEL_TAB_NAMES.MOCK_RESULTS,
  description: intl.formatMessage({
    defaultMessage: 'Mocked Results Tab',
    description: 'An accessability label that describes the mocked results tab',
  }),
  visible: true,
  content: <MockResultsTab />,
  order: 10,
  icon: 'Info',
});
