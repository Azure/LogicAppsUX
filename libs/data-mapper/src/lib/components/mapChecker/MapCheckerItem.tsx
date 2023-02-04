import type { RootState } from '../../core/state/Store';
import { iconForMapCheckerSeverity } from '../../utils/Icon.Utils';
import { selectedCardStyles } from '../nodeCard/NodeCard';
import { CompoundButton, tokens } from '@fluentui/react-components';
import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

export enum MapCheckerItemSeverity {
  Error,
  Warning,
  Info,
  Unknown,
}

export interface MapCheckerEntry {
  title: string;
  description: string;
  severity: MapCheckerItemSeverity;
  reactFlowId: string;
}

export interface MapCheckerItemProps extends MapCheckerEntry {
  onClick: () => void;
}

export const MapCheckerItem = ({ title, description, severity, reactFlowId, onClick }: MapCheckerItemProps) => {
  const selectedItemKey = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKey);

  const isCurrentNodeSelected = useMemo<boolean>(() => selectedItemKey === reactFlowId, [reactFlowId, selectedItemKey]);

  const icon = iconForMapCheckerSeverity(severity);

  let buttonStyle: CSSProperties = { width: '100%', justifyContent: 'left', margin: '5px 0px', boxShadow: tokens.shadow4 };
  if (isCurrentNodeSelected) {
    buttonStyle = {
      ...buttonStyle,
      ...selectedCardStyles,
    };
  }

  return (
    <CompoundButton icon={icon} secondaryContent={description} style={buttonStyle} onClick={onClick}>
      {title}
    </CompoundButton>
  );
};
