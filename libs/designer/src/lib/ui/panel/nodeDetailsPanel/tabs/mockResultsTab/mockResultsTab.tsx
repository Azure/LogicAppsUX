import constants from '../../../../../common/constants';
import { useSelectedNodeId } from '../../../../../core/state/panel/panelSelectors';
import { useIsMockSupported } from '../../../../../core/state/unitTest/unitTestSelectors';
import type { PanelTabFn } from '@microsoft/designer-ui';
import { OutputMocks } from '@microsoft/designer-ui';

export const MockResultsTab = () => {
  const nodeId = useSelectedNodeId();
  const isMockSupported = useIsMockSupported(nodeId);

  return <OutputMocks isMockSupported={isMockSupported} />;
};

export const mockResultsTab: PanelTabFn = (intl) => ({
  id: constants.PANEL_TAB_NAMES.MOCK_RESULTS,
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
