import { Image, ImageFit } from '@fluentui/react';

export interface OperationGroupHeaderProps {
  id: string;
  title: string;
  description?: string;
  iconUrl: string;
}

export const OperationGroupHeader = (props: OperationGroupHeaderProps) => {
  const { id, title, description, iconUrl } = props;

  return (
    <div id={id} className="msla-op-group-header">
      <Image className="msla-op-group-image" alt={title} src={iconUrl} imageFit={ImageFit.contain} />
      <div className="msla-op-group-info">
        <span className="msla-op-group-title">{title}</span>
        <span className="msla-op-group-subtitle">{description}</span>
      </div>
    </div>
  );
};
