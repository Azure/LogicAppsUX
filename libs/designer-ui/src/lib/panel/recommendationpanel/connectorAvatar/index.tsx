import { Avatar, type AvatarProps } from '@fluentui/react-components';
import { ArrowFlowUpRightFilled } from '@fluentui/react-icons';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';

interface IApiReference {
  id: string;
  displayName: string;
  iconUri: string;
  brandColor?: string;
  isCustomApi?: boolean;
}

export type ConnectorAvatarProps = IApiReference & Partial<AvatarProps>;

export const ConnectorAvatar = ({
  id: connectorId,
  displayName,
  iconUri,
  brandColor,
  isCustomApi,
  ...avatarProps
}: ConnectorAvatarProps) => {
  return (
    <Avatar
      {...avatarProps}
      role="presentation"
      shape="square"
      image={{ src: iconUri, style: { backgroundColor: 'unset' } }}
      onError={() => {
        // We don't want to log custom connector image failures since it is provided by users and is a user error
        if (!isCustomApi) {
          LoggerService().log({
            level: LogEntryLevel.Error,
            area: 'ConnectorAvatar.onError',
            message: 'Connector image failed to load.',
            args: [iconUri, connectorId],
          });
        }
      }}
      icon={<ArrowFlowUpRightFilled style={{ color: brandColor }} />}
      title={displayName || undefined} // Convert blank string to undefined so no title is shown.
    />
  );
};
