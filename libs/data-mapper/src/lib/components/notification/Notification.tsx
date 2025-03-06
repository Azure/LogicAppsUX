import type { AppDispatch } from '../../core/state/Store';
import { Stack, StackItem } from '@fluentui/react';
import { Button, Text, makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';
import { Delete20Regular, Dismiss20Regular, DismissCircle20Filled, Info20Filled } from '@fluentui/react-icons';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { ActionCreators } from 'redux-undo';

export const NotificationTypes = {
  GenerateFailed: 'generateFailed',
  MapHasErrorsAtSave: 'mapHasErrorsAtSave',
  SourceNodeRemoved: 'sourceNodeRemoved',
  SourceNodeRemoveFailed: 'sourceNodeRemoveFailed',
  TargetNodeCannotDelete: 'targetNodeCannotDelete',
  RepeatingConnectionCannotDelete: 'repeatingConnectionCannotDelete',
  FunctionNodePartiallyDeleted: 'functionNodePartiallyDeleted',
  FunctionNodeDeleted: 'functionNodeDeleted',
  ConnectionDeleted: 'connectionDeleted',
  ArrayConnectionAdded: 'arrayConnectionAdded',
  CircularLogicError: 'circularLogicError',
  ElementsAndMappingsRemoved: 'elementsMappingsRemoved',
} as const;
export type NotificationTypes = (typeof NotificationTypes)[keyof typeof NotificationTypes];

export interface NotificationData {
  type: NotificationTypes;
  msgParam?: any;
  msgBody?: string;
  // -1 to disable auto hide
  autoHideDurationMs?: number;
}

const defaultNotificationAutoHideDuration = 5000; // ms
export const deletedNotificationAutoHideDuration = 3000;
export const errorNotificationAutoHideDuration = 7000;
export const disabledAutoHide = -1;

const useStyles = makeStyles({
  toast: {
    minWidth: '320px',
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translate(-50%, 0)',
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow16,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding('12px'),
    zIndex: 120,
  },
  msgTitle: {
    ...typographyStyles.body1Strong,
    color: tokens.colorNeutralForeground1,
  },
  msgBody: {
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground1,
  },
  actionButton: {
    display: 'block',
    minWidth: '60px',
    color: tokens.colorBrandForeground1,
    ...shorthands.padding('0px'),
  },
});

export interface NotificationProps extends NotificationData {
  autoHideDuration?: number; // ms
  openMapChecker: () => void;
  onClose: () => void;
}

export const Notification = (props: NotificationProps) => {
  const { type, msgParam, msgBody, autoHideDuration = defaultNotificationAutoHideDuration, openMapChecker, onClose } = props;
  const dispatch = useDispatch<AppDispatch>();
  const styles = useStyles();
  const intl = useIntl();

  const notificationIcon = useMemo(() => {
    switch (type) {
      // Warning icon
      //case NotificationTypes.None:
      //return <Warning20Filled style={{ color: tokens.colorPaletteGoldBorderActive, marginRight: 8 }} />;

      // Error icon
      case NotificationTypes.GenerateFailed:
      case NotificationTypes.MapHasErrorsAtSave:
      case NotificationTypes.RepeatingConnectionCannotDelete:
      case NotificationTypes.SourceNodeRemoveFailed:
      case NotificationTypes.CircularLogicError:
      case NotificationTypes.TargetNodeCannotDelete:
        return <DismissCircle20Filled style={{ color: tokens.colorPaletteRedBackground3, marginRight: 8 }} />;

      // Delete icon
      case NotificationTypes.SourceNodeRemoved:
      case NotificationTypes.ConnectionDeleted:
      case NotificationTypes.FunctionNodePartiallyDeleted:
      case NotificationTypes.FunctionNodeDeleted:
        return <Delete20Regular style={{ color: tokens.colorNeutralForeground1, marginRight: 8 }} />;

      // Default icon (info)
      default:
        return <Info20Filled style={{ color: tokens.colorNeutralForeground2, marginRight: 8 }} />;
    }
  }, [type]);

  const undoLoc = intl.formatMessage({
    defaultMessage: 'Undo',
    id: 'e04927f6de14',
    description: 'Undo',
  });

  const showMeLoc = intl.formatMessage({
    defaultMessage: 'Show me',
    id: 'b967ff23950f',
    description: 'Button to open map checker',
  });

  const issueLoc = intl.formatMessage({
    defaultMessage: 'issue',
    id: '46705d74dd5c',
    description: 'Issue, singular',
  });

  const issuesLoc = intl.formatMessage({
    defaultMessage: 'issues',
    id: '489155c5f2ff',
    description: 'Issues, plural',
  });

  const LocResources = useMemo<{ [key: string]: string }>(
    () => ({
      [NotificationTypes.GenerateFailed]: intl.formatMessage({
        defaultMessage: 'Failed to generate XSLT.',
        id: '7bd6c82a17a7',
        description: 'Message on failed generation',
      }),
      [NotificationTypes.MapHasErrorsAtSave]: intl.formatMessage(
        {
          defaultMessage: 'The current map contains {numOfIssues} {issue}.',
          id: '240215d2178d',
          description: 'Message when failing to save due to errors',
        },
        {
          numOfIssues: msgParam ?? '',
          issue: msgParam === 1 ? issueLoc : issuesLoc,
        }
      ),
      [NotificationTypes.SourceNodeRemoved]: intl.formatMessage({
        defaultMessage: 'Source element removed from view.',
        id: '03915eae1bcb',
        description: 'Message on removing source node',
      }),
      [NotificationTypes.SourceNodeRemoveFailed]: intl.formatMessage(
        {
          defaultMessage: `Remove all references to element ' {nodeName} ' before you remove the element.`,
          id: '95ec73809237',
          description: 'Message on failure to remove source node',
        },
        {
          nodeName: msgParam ?? '',
        }
      ),
      [NotificationTypes.RepeatingConnectionCannotDelete]: intl.formatMessage(
        {
          defaultMessage: 'Remove all mappings within source element `{nodeName}` first.',
          id: 'dca3cba71654',
          description: 'Message informing that mapping to child elements need to be deleted prior to selected one.',
        },
        { nodeName: msgParam ?? '' }
      ),
      [NotificationTypes.TargetNodeCannotDelete]: intl.formatMessage({
        defaultMessage: "Target schema element can't be deleted.",
        id: 'bab99ff800e3',
        description: 'Message informing that target element cannot be removed',
      }),
      [NotificationTypes.FunctionNodePartiallyDeleted]: intl.formatMessage({
        defaultMessage: 'Function was removed from the current location and currently exists elsewhere.',
        id: 'a3f160113ae4',
        description: 'Message to show when deleting a connection that exists in multiple places.',
      }),
      [NotificationTypes.FunctionNodeDeleted]: intl.formatMessage({
        defaultMessage: 'Function deleted.',
        id: '984ef0f46447',
        description: 'Message on deleting connection',
      }),
      [NotificationTypes.ConnectionDeleted]: intl.formatMessage({
        defaultMessage: 'Line deleted.',
        id: '07df7d9b35bb',
        description: 'Message on deleting connection',
      }),
      [NotificationTypes.ArrayConnectionAdded]: intl.formatMessage({
        defaultMessage: 'A line for the parent element is added automatically.',
        id: '95034a501c67',
        description: 'Describes connection being added',
      }),
      [NotificationTypes.CircularLogicError]: intl.formatMessage({
        defaultMessage: 'Invalid connection, mapping must not form a closed loop.',
        id: '1f956290254f',
        description: 'Error message for circular logic connection validation',
      }),
      [NotificationTypes.ElementsAndMappingsRemoved]: intl.formatMessage({
        defaultMessage: `Elements and mappings that aren't connected to a target element are removed.`,
        id: '91c3a17e1e92',
        description: 'The message to show when switching levels without connecting nodes or mappings to a target schema node.',
      }),
    }),
    [intl, issueLoc, issuesLoc, msgParam]
  );

  useEffect(() => {
    if (autoHideDuration >= 0) {
      const timer = setTimeout(onClose, autoHideDuration);
      return () => clearTimeout(timer);
    }
    return;
  }, [autoHideDuration, onClose]);

  const callToAction = useMemo(() => {
    switch (type) {
      // Open map checker
      case NotificationTypes.MapHasErrorsAtSave:
        return (
          <StackItem>
            <Button className={styles.actionButton} appearance="transparent" onClick={openMapChecker}>
              {showMeLoc}
            </Button>
          </StackItem>
        );

      // Undo
      case NotificationTypes.ElementsAndMappingsRemoved:
        return (
          <StackItem>
            <Button className={styles.actionButton} appearance="transparent" onClick={() => dispatch(ActionCreators.undo())}>
              {undoLoc}
            </Button>
          </StackItem>
        );

      // Default - Dismiss notification
      default:
        return (
          <StackItem>
            <Dismiss20Regular style={{ cursor: 'pointer' }} onClick={onClose} />
          </StackItem>
        );
    }
  }, [type, styles.actionButton, openMapChecker, showMeLoc, undoLoc, onClose, dispatch]);

  return (
    <div className={styles.toast}>
      <Stack horizontal>
        <StackItem>{notificationIcon}</StackItem>
        <StackItem grow>
          <Stack style={{ marginRight: 12 }}>
            <Text className={styles.msgTitle}>{LocResources[type]}</Text>
            {msgBody && (
              <Text className={styles.msgBody} style={{ marginTop: 4 }}>
                {msgBody}
              </Text>
            )}
          </Stack>
        </StackItem>
        {callToAction}
      </Stack>
    </div>
  );
};
