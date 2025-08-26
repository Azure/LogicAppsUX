import { Field, Text } from '@fluentui/react-components';
import type { AppDispatch, RootState } from '../../../core/state/clonetostandard/store';
import { useDispatch, useSelector } from 'react-redux';
import { CloneResourcePicker } from '../resourcepicker';
import { isUndefinedOrEmptyString } from '@microsoft/logic-apps-shared';
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
  const {
    resource: { subscriptionId, resourceGroup, logicAppName },
    clone: { errorMessage },
    tab: { selectedTabId },
  } = useSelector((state: RootState) => state);

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
      placeholder
      <div>
        <Text size={500}>Resource Subscription</Text>
        <div>
          <Text>{subscriptionId}</Text>
        </div>
      </div>
      <br />
      <div>
        <Text size={500}>Source (Consumption)</Text>
        <div>
          <Field>Resource Group</Field>
          <Text>{resourceGroup}</Text>
        </div>
        <div>
          <Field>Logic App</Field>
          <Text>{logicAppName}</Text>
        </div>
      </div>
      <br />
      <div>
        <Text size={500}>Destination (Standard)</Text>
        <CloneResourcePicker />
      </div>
      <br />
      <div>
        <Text size={500}>Test section</Text>
        {!isUndefinedOrEmptyString(errorMessage) && <Text size={400}>Error message: {errorMessage}</Text>}
      </div>
    </div>
  );
};
