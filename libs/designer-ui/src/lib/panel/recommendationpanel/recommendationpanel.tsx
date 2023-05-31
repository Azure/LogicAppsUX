import type { CommonPanelProps } from '../panelUtil';
import { PanelLocation } from '../panelUtil';
import { IconButton, Panel, PanelType, useTheme, Text } from '@fluentui/react';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { useIntl } from 'react-intl';

export * from './interfaces';

export type RecommendationPanelProps = {
  isTrigger: boolean;
  placeholder: string;
  toggleCollapse: () => void;
} & CommonPanelProps;

export const RecommendationPanel: React.FC<PropsWithChildren<RecommendationPanelProps>> = (props) => {
  const { isInverted } = useTheme();

  const intl = useIntl();
  const headingText = props.isTrigger
    ? intl.formatMessage({ defaultMessage: 'Add a trigger', description: 'Text for the "Add Trigger" page header' })
    : intl.formatMessage({ defaultMessage: 'Add an action', description: 'Text for the "Add Action" page header' });

  return (
    <Panel
      isLightDismiss
      type={props.panelLocation === PanelLocation.Right ? PanelType.medium : PanelType.customNear}
      isOpen={!props.isCollapsed}
      onDismiss={props.toggleCollapse}
      hasCloseButton={false}
      focusTrapZoneProps={{ disabled: props.isCollapsed }}
      overlayProps={{ isDarkThemed: isInverted }}
      layerProps={props.layerProps}
      customWidth={props.width}
    >
      <div className="msla-app-action-header">
        <Text variant="xLarge">{headingText}</Text>
        <IconButton onClick={props.toggleCollapse} iconProps={{ iconName: 'Cancel' }} />
      </div>
      {props.children}
    </Panel>
  );
};
