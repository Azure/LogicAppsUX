import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/templates/store';
import { useEffect, useState } from 'react';
import { TemplateContent, TemplatesPanelFooter, type TemplateTabProps } from '@microsoft/designer-ui';
import { useConfigureTemplateWizardTabs } from '../../ui/configuretemplate/tabs/useWizardTabs';
import { selectWizardTab } from '../state/templates/tabSlice';
import { setLayerHostSelector } from '@fluentui/react';
import { TemplateInfoToast } from '../../ui/configuretemplate/toasters';
import { useIntl } from 'react-intl';

export const ConfigureTemplateWizard = () => {
  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
  const dispatch = useDispatch<AppDispatch>();
  const { selectedTabId } = useSelector((state: RootState) => ({
    selectedTabId: state.tab.selectedTabId,
  }));
  const intl = useIntl();
  const [toasterData, setToasterData] = useState({ title: '', content: '', show: false });

  useEffect(() => {
    if (selectedTabId) {
      setToasterData({ title: '', content: '', show: false });
    }
  }, [selectedTabId]);

  const onSaveWorkflows = (isMultiWorkflow: boolean) => {
    if (isMultiWorkflow) {
      setToasterData({
        title: intl.formatMessage({
          defaultMessage: "You're creating an accelerator template!",
          id: '3ST5oT',
          description: 'Title for the toaster after adding workflows.',
        }),
        content: intl.formatMessage({
          defaultMessage: 'This template contains more than one workflow, therefore it is classified as an Accelerator.',
          id: 'gkUDy6',
          description: 'Content for the toaster for adding workflows',
        }),
        show: true,
      });
    } else {
      setToasterData({
        title: intl.formatMessage({
          defaultMessage: "You're creating a workflow template!",
          id: '7ERTcu',
          description: 'Title for the toaster after adding a single workflow.',
        }),
        content: intl.formatMessage({
          defaultMessage: 'This template contains one workflow, therefore it is classified as a Workflow.',
          id: '1AFYij',
          description: 'Content for the toaster for adding a single workflow.',
        }),
        show: true,
      });
    }
  };

  const onPublish = () => {
    setToasterData({
      title: intl.formatMessage({
        defaultMessage: 'Your template has been published in production!',
        id: '6TFn8v',
        description: 'Title for the toaster after publishing template.',
      }),
      content: intl.formatMessage({
        defaultMessage: 'Head on over to the gallery page to see your template in action.',
        id: 'ILcDyX',
        description: 'Content for the toaster for after publishing template.',
      }),
      show: true,
    });
  };

  const handleSelectTab = (tabId: string): void => {
    dispatch(selectWizardTab(tabId));
  };

  const panelTabs: TemplateTabProps[] = useConfigureTemplateWizardTabs({ onSaveWorkflows, onPublish });
  const selectedTabProps = selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0];

  return (
    <div>
      <TemplateInfoToast {...toasterData} />
      <TemplateContent className="msla-template-quickview-tabs" tabs={panelTabs} selectedTab={selectedTabId} selectTab={handleSelectTab} />
      <div className="msla-template-overview-footer">
        {selectedTabProps?.footerContent ? <TemplatesPanelFooter showPrimaryButton={true} {...selectedTabProps?.footerContent} /> : null}
      </div>

      <div
        id={'msla-layer-host'}
        style={{
          position: 'absolute',
          inset: '0px',
          visibility: 'hidden',
        }}
      />
    </div>
  );
};
