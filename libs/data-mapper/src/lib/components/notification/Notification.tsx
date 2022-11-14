import { undoDataMapOperation } from '../../core/state/DataMapSlice';
import type { AppDispatch } from '../../core/state/Store';
import { Stack } from '@fluentui/react';
import { Button, makeStyles, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { Delete20Regular, DismissCircle20Filled, Dismiss20Regular, Info20Filled } from '@fluentui/react-icons';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

export enum NotificationTypes {
  SaveFailed = 'saveFailed',
  SourceNodeRemoved = 'sourceNodeRemoved',
  SourceNodeRemoveFailed = 'sourceNodeRemoveFailed',
  TargetNodeCannotDelete = 'targetNodeCannotDelete',
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
  autoHideDurationMs?: number;
}

const defaultNotificationAutoHideDuration = 5000; // ms
export const deletedNotificationAutoHideDuration = 3000;
export const errorNotificationAutoHideDuration = 7000;

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
  const { type, msgParam, msgBody, autoHideDuration = defaultNotificationAutoHideDuration, onClose } = props;
  const dispatch = useDispatch<AppDispatch>();
  const styles = useStyles();
  const intl = useIntl();

  const notificationIcon = useMemo(() => {
    switch (type) {
      // Error icon
      case NotificationTypes.SaveFailed:
      case NotificationTypes.SourceNodeRemoveFailed:
      case NotificationTypes.CircularLogicError:
      case NotificationTypes.TargetNodeCannotDelete:
        return <DismissCircle20Filled style={{ color: tokens.colorPaletteRedBackground3, marginRight: 8 }} />;

      // Delete icon
      case NotificationTypes.SourceNodeRemoved:
      case NotificationTypes.ConnectionDeleted:
      case NotificationTypes.FunctionNodeDeleted:
        return <Delete20Regular style={{ color: tokens.colorNeutralForeground1, marginRight: 8 }} />;

      // Default icon (info)
      default:
        return <Info20Filled style={{ color: tokens.colorNeutralForeground2, marginRight: 8 }} />;
    }
  }, [type]);

  const undoLoc = intl.formatMessage({
    defaultMessage: 'Undo',
    description: 'Undo',
  });

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
      [NotificationTypes.TargetNodeCannotDelete]: intl.formatMessage({
        defaultMessage: `Target Schema element cannot be deleted`,
        description: 'Message informing that target element cannot be removed',
      }),
      [NotificationTypes.FunctionNodeDeleted]: intl.formatMessage({
        defaultMessage: `Function deleted.`,
        description: 'Message on deleting connection',
      }),
      [NotificationTypes.ConnectionDeleted]: intl.formatMessage({
        defaultMessage: `Line deleted.`,
        description: 'Message on deleting connection',
      }),
      [NotificationTypes.ArrayConnectionAdded]: intl.formatMessage({
        defaultMessage: 'A line for the parent element is added automatically.',
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

  const handleDataMapUndo = () => {
    dispatch(undoDataMapOperation());
  };

  useEffect(() => {
    const timer = setTimeout(onClose, autoHideDuration);

    return () => clearTimeout(timer);
  }, [autoHideDuration, onClose]);

  return (
    <div className={styles.toastStyles}>
      <Stack horizontal verticalAlign="center">
        {notificationIcon}

        <Stack style={{ marginRight: 12 }}>
          <Text className={styles.msgTitleStyles}>{LocResources[type]}</Text>
          {msgBody && (
            <Text className={styles.msgBodyStyles} style={{ marginTop: 4 }}>
              {msgBody}
            </Text>
          )}
        </Stack>

        <div style={{ marginLeft: 'auto' }}>
          {type === NotificationTypes.ElementsAndMappingsRemoved ? (
            <Button appearance="transparent" onClick={handleDataMapUndo}>
              {undoLoc}
            </Button>
          ) : (
            <Dismiss20Regular style={{ cursor: 'pointer' }} onClick={onClose} />
          )}
        </div>
      </Stack>
    </div>
  );
};
