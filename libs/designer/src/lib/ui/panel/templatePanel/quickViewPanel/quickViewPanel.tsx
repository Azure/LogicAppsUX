import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { TabList, Tab, OverflowItem } from '@fluentui/react-components';
import type { SelectTabData } from '@fluentui/react-components';
import { openCreateWorkflowPanelView, selectPanelTab } from '../../../../core/state/templates/panelSlice';
import { PrimaryButton } from '@fluentui/react';
import { changeCurrentTemplateName, loadTemplate } from '../../../../core/state/templates/templateSlice';
import { useIntl } from 'react-intl';
import type { TemplatePanelTab } from '@microsoft/designer-ui';

export const QuickViewPanel = ({
  panelTabs,
}: {
  panelTabs: TemplatePanelTab[];
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { templates, templateName } = useSelector((state: RootState) => ({
    templates: state.manifest.availableTemplates,
    templateName: state.template.templateName,
  }));
  const templateManifest = templates?.[templateName ?? ''];
  const selectedTabId = useSelector((state: RootState) => state.panel.selectedTabId) ?? panelTabs[0]?.id;
  const intl = useIntl();
  const intlText = {
    CREATE_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Create Workflow',
      id: 'tsPPWB',
      description: 'Button text to create workflow from this template',
    }),
    QUICK_VIEW: intl.formatMessage({
      defaultMessage: 'Quick View',
      id: 'm1BGgQ',
      description: 'Button text to open quick view panel to display more information',
    }),
  };

  const onTabSelected = (_: unknown, data?: SelectTabData): void => {
    if (data) {
      const itemKey = data.value as string;
      dispatch(selectPanelTab(itemKey));
    }
  };

  const onCreateWorkflowClick = () => {
    dispatch(changeCurrentTemplateName(templateName ?? ''));
    dispatch(loadTemplate(templateManifest));
    dispatch(openCreateWorkflowPanelView());
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

      <PrimaryButton onClick={onCreateWorkflowClick} aria-label={''}>
        {intlText.CREATE_WORKFLOW}
      </PrimaryButton>
    </>
  );
};
