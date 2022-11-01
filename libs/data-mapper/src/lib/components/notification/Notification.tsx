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
  ArrayConnectionAdded = 'arrayConnectionAdded',
  CircularLogicError = 'circularLogicError',
  ElementsAndMappingsRemoved = 'elementsMappingsRemoved',
}

export interface NotificationData {
  type: NotificationTypes;
  msgParam?: any;
  msgBody?: string;
}

const useStyles = makeStyles({
  toastStyles: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translate(-50%, 0)',
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow16,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding('12px'),
    zIndex: 10,
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
      // Error icon
      case NotificationTypes.SaveFailed:
      case NotificationTypes.SourceNodeRemoveFailed:
      case NotificationTypes.CircularLogicError:
        return <DismissCircle20Filled style={{ color: tokens.colorPaletteRedBackground3, marginRight: 8 }} />;

      // Default icon
      default:
        return <Delete20Regular style={{ color: tokens.colorNeutralForeground1, marginRight: 8 }} />;
    }
  }, [type]);

  const LocResources = useMemo<{ [key: string]: string }>(
    () => ({
      [NotificationTypes.SaveFailed]: intl.formatMessage({
        defaultMessage: 'Failed to save.',
        description: 'Message on failed save',
      }),
      [NotificationTypes.SourceNodeRemoved]: intl.formatMessage({
        defaultMessage: 'Source element removed from view.',
        description: 'Message on removing source node',
      }),
      [NotificationTypes.SourceNodeRemoveFailed]: intl.formatMessage(
        {
          defaultMessage: `Remove all references to element ' {nodeName} ' before you remove the element.`,
          description: 'Message on failure to remove source node',
        },
        {
          nodeName: msgParam ?? '',
        }
      ),
      [NotificationTypes.FunctionNodeDeleted]: intl.formatMessage({
        defaultMessage: `Function deleted.`,
        description: 'Message on deleting connection',
      }),
      [NotificationTypes.ConnectionDeleted]: intl.formatMessage({
        defaultMessage: `Line deleted.`,
        description: 'Message on deleting connection',
      }),
      [NotificationTypes.ArrayConnectionAdded]: intl.formatMessage({
        defaultMessage: 'A line between array elements is automatically created to indicate looping elements.',
        description: 'Describes connection being added',
      }),
      [NotificationTypes.CircularLogicError]: intl.formatMessage({
        defaultMessage: 'Invalid connection, mapping must not form a closed loop.',
        description: 'Error message for circular logic connection validation',
      }),
      [NotificationTypes.ElementsAndMappingsRemoved]: intl.formatMessage({
        defaultMessage: 'Elements and mappings not connected to a target element are removed.',
        description: 'Message on switching levels with nodes/mappings not connected to a target schema node',
      }),
    }),
    [intl, msgParam]
  );

  useEffect(() => {
    const timer = setTimeout(onClose, autoHideDuration);

    return () => clearTimeout(timer);
  }, [autoHideDuration, onClose]);

  return (
    <div className={styles.toastStyles}>
      <Stack horizontal verticalAlign="start">
        {notificationIcon}

        <Stack style={{ marginRight: 12 }}>
          <Text className={styles.msgTitleStyles}>{LocResources[type]}</Text>
          {msgBody && (
            <Text className={styles.msgBodyStyles} style={{ marginTop: 4 }}>
              {msgBody}
            </Text>
          )}
        </Stack>

        <Dismiss20Regular style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={onClose} />
      </Stack>
    </div>
  );
};
