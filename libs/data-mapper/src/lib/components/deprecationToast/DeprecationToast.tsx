import { Toaster, useToastController, type ToastIntent, makeStyles } from '@fluentui/react-components';
import { useEffect, useCallback } from 'react';
import { DeprecationToastContent } from './DeprecationToastContent';

const useStyles = makeStyles({
  toasterContainer: {
    position: 'fixed',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    pointerEvents: 'none',
    '& > *': {
      pointerEvents: 'auto',
    },
  },
});

export interface DeprecationToastProps {
  onSwitchToV2?: () => void;
}

const DEPRECATION_TOAST_ID = 'data-mapper-v1-deprecation';

export const DeprecationToast = ({ onSwitchToV2 }: DeprecationToastProps) => {
  const { dispatchToast, dismissToast } = useToastController();

  const handleSwitchToV2 = useCallback(() => {
    dismissToast(DEPRECATION_TOAST_ID);
    onSwitchToV2?.();
  }, [dismissToast, onSwitchToV2]);

  const handleDismiss = useCallback(() => {
    dismissToast(DEPRECATION_TOAST_ID);
  }, [dismissToast]);

  useEffect(() => {
    const toastIntent: ToastIntent = 'warning';

    dispatchToast(<DeprecationToastContent onSwitchToV2={handleSwitchToV2} onDismiss={handleDismiss} />, {
      intent: toastIntent,
      toastId: DEPRECATION_TOAST_ID,
      timeout: -1, // Never auto-dismiss
      pauseOnHover: true,
      pauseOnWindowBlur: true,
    });
  }, [dispatchToast, handleSwitchToV2, handleDismiss]);

  return null; // This component only manages toast state, doesn't render anything itself
};

export const DeprecationToastProvider = ({
  children,
  onSwitchToV2,
}: {
  children: React.ReactNode;
  onSwitchToV2?: () => void;
}) => {
  const styles = useStyles();

  return (
    <>
      <div className={styles.toasterContainer}>
        <Toaster toasterId="data-mapper-deprecation-toaster" position="bottom" />
      </div>
      <DeprecationToast onSwitchToV2={onSwitchToV2} />
      {children}
    </>
  );
};
