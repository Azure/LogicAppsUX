import { iconForMapCheckerSeverity } from '../../utils/Icon.Utils';
import { CompoundButton, tokens } from '@fluentui/react-components';

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

export const MapCheckerItem = ({ title, description, severity, onClick }: MapCheckerItemProps) => {
  const icon = iconForMapCheckerSeverity(severity);

  return (
    <CompoundButton
      icon={icon}
      secondaryContent={description}
      style={{ width: '100%', justifyContent: 'left', margin: '5px 0px', boxShadow: tokens.shadow4 }}
      onClick={onClick}
    >
      {title}
    </CompoundButton>
  );
};
