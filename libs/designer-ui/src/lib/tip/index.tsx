import type { PositioningShorthand } from '@fluentui/react-components';
import { Button, Popover, PopoverSurface, PopoverTrigger } from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { useTipStyles } from './styles';

export const DEFAULT_TIP_GAP_SPACE = 0;
export interface TipButton {
  children: string | JSX.Element;
  key: string;
  onClick?: (ev: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
}

export interface TipProps {
  positioning?: PositioningShorthand;
  gapSpace?: number;
  items?: TipButton[];
  message: string | ReactNode;
  target?: string;
  onDismiss?(): void;
}

export const Tip = (props: TipProps) => {
  const { positioning = 'after', gapSpace = DEFAULT_TIP_GAP_SPACE, items = [], message, onDismiss, target } = props;
  const styles = useTipStyles();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(true);
  }, [target]);

  const handleOpenChange = (_: unknown, data: { open: boolean }) => {
    setOpen(data.open);
    if (!data.open && onDismiss) {
      onDismiss();
    }
  };

  if (!target) {
    return null;
  }

  const targetElement = document.querySelector(`#${target}`);
  if (!targetElement) {
    return null;
  }

  const positioningConfig =
    typeof positioning === 'string' ? { position: positioning as any, offset: gapSpace } : { ...positioning, offset: gapSpace };

  return (
    <Popover withArrow open={open} onOpenChange={handleOpenChange} positioning={positioningConfig}>
      <PopoverTrigger disableButtonEnhancement>
        <div
          ref={(el) => {
            if (el && targetElement) {
              // Position the popover relative to the target element
              const rect = targetElement.getBoundingClientRect();
              el.style.position = 'fixed';
              el.style.left = `${rect.left}px`;
              el.style.top = `${rect.top}px`;
              el.style.width = `${rect.width}px`;
              el.style.height = `${rect.height}px`;
              el.style.pointerEvents = 'none';
            }
          }}
        />
      </PopoverTrigger>
      <PopoverSurface className={styles.root}>
        <div className={styles.inner} role="dialog">
          <div className={styles.message}>{message}</div>
          <div className={styles.actions}>
            {items?.map(({ key, children, onClick, disabled, className }) => (
              <Button
                className={`${styles.commandButton} ${className || ''}`}
                key={key}
                onClick={onClick}
                disabled={disabled}
                appearance="subtle"
                size="small"
              >
                {children}
              </Button>
            ))}
          </div>
        </div>
      </PopoverSurface>
    </Popover>
  );
};
