import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { TabList, Tab, Text, OverflowItem } from '@fluentui/react-components';
import type { SelectTabData } from '@fluentui/react-components';
import { openCreateWorkflowPanelView, selectPanelTab } from '../../../../core/state/templates/panelSlice';
import { Icon, PrimaryButton, css } from '@fluentui/react';
import { changeCurrentTemplateName, loadTemplate } from '../../../../core/state/templates/templateSlice';
import { useIntl } from 'react-intl';
import { workflowTab } from './tabs/workflowTab';
import { overviewTab } from './tabs/overviewTab';

export const QuickViewPanel = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { manifest, templateName } = useSelector((state: RootState) => ({
    manifest: state.template.manifest,
    templateName: state.template.templateName,
  }));
  const panelTabs = [ workflowTab(intl), overviewTab(intl) ];
  const selectedTabId = useSelector((state: RootState) => state.panel.selectedTabId) ?? panelTabs[0]?.id;
  const intlText = {
    CREATE_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Create Workflow',
      id: 'tsPPWB',
      description: 'Button text to create workflow from this template',
    })
  };

  if (!manifest) {
    return null;
  }

  const { title, description, details } = manifest;
  const onTabSelected = (_: unknown, data?: SelectTabData): void => {
    if (data) {
      const itemKey = data.value as string;
      dispatch(selectPanelTab(itemKey));
    }
  };

  const onCreateWorkflowClick = () => {
    dispatch(changeCurrentTemplateName(templateName ?? ''));
    dispatch(loadTemplate(manifest));
    dispatch(openCreateWorkflowPanelView());
  };

  return (
    <div style={{height: '100%'}}>
      <div className="msla-template-quickview-header">
        <Text className="msla-template-panel-header">{title}</Text>
        <div className="msla-template-quickview-tags">
          {Object.keys(details).map((key: string, index: number, array: any[]) => {
            return (
              <div key={key}>
                <Text className="msla-template-card-tag">
                  {key}: {details[key]}
                </Text>
                {(index !== array.length - 1 ? <Icon style={{ padding: '3px 10px 3px 10px', color: '#dedede', fontSize: 10 }} iconName='LocationDot' /> : null)}
              </div>
            );
          })}
        </div>
        <Text className="msla-template-description">{description}</Text>
      </div>
      
      <TabList className="msla-template-quickview-tabs" selectedValue={selectedTabId} onTabSelect={onTabSelected}>
      {panelTabs.map(({ id, visible, title }) =>
          visible ? (
            <OverflowItem key={id} id={id} priority={id === selectedTabId ? 2 : 1}>
              <Tab className={css('msla-template-quickview-tab', id === selectedTabId && 'selected')} value={id} role={'tab'}>
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
    </div>
  );
};
