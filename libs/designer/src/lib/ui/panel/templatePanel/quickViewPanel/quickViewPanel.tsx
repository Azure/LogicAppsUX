import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { usePanelTabs } from './usePanelTabs';
import { TabList, Tab, OverflowItem } from '@fluentui/react-components';
import type { SelectTabData } from '@fluentui/react-components';
import { selectPanelTab } from '../../../../core/state/templates/panelSlice';

export const QuickViewPanel = () => {
  const dispatch = useDispatch<AppDispatch>();
  const templateName = useSelector((state: RootState) => state.template.templateName);
  const panelTabs = usePanelTabs();
  const selectedTabId = useSelector((state: RootState) => state.panel.selectedTabId) ?? panelTabs[0]?.id;

  const onTabSelected = (_: unknown, data?: SelectTabData): void => {
    if (data) {
      const itemKey = data.value as string;
      dispatch(selectPanelTab(itemKey));
    }
  };

  return (
    <>
      <b>{templateName}</b>
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
