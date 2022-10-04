import type { NotificationData } from '../../core/state/NotificationSlice';
import { Stack } from '@fluentui/react';
import { makeStyles, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { Delete20Regular, DismissCircle20Filled, Dismiss20Regular } from '@fluentui/react-icons';
import { useEffect } from 'react';

const useStyles = makeStyles({
  toastStyles: {
    position: 'absolute',
    bottom: '16px',
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
  const { intent, msg, msgBody, autoHideDuration = 5000, onClose } = props;
  const styles = useStyles();

  useEffect(() => {
    const timer = setTimeout(onClose, autoHideDuration);

    return () => clearTimeout(timer);
  }, [autoHideDuration, onClose]);

  return (
    <div className={styles.toastStyles}>
      <Stack horizontal verticalAlign="center">
        {intent ? <DismissCircle20Filled /> : <Delete20Regular />}

        <Text>{msg}</Text>

        <Dismiss20Regular style={{ marginLeft: 'auto' }} onClick={onClose} />
      </Stack>

      {msgBody && <Text style={{ marginLeft: 'auto', marginRight: 'auto' }}>{msgBody}</Text>}
    </div>
  );
};
