import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/templates/store';
import { useEffect, useMemo, useState } from 'react';
import { TemplateContent, TemplatesPanelFooter, type TemplateTabProps } from '@microsoft/designer-ui';
import { useConfigureTemplateWizardTabs } from '../../ui/configuretemplate/tabs/useWizardTabs';
import { selectWizardTab } from '../state/templates/tabSlice';
import { setLayerHostSelector } from '@fluentui/react';
import type { TemplateInfoToasterProps } from '../../ui/configuretemplate/toasters';
import { useIntl } from 'react-intl';
import { equals, type Template } from '@microsoft/logic-apps-shared';
import { useAllMcpServers } from 'lib/core/mcp/utils/queries';
import { getStandardLogicAppId } from 'lib/core/configuretemplate/utils/helper';

export const McpServersWizard = () => {
  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
  const dispatch = useDispatch<AppDispatch>();
  const { selectedTabId, subscriptionId, resourceGroup, logicAppName } = useSelector((state: RootState) => ({
    selectedTabId: state.tab.selectedTabId,
    isPanelOpen: state.panel.isOpen,
    subscriptionId: state.resource.subscriptionId,
    resourceGroup: state.resource.resourceGroup,
    logicAppName: state.resource.logicAppName,
  }));
  const logicAppId = useMemo(() => getStandardLogicAppId(subscriptionId, resourceGroup, logicAppName), [subscriptionId, resourceGroup, logicAppName]);
  const intl = useIntl();
  const [toasterData, setToasterData] = useState({ title: '', content: '', show: false });

  useEffect(() => {
    if (selectedTabId) {
      setToasterData({ title: '', content: '', show: false });
    }
  }, [selectedTabId]);

  const mcpServers = useAllMcpServers(logicAppId);

  const handleSelectTab = (tabId: string): void => {
    dispatch(selectWizardTab(tabId));
  };

  const panelTabs: TemplateTabProps[] = useMcpServerTabs({ onSaveWorkflows, onSaveTemplate });
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
