import InformationImage from '../../../../card/images/information_tiny.svg';
import type { OperationActionData } from '../operationGroupDetails';
import { Text, TooltipHost } from '@fluentui/react';
import { useCallback } from 'react';

export type OperationGroupActionProps = {
  operationActionData: OperationActionData;
  onClick: (id: string) => void;
} & CommonCardProps;

export interface CommonCardProps {
  brandColor?: string;
}

export const OperationGroupAction = (props: OperationGroupActionProps) => {
  const { onClick } = props;
  const { id, title, description, category, brandColor = '#000' } = props.operationActionData;

  const handleClick = useCallback(() => onClick(id), [id, onClick]);

  const tooltipProps = {
    onRenderContent: () => (
      <div>
        <div className={'msla-op-action-tooltip-title'}>{title}</div>
        {description ? <div className={'msla-op-action-tooltip-subtitle'}>{description}</div> : null}
      </div>
    ),
  };

  return (
    <button className="msla-op-action-container" onClick={handleClick}>
      <div className="msla-op-action-color-line" style={{ background: brandColor }} />
      <Text className="msla-op-action-name">{title}</Text>

      {category ? <Text className="msla-op-action-badge">{category}</Text> : null}
      {/* {connectorName ? <Text className="msla-op-action-chip">{connectorName}</Text> : null} */}
      {/* TODO: Not sure if the above section needs to be said, it's already in the heading of the component and will be the same across each tile */}

      <TooltipHost tooltipProps={tooltipProps}>
        <img className="msla-op-action-info" alt="" src={InformationImage} />
      </TooltipHost>
    </button>
  );
};
