import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { selectPanelTab } from '../../../../core/state/templates/panelSlice';
import { usePanelTabs } from './usePanelTabs';
import { TemplatesPanelContent } from '@microsoft/designer-ui';

export const CreateWorkflowPanel = ({ onCreateClick }: { onCreateClick: () => Promise<void> }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const panelTabs = usePanelTabs(onCreateClick);
  const selectedTabId = useSelector((state: RootState) => state.panel.selectedTabId) ?? panelTabs[0]?.id;

  const intlText = {
    CREATE_NEW_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Create New Workflow',
      id: '/G8rbe',
      description: 'Create new workflow description',
    }),
    CONFIGURE_CONNECTIONS: intl.formatMessage({
      defaultMessage: 'Configure Connections',
      id: 'D6Gabc',
      description: 'Configure Connections description',
    }),
  };

  const handleSelectTab = (tabId: string): void => {
    dispatch(selectPanelTab(tabId));
  };

  return (
    <>
      <div>
        <b>{intlText.CREATE_NEW_WORKFLOW}</b>
      </div>

      <TemplatesPanelContent panelType="createWorkflow" tabs={panelTabs} selectedTab={selectedTabId} selectTab={handleSelectTab} />
    </>
  );
};
