import { Callout, CommandButton, DirectionalHint, IButtonProps } from '@fluentui/react';
import React, { ReactNode } from 'react';
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

  return (
    <Callout
      setInitialFocus={false}
      className="msla-tip"
      directionalHint={directionalHint}
      gapSpace={gapSpace}
      target={`#${target}`}
      onDismiss={onDismiss}>
      <div className="msla-tip-inner" data-is-focusable={true} role="dialog" tabIndex={0}>
        <div className="msla-tip-message">{message}</div>
        <div className="msla-tip-actions">
          {items?.map((item) => (
            <CommandButton className="msla-tip-command-button" {...item} key={item.key}>
              {item.children}
            </CommandButton>
          ))}
        </div>
      </div>
    </Callout>
  );
};
