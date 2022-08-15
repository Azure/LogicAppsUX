import { InfoDot } from '../infoDot';
import { Text, Image, ImageFit, css } from '@fluentui/react';

export interface ConnectorSummaryCardProps {
  id: string;
  connectorName: string;
  description?: string;
  iconUrl: string;
  brandColor?: string;
  category: string;
  onClick?: (id: string) => void;
  isCard?: boolean;
}

export const ConnectorSummaryCard = (props: ConnectorSummaryCardProps) => {
  const { id, connectorName, description, iconUrl, category, onClick, isCard = true } = props;

  const handleClick = () => onClick?.(id);

  const ConnectorImage = () => (
    <Image
      className={css('msla-connector-summary-image', !isCard && 'large')}
      alt={connectorName}
      src={iconUrl}
      imageFit={ImageFit.contain}
    />
  );

  const Content = () => (
    <>
      <div className="msla-connector-summary-header">
        {isCard ? <ConnectorImage /> : null}
        <Text className="msla-connector-summary-title">{connectorName}</Text>
        <InfoDot title={connectorName} description={description} style={!isCard ? { marginRight: '8px' } : undefined} />
      </div>
      <div className="msla-connector-summary-labels">{category ? <Text className="msla-psuedo-badge">{category}</Text> : null}</div>
    </>
  );

  if (isCard)
    return (
      <button className="msla-connector-summary-card" onClick={handleClick}>
        <Content />
      </button>
    );

  return (
    <div className="msla-connector-summary-display">
      <ConnectorImage />
      <div style={{ flexGrow: 1 }}>
        <Content />
      </div>
    </div>
  );
};
