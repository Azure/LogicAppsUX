import InformationImage from '../../../../card/images/information_tiny.svg';
import { Text, TooltipHost } from '@fluentui/react';
import { useCallback } from 'react';

export type OperationGroupActionProps = {
  id: string;
  title: string;
  subtitle?: string;
  brandColor?: string;
  connectorName?: string;
  category: 'Built-in' | 'Azure' | '';
  onClick: (id: string) => void;
} & CommonCardProps;

export interface CommonCardProps {
  brandColor?: string;
}

export const OperationGroupAction = (props: OperationGroupActionProps) => {
  const { id, title, subtitle, connectorName, category, onClick, brandColor = '#000' } = props;

  const handleClick = useCallback(() => onClick(id), [id, onClick]);

  const tooltipProps = {
    onRenderContent: () => (
      <div>
        <div className={'msla-op-action-tooltip-title'}>{title}</div>
        <div className={'msla-op-action-tooltip-subtitle'}>{subtitle}</div>
      </div>
    ),
  };

  return (
    <button className="msla-op-action-container" onClick={handleClick}>
      <div className="msla-op-action-color-line" style={{ background: brandColor }} />
      <Text className="msla-op-action-name">{title}</Text>

      {category ? <Text className="msla-op-action-chip">{category}</Text> : null}
      {connectorName ? <Text className="msla-op-action-chip">{connectorName}</Text> : null}

      <TooltipHost tooltipProps={tooltipProps} content={subtitle}>
        <img className="msla-op-action-info" alt="" src={InformationImage} />
      </TooltipHost>
    </button>
  );
};
