import type { CommonPanelProps } from '../panelUtil';
import { Panel, PanelType, useTheme } from '@fluentui/react';
import type { PropsWithChildren } from 'react';
import React from 'react';

export * from './interfaces';

export type RecommendationPanelProps = {
  placeholder: string;
  toggleCollapse: () => void;
} & CommonPanelProps;

export const RecommendationPanel: React.FC<PropsWithChildren<RecommendationPanelProps>> = (props) => {
  const { isInverted } = useTheme();

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
      {props.children}
    </Panel>
  );
};
