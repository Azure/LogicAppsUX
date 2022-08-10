import type { CommonPanelProps } from '../panelUtil';
import { Panel, PanelType } from '@fluentui/react';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { PropsWithChildren } from 'react';
import React from 'react';

export type RecommendationPanelProps = {
  placeholder: string;
  toggleCollapse: () => void;
} & CommonPanelProps;

export const RecommendationPanel: React.FC<PropsWithChildren<RecommendationPanelProps>> = (props) => {
  const intl = getIntl();

  const panelLabel = intl.formatMessage({
    defaultMessage: 'panel',
    description: 'recommendation panel',
  });

  const header = intl.formatMessage({
    defaultMessage: 'Operations',
    description: 'Operations in search panel',
  });

  // const browsePivotAriaLabel = intl.formatMessage({
  //   defaultMessage: 'Choose which view to browse from',
  //   description: 'Aria label for pivot to determine browse view',
  // });

  // const browseConnectorsPivotText = intl.formatMessage({
  //   defaultMessage: 'Connectors',
  //   description: 'Selected view connector for browse',
  // });

  return (
    <Panel
      headerText={header}
      aria-label={panelLabel}
      type={PanelType.medium}
      isOpen={!props.isCollapsed}
      onDismiss={props.toggleCollapse}
      closeButtonAriaLabel="close"
    >
      {/* <Pivot aria-label={browsePivotAriaLabel}>
        <PivotItem
          headerText={browseConnectorsPivotText}
          headerButtonProps={{
            'data-order': 1,
            'data-title': 'My Files Title',
          }}
        />
      </Pivot> */}
      <div style={{ overflow: 'auto', margin: '0px -24px', padding: '0px 24px 16px' }}>{props.children}</div>
    </Panel>
  );
};
