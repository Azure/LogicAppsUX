import { Plus } from './images/plus';
import { css } from '@fluentui/react';
import { Tooltip } from '@fluentui/react-components';

export interface ActionButtonV2Props {
  id?: string;
  dataAutomationId?: string;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  className?: string;
  disabled?: boolean;
  title: string;
  tabIndex?: number;
  onClick?(e: React.MouseEvent<HTMLElement>): void;
}

export const ActionButtonV2: React.FC<ActionButtonV2Props> = ({
  tabIndex,
  id,
  dataAutomationId,
  buttonRef,
  className,
  disabled = false,
  title,
  onClick,
}) => {
  return (
    <Tooltip withArrow positioning={'after'} content={title} relationship="label">
      <button
        id={id}
        data-automation-id={dataAutomationId}
        aria-label={title}
        className={css('msla-action-button-v2', className)}
        disabled={disabled}
        ref={buttonRef}
        onClick={onClick}
        onContextMenu={onClick}
        tabIndex={tabIndex ?? 0}
      >
        <Plus />
      </button>
    </Tooltip>
  );
};
