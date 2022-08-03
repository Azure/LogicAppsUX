import type { IStackTokens } from '@fluentui/react';
import { Text, Image, ImageFit, Stack } from '@fluentui/react';
import { getIntl } from '@microsoft-logic-apps/intl';

export type ConnectorSummaryCardProps = {
  onConnectorSelected: (connectorId: string) => void;
  connectorName: string;
  description?: string;
  id: string;
  iconUrl: string;
} & CommonCardProps;

export interface CommonCardProps {
  brandColor?: string;
}

export const ConnectorSummaryCard = (props: ConnectorSummaryCardProps) => {
  const intl = getIntl();

  const token: IStackTokens = {
    childrenGap: 3,
  };

  const logoAltText = intl.formatMessage(
    {
      defaultMessage: 'logo for {connectorName}',
      description: 'Alternate text for accessibility, describes logo for corresponding connector',
    },
    {
      connectorName: props.connectorName,
    }
  );

  const onConnectorCardClicked = () => {
    props.onConnectorSelected(props.id);
  };

  return (
    <Stack.Item tokens={token} grow className="msla-connector-card ms-depth-4" onClick={onConnectorCardClicked}>
      <Image imageFit={ImageFit.contain} maximizeFrame={false} className="msla-card-logo" src={props.iconUrl} alt={logoAltText}></Image>
      <Text block className="msla-card-title">
        {props.connectorName}
      </Text>
      {/* <Text className="msla-card-description">{props.description}</Text> */}
    </Stack.Item>
  );
};
