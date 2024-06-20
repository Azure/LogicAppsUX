import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { Text } from '@fluentui/react-components';
import { Icon } from '@fluentui/react';
import { useIntl } from 'react-intl';
//import { TemplatesPanelContent, type TemplatePanelTab } from '@microsoft/designer-ui';
import { useState } from 'react';
import { TemplatesPanelContent } from '@microsoft/designer-ui';
import { getQuickViewTabs } from '../../../../core/templates/utils/helper';

export const QuickViewPanel = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { manifest } = useSelector((state: RootState) => ({
    manifest: state.template.manifest,
    templateName: state.template.templateName,
  }));
  const panelTabs = getQuickViewTabs(intl, dispatch);
  const [selectedTabId, setSelectedTabId] = useState<string>(panelTabs[0]?.id);

  if (!manifest) {
    return null;
  }

  const onTabSelected = (tabId: string): void => {
    setSelectedTabId(tabId);
  };

  return (
    <div>
      <TemplatesPanelContent
        className="msla-template-quickview-tabs"
        isSequence={false}
        tabs={panelTabs}
        selectedTab={selectedTabId}
        selectTab={onTabSelected}
      />
    </div>
  );
};

export const QuickViewPanelHeader = ({
  title,
  description,
  details,
}: { title: string; description: string; details: Record<string, string> }) => {
  return (
    <div className="msla-template-quickview-header">
      <Text className="msla-template-panel-header">{title}</Text>
      <div className="msla-template-quickview-tags">
        {Object.keys(details).map((key: string, index: number, array: any[]) => {
          return (
            <div key={key}>
              <Text className="msla-template-card-tag">
                {key}: {details[key]}
              </Text>
              {index !== array.length - 1 ? (
                <Icon style={{ padding: '3px 10px 3px 10px', color: '#dedede', fontSize: 10 }} iconName="LocationDot" />
              ) : null}
            </div>
          );
        })}
      </div>
      <Text className="msla-template-description">{description}</Text>
    </div>
  );
};
