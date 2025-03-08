import { Plus } from './images/plus';
import { css } from '@fluentui/react';
import { Tooltip } from '@fluentui/react-components';

export interface ActionButtonV2Props {
  id?: string;
  dataAutomationId?: string;
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
  className,
  disabled = false,
  title,
  onClick,
}) => {
  return (
    <Tooltip withArrow positioning={'before'} content={title} relationship="label" aria-expanded={undefined}>
      <button
        id={id}
        data-automation-id={dataAutomationId}
        aria-label={title}
        className={css('msla-action-button-v2', className)}
        disabled={disabled}
        onClick={onClick}
        onContextMenu={onClick}
        tabIndex={tabIndex ?? 0}
      >
        <Plus />
      </button>
    </Tooltip>
  );
};
