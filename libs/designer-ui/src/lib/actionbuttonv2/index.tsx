import { css, DirectionalHint, ICalloutProps, TooltipHost } from '@fluentui/react';
import { Plus } from './images/plus';

export interface ActionButtonV2Props {
  buttonRef?: React.RefObject<HTMLButtonElement>;
  className?: string;
  disabled?: boolean;
  title: string;
  onClick?(e: React.MouseEvent<HTMLElement>): void;
}

const calloutProps: ICalloutProps = {
  directionalHint: DirectionalHint.topCenter,
};

export const ActionButtonV2: React.FC<ActionButtonV2Props> = ({ buttonRef, className, disabled = false, title, onClick }) => {
  return (
    <TooltipHost calloutProps={calloutProps} content={title}>
      <button aria-label={title} className={css('msla-action-button-v2', className)} disabled={disabled} ref={buttonRef} onClick={onClick}>
        <Plus />
      </button>
    </TooltipHost>
  );
};
