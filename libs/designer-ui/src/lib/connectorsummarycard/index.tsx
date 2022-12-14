import { InfoDot } from '../infoDot';
import { Text, css } from '@fluentui/react';
import { isBuiltInConnector } from '@microsoft/utils-logic-apps';

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

  const fallbackUrl =
    'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHdpZHRoPSIzMnB4IiBoZWlnaHQ9IjMycHgiIHZpZXdCb3g9IjAgMCAzMiAzMiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMzIgMzI7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+DQoJLnN0MHtmaWxsOiM0RTRGNEY7fQ0KCS5zdDF7ZmlsbDojRkZGRkZGO30NCjwvc3R5bGU+DQo8ZyBpZD0iWE1MSURfMzM4XyI+DQoJPHJlY3QgeD0iMCIgeT0iMCIgY2xhc3M9InN0MCIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIi8+DQo8L2c+DQo8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMTEuODgsNXY1LjVIOS4xM3Y0LjEzYzAsMy41NiwyLjcyLDYuNDksNi4xOSw2Ljg0VjI3aDEuMzd2LTUuNTNjMy40Ny0wLjM1LDYuMTktMy4yOCw2LjE5LTYuODRWMTAuNWgtMi43NVY1DQoJaC0xLjM4djUuNWgtNS41VjVIMTEuODh6IE0yMS41LDE0LjYzYzAsMy4wMy0yLjQ3LDUuNS01LjUsNS41cy01LjUtMi40Ny01LjUtNS41di0yLjc1aDExVjE0LjYzeiIvPg0KPC9zdmc+DQo=';
  const ConnectorImage = () => (
    <img className={css('msla-connector-summary-image', !isCard && 'large')} alt={connectorName} src={iconUrl ?? fallbackUrl} />
  );

  const isBuiltIn = isBuiltInConnector(id);

  const Content = () => (
    <>
      <div className="msla-connector-summary-header">
        {isCard ? <ConnectorImage /> : null}
        <Text className="msla-connector-summary-title">{connectorName}</Text>
        <InfoDot title={connectorName} description={description} style={!isCard ? { marginRight: '8px' } : undefined} />
      </div>
      <div className="msla-connector-summary-labels">{isBuiltIn ? <Text className="msla-psuedo-badge">{category}</Text> : null}</div>
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
