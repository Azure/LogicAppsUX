import { Plus } from './images/plus';
import type { ICalloutProps } from '@fluentui/react';
import { css, DirectionalHint, TooltipHost } from '@fluentui/react';

export interface ActionButtonV2Props {
  id?: string;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  className?: string;
  disabled?: boolean;
  title: string;
  onClick?(e: React.MouseEvent<HTMLElement>): void;
}

const calloutProps: ICalloutProps = {
  directionalHint: DirectionalHint.topCenter,
};

export const ActionButtonV2: React.FC<ActionButtonV2Props> = ({ id, buttonRef, className, disabled = false, title, onClick }) => {
  return (
    <TooltipHost calloutProps={calloutProps} content={title}>
      <button
        id={id}
        aria-label={title}
        className={css('msla-action-button-v2', className)}
        disabled={disabled}
        ref={buttonRef}
        onClick={onClick}
        onContextMenu={onClick}
      >
        <Plus />
      </button>
    </TooltipHost>
  );
};
