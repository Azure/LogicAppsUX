import { IMessageBarProps, MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import * as React from 'react';
import { useIntl } from 'react-intl';

export interface InfoControlProps {
  dismissButtonAriaLabel?: string;
  dismissible?: boolean;

  /**
   * @deprecated Use messageBarType instead.
   */
  icon?: string;

  infoText: string;
  messageBarType?: MessageBarType;
  onDismissClicked?(): void;
}

export const InfoControl: React.FC<InfoControlProps> = (props) => {
  const intl = useIntl();
  const dismissTextAriaLabelDefault = intl.formatMessage({
    defaultMessage: 'Dismiss',
    id: 'GLahvg',
    description: 'Accessability label on a button to dismiss an info banner',
  });
  const { dismissButtonAriaLabel, dismissible, infoText: children, messageBarType, onDismissClicked: onDismiss } = props;
  const ariaLabelMessage = dismissButtonAriaLabel ?? dismissTextAriaLabelDefault;
  const barprops: IMessageBarProps = {
    children,
    messageBarType,
    ...(dismissible ? { dismissButtonAriaLabel: ariaLabelMessage, onDismiss } : undefined),
  };

  return <MessageBar {...barprops} />;
};
