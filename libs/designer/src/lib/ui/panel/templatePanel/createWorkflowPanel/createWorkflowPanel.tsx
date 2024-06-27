import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { selectPanelTab } from '../../../../core/state/templates/panelSlice';
import { type TemplatePanelTab, TemplatesPanelContent } from '@microsoft/designer-ui';
import { validateParameters } from '../../../../core/state/templates/templateSlice';

export const CreateWorkflowPanel = ({
  panelTabs,
}: {
  panelTabs: TemplatePanelTab[];
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const selectedTabId = useSelector((state: RootState) => state.panel.selectedTabId) ?? panelTabs[0]?.id;

  const handleSelectTab = (tabId: string): void => {
    //TODO: add validate connections?
    dispatch(validateParameters());
    dispatch(selectPanelTab(tabId));
  };

  return <TemplatesPanelContent tabs={panelTabs} selectedTab={selectedTabId} selectTab={handleSelectTab} isSequence={true} />;
};
