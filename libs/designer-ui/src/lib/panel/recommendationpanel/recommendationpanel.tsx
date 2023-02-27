import type { CommonPanelProps } from '../panelUtil';
import { IconButton, Panel, PanelType, useTheme, Text } from '@fluentui/react';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { useIntl } from 'react-intl';

export * from './interfaces';

export type RecommendationPanelProps = {
  placeholder: string;
  toggleCollapse: () => void;
} & CommonPanelProps;

export const RecommendationPanel: React.FC<PropsWithChildren<RecommendationPanelProps>> = (props) => {
  const { isInverted } = useTheme();

  const intl = useIntl();
  const headingText = intl.formatMessage({
    defaultMessage: 'Add an action',
    description: 'Text for the "Add Action" page header',
  });

  return (
    <Panel
      isLightDismiss
      type={PanelType.medium}
      isOpen={!props.isCollapsed}
      onDismiss={props.toggleCollapse}
      hasCloseButton={false}
      overlayProps={{ isDarkThemed: isInverted }}
      layerProps={{ styles: { root: { zIndex: 999998 } } }}
    >
      <div className="msla-app-action-header">
        <Text variant="xLarge">{headingText}</Text>
        <IconButton onClick={props.toggleCollapse} iconProps={{ iconName: 'Cancel' }} />
      </div>
      {props.children}
    </Panel>
  );
};
