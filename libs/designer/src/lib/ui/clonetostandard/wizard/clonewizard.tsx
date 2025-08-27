import type { AppDispatch, RootState } from '../../../core/state/clonetostandard/store';
import { useDispatch, useSelector } from 'react-redux';
import { TemplateContent, TemplatesPanelFooter, type TemplateTabProps } from '@microsoft/designer-ui';
import { type CloneCallHandler, useCloneWizardTabs } from '../tabs/useWizardTabs';
import { selectWizardTab } from '../../../core/state/clonetostandard/tabslice';
import { useCloneWizardStyles } from './styles';

export const CloneWizard = ({
  onCloneCall,
  onClose,
}: {
  onCloneCall: CloneCallHandler;
  onClose: () => void;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedTabId } = useSelector((state: RootState) => state.tab);
  const styles = useCloneWizardStyles();

  const handleSelectTab = (tabId: string): void => {
    dispatch(selectWizardTab(tabId));
  };

  const panelTabs: TemplateTabProps[] = useCloneWizardTabs({
    onCloneCall,
    onClose,
  });
  const selectedTabProps = selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0];

  return (
    <div className={styles.wizardContainer}>
      <div className={styles.scrollableContent}>
        <TemplateContent tabs={panelTabs} selectedTab={selectedTabId} selectTab={handleSelectTab} />
      </div>
      <div className={styles.footer}>
        {selectedTabProps?.footerContent ? <TemplatesPanelFooter {...selectedTabProps?.footerContent} /> : null}
      </div>
    </div>
  );
};
