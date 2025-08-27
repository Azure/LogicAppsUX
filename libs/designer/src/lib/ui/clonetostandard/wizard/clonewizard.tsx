import type { AppDispatch, RootState } from '../../../core/state/clonetostandard/store';
import { useDispatch, useSelector } from 'react-redux';
import { TemplateContent, TemplatesPanelFooter, type TemplateTabProps } from '@microsoft/designer-ui';
import { type CloneCallHandler, useCloneWizardTabs } from '../tabs/useWizardTabs';
import { selectWizardTab } from '../../../core/state/clonetostandard/tabslice';

export const CloneWizard = ({
  onCloneCall,
  onClose,
}: {
  onCloneCall: CloneCallHandler;
  onClose: () => void;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedTabId } = useSelector((state: RootState) => state.tab);

  const handleSelectTab = (tabId: string): void => {
    dispatch(selectWizardTab(tabId));
  };

  const panelTabs: TemplateTabProps[] = useCloneWizardTabs({
    onCloneCall,
    onClose,
  });
  const selectedTabProps = selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0];

  return (
    <div>
      <TemplateContent tabs={panelTabs} selectedTab={selectedTabId} selectTab={handleSelectTab} />
      <div>{selectedTabProps?.footerContent ? <TemplatesPanelFooter {...selectedTabProps?.footerContent} /> : null}</div>
    </div>
  );
};
