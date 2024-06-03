import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { TabList, Tab, OverflowItem } from '@fluentui/react-components';
import type { SelectTabData } from '@fluentui/react-components';
import { selectPanelTab } from '../../../../core/state/templates/panelSlice';
import { usePanelTabs } from './usePanelTabs';

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

  const onTabSelected = (_: unknown, data?: SelectTabData): void => {
    if (data) {
      const itemKey = data.value as string;
      dispatch(selectPanelTab(itemKey));
    }
  };

  return (
    <>
      <div>
        <b>{intlText.CREATE_NEW_WORKFLOW}</b>
      </div>
      <div>
        <b>Placeholder 1. {intlText.CONFIGURE_CONNECTIONS}</b>
      </div>

      <TabList selectedValue={selectedTabId} onTabSelect={onTabSelected} style={{ margin: '0px -12px' }}>
        {panelTabs.map(({ id, visible, title }) =>
          visible ? (
            <OverflowItem key={id} id={id} priority={id === selectedTabId ? 2 : 1}>
              <Tab value={id} role={'tab'}>
                {title}
              </Tab>
            </OverflowItem>
          ) : null
        )}
      </TabList>
      <div className="msla-panel-content-container">{panelTabs.find((tab) => tab.id === selectedTabId)?.content}</div>
    </>
  );
};
