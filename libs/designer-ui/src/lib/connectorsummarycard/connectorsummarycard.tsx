import type { IIconProps, IStackTokens } from '@fluentui/react';
import { Text, Image, ImageFit, Stack, TooltipHost, IconButton } from '@fluentui/react';
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

  const infoButtonText = intl.formatMessage(
    {
      defaultMessage: 'description for {connectorName}',
      description: 'Alternate text for accessibility, describes that button shows description for connector',
    },
    {
      connectorName: props.connectorName,
    }
  );

  const onConnectorCardClicked = () => {
    props.onConnectorSelected(props.id);
  };

  const calloutProps = { gapSpace: 0 };
  const emojiIcon: IIconProps = { iconName: 'info' };

  return (
    <Stack.Item tokens={token} className="msla-connector-card ms-depth-4" onClick={onConnectorCardClicked}>
      <Image imageFit={ImageFit.contain} maximizeFrame={false} className="msla-card-logo" src={props.iconUrl} alt={logoAltText}></Image>
      <Text block className="msla-card-title">
        {props.connectorName}
      </Text>
      <TooltipHost
        content={props.description}
        // danielle will pull this out to be reused
        id="1"
        calloutProps={calloutProps}
        setAriaDescribedBy={false}
      >
        <IconButton iconProps={emojiIcon} aria-label={infoButtonText} />
      </TooltipHost>
      {/* <Text className="msla-card-description">{props.description}</Text> */}
    </Stack.Item>
  );
};
