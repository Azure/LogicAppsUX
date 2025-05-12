import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/templates/store';
import { useEffect, useState } from 'react';
import { TemplateContent, TemplatesPanelFooter, type TemplateTabProps } from '@microsoft/designer-ui';
import { useConfigureTemplateWizardTabs } from '../../ui/configuretemplate/tabs/useWizardTabs';
import { selectWizardTab } from '../state/templates/tabSlice';
import { setLayerHostSelector } from '@fluentui/react';
import type { TemplateInfoToasterProps } from '../../ui/configuretemplate/toasters';
import { useIntl } from 'react-intl';
import { equals, type Template } from '@microsoft/logic-apps-shared';

export const ConfigureTemplateWizard = ({
  onRenderToaster,
}: { onRenderToaster: (data: TemplateInfoToasterProps, hideToaster: boolean) => void }) => {
  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
  const dispatch = useDispatch<AppDispatch>();
  const { selectedTabId, isPanelOpen } = useSelector((state: RootState) => ({
    selectedTabId: state.tab.selectedTabId,
    isPanelOpen: state.panel.isOpen,
  }));
  const intl = useIntl();
  const [toasterData, setToasterData] = useState({ title: '', content: '', show: false });

  useEffect(() => {
    if (selectedTabId) {
      setToasterData({ title: '', content: '', show: false });
    }
  }, [selectedTabId]);

  useEffect(() => {
    if (toasterData) {
      onRenderToaster(toasterData, isPanelOpen);
    }
  }, [isPanelOpen, onRenderToaster, toasterData]);

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

  const onSaveTemplate = (prevStatus: Template.TemplateEnvironment, newStatus: Template.TemplateEnvironment) => {
    const isNewStatusPublished = equals(newStatus, 'Production') || equals(newStatus, 'Testing');
    setToasterData({
      title: isNewStatusPublished
        ? intl.formatMessage(
            {
              defaultMessage: 'Your template has been published to {newStatus}!',
              id: 'K/enCE',
              description: 'Title for the toaster after publishing template.',
            },
            {
              newStatus,
            }
          )
        : equals(prevStatus, 'Development')
          ? intl.formatMessage({
              defaultMessage: 'Your template has been saved.',
              id: '+gBLFF',
              description: 'Title for the toaster after saving template.',
            })
          : intl.formatMessage({
              defaultMessage: 'Your template has been unpublished.',
              id: 'BYsNzz',
              description: 'Title for the toaster after unpublishing template.',
            }),
      content: isNewStatusPublished
        ? intl.formatMessage({
            defaultMessage: 'Head on over to the gallery page to see your template in action.',
            id: 'ILcDyX',
            description: 'Content for the toaster for after publishing template.',
          })
        : equals(prevStatus, 'Development')
          ? intl.formatMessage({
              defaultMessage: 'Your template in action is in development mode.',
              id: 'rlfK4u',
              description: 'Content for the toaster for after saving template.',
            })
          : intl.formatMessage({
              defaultMessage: 'Gallery page will no longer contain this template in action.',
              id: 'aoyT7n',
              description: 'Content for the toaster for after unpublishing template.',
            }),
      show: true,
    });
  };

  const handleSelectTab = (tabId: string): void => {
    dispatch(selectWizardTab(tabId));
  };

  const panelTabs: TemplateTabProps[] = useConfigureTemplateWizardTabs({ onSaveWorkflows, onSaveTemplate });
  const selectedTabProps = selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0];

  return (
    <div>
      <TemplateContent className="msla-template-quickview-tabs" tabs={panelTabs} selectedTab={selectedTabId} selectTab={handleSelectTab} />
      <div className="msla-template-overview-footer">
        {selectedTabProps?.footerContent ? <TemplatesPanelFooter {...selectedTabProps?.footerContent} /> : null}
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
