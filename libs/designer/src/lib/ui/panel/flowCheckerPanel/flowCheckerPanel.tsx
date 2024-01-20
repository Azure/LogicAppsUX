import constants from '../../../common/constants';
import type { AppDispatch } from '../../../core';
import { useSelectedFlowCheckerPanelTabId } from '../../../core/state/panel/panelSelectors';
import { selectFlowCheckerPanelTab } from '../../../core/state/panel/panelSlice';
import { ErrorsTab } from './tabs/errorsTab';
import { useTotalNumErrors } from './tabs/errorsTab.hooks';
import { WarningsTab } from './tabs/warningsTab';
import { useTotalNumWarnings } from './tabs/warningsTab.hooks';
import { FocusTrapZone, Text } from '@fluentui/react';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import { Button, Tab, TabList } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { type CommonPanelProps } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const FlowCheckerPanel = (props: CommonPanelProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const flowCheckerPanelHeader = intl.formatMessage({
    defaultMessage: 'Flow Checker',
    description: 'Header for the flow checker panel',
  });

  const totalNumErrors = useTotalNumErrors();
  const errorsTab = {
    id: constants.FLOW_CHECKER_PANEL_TAB_NAMES.ERRORS,
    title: intl.formatMessage({ defaultMessage: 'Errors', description: 'The tab label for the errors tab on the checker panel' }),
    visible: true,
    order: 0,
    count: totalNumErrors,
  };

  const totalNumWarnings = useTotalNumWarnings();
  const warningsTab = {
    id: constants.FLOW_CHECKER_PANEL_TAB_NAMES.WARNINGS,
    title: intl.formatMessage({ defaultMessage: 'Warnings', description: 'The tab label for the warnings tab on the checker panel' }),
    visible: true,
    order: 1,
    count: totalNumWarnings,
  };

  const selectedTabId = useSelectedFlowCheckerPanelTabId();
  const onTabSelected = (e?: SelectTabEvent, data?: SelectTabData): void => {
    if (data) {
      const tabId = data.value as string;
      dispatch(selectFlowCheckerPanelTab(tabId));
    }
  };

  return (
    <FocusTrapZone>
      <div className="msla-app-action-header">
        <Text variant="xLarge">{flowCheckerPanelHeader}</Text>
        <Button appearance="subtle" onClick={props.toggleCollapse} icon={<CloseIcon />} />
      </div>
      <TabList selectedValue={selectedTabId} onTabSelect={onTabSelected} style={{ margin: '0px -12px' }}>
        {[errorsTab, warningsTab].map(({ id, visible, count, title }) =>
          visible ? (
            <Tab key={id} value={id} role={'tab'}>
              {`${title} (${count})`}
            </Tab>
          ) : null
        )}
      </TabList>
      {selectedTabId === constants.FLOW_CHECKER_PANEL_TAB_NAMES.ERRORS && <ErrorsTab />}
      {selectedTabId === constants.FLOW_CHECKER_PANEL_TAB_NAMES.WARNINGS && <WarningsTab />}
    </FocusTrapZone>
  );
};
