import { Toaster, useToastController, type ToastIntent, makeStyles, useId } from '@fluentui/react-components';
import { useEffect, useCallback, useState } from 'react';
import { DeprecationToastContent } from './DeprecationToastContent';

const useStyles = makeStyles({
  toasterContainer: {
    // position: 'fixed',
    // bottom: '16px',
    // left: '50%',
    // transform: 'translateX(-50%)',
    // zIndex: 1000,
    // pointerEvents: 'none',
    // '& > *': {
    //   pointerEvents: 'auto',
    // },
  },
});

export interface DeprecationToastProps {
  onSwitchToV2?: () => void;
}

export const DeprecationToastProvider = ({
  children,
  onSwitchToV2,
}: {
  children: React.ReactNode;
  onSwitchToV2?: () => void;
}) => {
  const styles = useStyles();
  const toasterId = useId('data-mapper-v1-deprecation');
  const { dispatchToast, dismissToast } = useToastController(toasterId);
  const [isDismissed, setDismissed] = useState(false);

  const handleSwitchToV2 = useCallback(() => {
    dismissToast(toasterId);
    onSwitchToV2?.();
  }, [dismissToast, onSwitchToV2, toasterId]);

  const handleDismiss = useCallback(() => {
    dismissToast(toasterId);
  }, [dismissToast, toasterId]);

  useEffect(() => {
    const toastIntent: ToastIntent = 'warning';

    if (!isDismissed) {
      dispatchToast(<DeprecationToastContent onSwitchToV2={handleSwitchToV2} onDismiss={handleDismiss} />, {
        intent: toastIntent,
        toastId: toasterId,
        timeout: -1, // Never auto-dismiss
        pauseOnHover: true,
        pauseOnWindowBlur: true,
      });
      setDismissed(true);
    }
  }, [dispatchToast, handleSwitchToV2, handleDismiss, isDismissed, setDismissed, toasterId]);

  return (
    <>
      <div className={styles.toasterContainer}>
        <Toaster toasterId={toasterId} position="bottom" />
      </div>
      {children}
    </>
  );
};
