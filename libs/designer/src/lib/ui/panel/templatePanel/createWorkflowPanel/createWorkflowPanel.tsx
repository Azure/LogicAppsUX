import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { selectPanelTab } from '../../../../core/state/templates/panelSlice';
import { type TemplatePanelTab, TemplatesPanelContent } from '@microsoft/designer-ui';
import { validateParameters, validateWorkflowName } from '../../../../core/state/templates/templateSlice';
import { useExistingWorkflowNames } from '../../../../core/queries/template';
import { useEffect } from 'react';

export const CreateWorkflowPanel = ({
  panelTabs,
}: {
  panelTabs: TemplatePanelTab[];
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const selectedTabId = useSelector((state: RootState) => state.panel.selectedTabId) ?? panelTabs[0]?.id;
  const { data: existingWorkflowNames } = useExistingWorkflowNames();

  const handleSelectTab = (tabId: string): void => {
    dispatch(selectPanelTab(tabId));
  };

  useEffect(() => {
    dispatch(validateWorkflowName(existingWorkflowNames ?? []));
    dispatch(validateParameters());
  }, [dispatch, existingWorkflowNames, selectedTabId]);

  return <TemplatesPanelContent tabs={panelTabs} selectedTab={selectedTabId} selectTab={handleSelectTab} isSequence={true} />;
};
