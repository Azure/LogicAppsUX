import { Plus } from './plus';
import { Tooltip, mergeClasses } from '@fluentui/react-components';
import { useAddButtonStyles } from './addButton.styles';
import { useIsDarkMode } from '../../../core/state/designerOptions/designerOptionsSelectors';

export interface AddButtonProps {
  id?: string;
  dataAutomationId?: string;
  className?: string;
  disabled?: boolean;
  title: string;
  tabIndex?: number;
  onClick?(e: React.MouseEvent<HTMLElement>): void;
}

export const AddButton: React.FC<AddButtonProps> = ({ tabIndex, id, dataAutomationId, className, disabled = false, title, onClick }) => {
  const styles = useAddButtonStyles();
  const isDarkMode = useIsDarkMode();

  return (
    <Tooltip withArrow positioning={'before'} content={title} relationship="label" aria-expanded={undefined}>
      <button
        id={id}
        data-automation-id={dataAutomationId}
        aria-label={title}
        className={mergeClasses(styles.root, isDarkMode && styles.rootDark, className)}
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
