import { Plus } from './images/plus';
import { Tooltip, mergeClasses } from '@fluentui/react-components';
import { useActionButtonV2Styles } from './actionbuttonv2.styles';

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
  const styles = useActionButtonV2Styles();

  return (
    <Tooltip withArrow positioning={'before'} content={title} relationship="label" aria-expanded={undefined}>
      <button
        id={id}
        data-automation-id={dataAutomationId}
        aria-label={title}
        className={mergeClasses(styles.root, className)}
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
