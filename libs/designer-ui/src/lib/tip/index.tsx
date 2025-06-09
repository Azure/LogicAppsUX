import type { IButtonProps } from '@fluentui/react';
import { Callout, CommandButton, DirectionalHint } from '@fluentui/react';
import type { ReactNode } from 'react';
import { useTipStyles } from './styles';

export const DEFAULT_TIP_GAP_SPACE = 0;
export const DEFAULT_DIRECTIONAL_HINT = DirectionalHint.leftCenter;
export interface TipButton extends IButtonProps {
  children: string | JSX.Element;
  key: string;
}

export interface TipProps {
  directionalHint?: DirectionalHint;
  gapSpace?: number;
  items?: TipButton[];
  message: string | ReactNode;
  target?: string;
  onDismiss?(): void;
}

export const Tip = (props: TipProps) => {
  const { directionalHint = DEFAULT_DIRECTIONAL_HINT, gapSpace = DEFAULT_TIP_GAP_SPACE, items = [], message, onDismiss, target } = props;
  const styles = useTipStyles();

  return (
    <Callout
      setInitialFocus={false}
      className={styles.root}
      directionalHint={directionalHint}
      gapSpace={gapSpace}
      target={`#${target}`}
      onDismiss={onDismiss}
    >
      <div className={styles.inner} data-is-focusable={true} role="dialog" tabIndex={0}>
        <div className={styles.message}>{message}</div>
        <div className={styles.actions}>
          {items?.map((item) => (
            <CommandButton className={styles.commandButton} {...item} key={item.key}>
              {item.children}
            </CommandButton>
          ))}
        </div>
      </div>
    </Callout>
  );
};
