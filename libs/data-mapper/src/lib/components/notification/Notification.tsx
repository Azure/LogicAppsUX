import { Stack } from '@fluentui/react';
import { makeStyles, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { Delete20Regular, DismissCircle20Filled, Dismiss20Regular } from '@fluentui/react-icons';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';

export enum NotificationTypes {
  SaveFailed = 'saveFailed',
  SourceNodeRemoved = 'sourceNodeRemoved',
  SourceNodeRemoveFailed = 'sourceNodeRemoveFailed',
  FunctionNodeDeleted = 'functionNodeDeleted',
  ConnectionDeleted = 'connectionDeleted',
}

export interface NotificationData {
  type: NotificationTypes;
  msgParam?: any;
  msgBody?: string;
}

const useStyles = makeStyles({
  toastStyles: {
    position: 'absolute',
    bottom: '50%',
    left: '50%',
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow16,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding('12px'),
    minHeight: '44px',
  },
  msgTitleStyles: {
    ...typographyStyles.body1Strong,
    color: tokens.colorNeutralForeground1,
  },
  msgBodyStyles: {
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground1,
  },
});

export interface NotificationProps extends NotificationData {
  autoHideDuration?: number; // ms
  onClose: () => void;
}

export const Notification = (props: NotificationProps) => {
  const { type, msgParam, msgBody, autoHideDuration = 5000, onClose } = props;
  const styles = useStyles();
  const intl = useIntl();

  const notificationIcon = useMemo(() => {
    switch (type) {
      case NotificationTypes.SaveFailed:
      case NotificationTypes.SourceNodeRemoveFailed:
        return <DismissCircle20Filled />;

      default:
        return <Delete20Regular />;
    }
  }, [type]);

  const notificationMsg = useMemo(() => {
    const saveFailedLoc = intl.formatMessage({
      defaultMessage: 'Failed to save',
      description: 'Message on failed save',
    });

    const sourceNodeRemovedLoc = intl.formatMessage({
      defaultMessage: 'Source node removed from view.',
      description: 'Message on removing source node',
    });

    const sourceNodeRemoveFailedLoc = intl.formatMessage(
      {
        defaultMessage: `Remove all references to node {nodeName} before you remove the node.`,
        description: 'Message on failure to remove source node',
      },
      {
        nodeName: msgParam ?? '',
      }
    );

    const functionNodeDeletedLoc = intl.formatMessage({
      defaultMessage: `Function deleted.`,
      description: 'Message on deleting connection',
    });

    const connectionDeletedLoc = intl.formatMessage({
      defaultMessage: `Connection deleted.`,
      description: 'Message on deleting connection',
    });

    switch (type) {
      case NotificationTypes.SaveFailed:
        return saveFailedLoc;
      case NotificationTypes.SourceNodeRemoved:
        return sourceNodeRemovedLoc;
      case NotificationTypes.SourceNodeRemoveFailed:
        return sourceNodeRemoveFailedLoc;
      case NotificationTypes.FunctionNodeDeleted:
        return functionNodeDeletedLoc;
      case NotificationTypes.ConnectionDeleted:
        return connectionDeletedLoc;

      default:
        return null;
    }
  }, [type, intl, msgParam]);

  useEffect(() => {
    const timer = setTimeout(onClose, autoHideDuration);

    return () => clearTimeout(timer);
  }, [autoHideDuration, onClose]);

  return (
    <div className={styles.toastStyles}>
      <Stack horizontal verticalAlign="center">
        {notificationIcon}

        <Text>{notificationMsg}</Text>

        <Dismiss20Regular style={{ marginLeft: 'auto' }} onClick={onClose} />
      </Stack>

      {msgBody && <Text style={{ marginLeft: 'auto', marginRight: 'auto' }}>{msgBody}</Text>}
    </div>
  );
};
