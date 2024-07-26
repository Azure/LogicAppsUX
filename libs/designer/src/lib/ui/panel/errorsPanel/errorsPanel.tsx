import constants from '../../../common/constants';
import type { AppDispatch } from '../../../core';
import { useSelectedErrorsPanelTabId } from '../../../core/state/panel/panelSelectors';
import { selectErrorsPanelTab } from '../../../core/state/panel/panelSlice';
import { ErrorsTab } from './tabs/errorsTab';
import { useTotalNumErrors } from './tabs/errorsTab.hooks';
import { WarningsTab } from './tabs/warningsTab';
import { useTotalNumWarnings } from './tabs/warningsTab.hooks';
import { FocusTrapZone } from '@fluentui/react';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import { Button, Tab, TabList } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { XLargeText } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const ErrorsPanel = (props: CommonPanelProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const errorsPanelHeader = intl.formatMessage({
    defaultMessage: 'Flow Checker',
    id: 'M0bbZk',
    description: 'Header for the errors panel',
  });

  const totalNumErrors = useTotalNumErrors();
  const errorsTab = {
    id: constants.ERRORS_PANEL_TAB_NAMES.ERRORS,
    title: intl.formatMessage({
      defaultMessage: 'Errors',
      id: '5WTRY8',
      description: 'The tab label for the errors tab on the errors panel',
    }),
    visible: true,
    order: 0,
    count: totalNumErrors,
  };

  const totalNumWarnings = useTotalNumWarnings();
  const warningsTab = {
    id: constants.ERRORS_PANEL_TAB_NAMES.WARNINGS,
    title: intl.formatMessage({
      defaultMessage: 'Warnings',
      id: 'hLOIwp',
      description: 'The tab label for the warnings tab on the errors panel',
    }),
    visible: true,
    order: 1,
    count: totalNumWarnings,
  };

  const closeButtonAriaLabel = intl.formatMessage({
    defaultMessage: 'Close panel',
    id: 'ho2D6F',
    description: 'Close panel',
  });

  const visibleTabs = [errorsTab, warningsTab].filter((tab) => tab.visible);
  const defaultTabId = visibleTabs.find((tab) => tab.count > 0)?.id || visibleTabs[0]?.id;
  const selectedTabId = useSelectedErrorsPanelTabId() || defaultTabId;
  const onTabSelected = (e?: SelectTabEvent, data?: SelectTabData): void => {
    if (data) {
      const tabId = data.value as string;
      dispatch(selectErrorsPanelTab(tabId));
    }
  };

  return (
    <FocusTrapZone>
      <div className="msla-app-action-header">
        <XLargeText text={errorsPanelHeader} />
        <Button aria-label={closeButtonAriaLabel} appearance="subtle" onClick={props.toggleCollapse} icon={<CloseIcon />} />
      </div>
      <TabList selectedValue={selectedTabId} onTabSelect={onTabSelected} style={{ margin: '0px -12px' }}>
        {visibleTabs.map(({ id, count, title }) => (
          <Tab key={id} value={id} role={'tab'}>
            {`${title} (${count})`}
          </Tab>
        ))}
      </TabList>
      {selectedTabId === constants.ERRORS_PANEL_TAB_NAMES.ERRORS && <ErrorsTab />}
      {selectedTabId === constants.ERRORS_PANEL_TAB_NAMES.WARNINGS && <WarningsTab />}
    </FocusTrapZone>
  );
};
