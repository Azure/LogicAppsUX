import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { selectPanelTab } from '../../../../core/state/templates/panelSlice';
import { type TemplatePanelTab, TemplatesPanelContent } from '@microsoft/designer-ui';

export const CreateWorkflowPanel = ({
  panelTabs,
}: {
  panelTabs: TemplatePanelTab[];
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const selectedTabId = useSelector((state: RootState) => state.panel.selectedTabId) ?? panelTabs[0]?.id;

  const handleSelectTab = (tabId: string): void => {
    dispatch(selectPanelTab(tabId));
  };

  return <TemplatesPanelContent tabs={panelTabs} selectedTab={selectedTabId} selectTab={handleSelectTab} isSequence={true} />;
};
