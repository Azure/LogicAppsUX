import type { EventHandler } from '../eventhandler';
import type { WorkflowParameterDefinition } from './workflowparameter';
import type { IButtonStyles, IIconProps, ITooltipHostStyles } from '@fluentui/react';
import { IconButton, TooltipHost } from '@fluentui/react';
import { useIntl } from 'react-intl';

interface ButtonProps {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}

interface WorkflowParameterDeleteEvent {
  id: string;
}

type WorkflowParameterDeleteHandler = EventHandler<WorkflowParameterDeleteEvent>;

export interface EditOrDeleteButtonProps {
  showDelete?: boolean;
  onDelete?: WorkflowParameterDeleteHandler;
  definition: WorkflowParameterDefinition;
  setIsEditable: (value: boolean | ((prevVar: boolean | undefined) => boolean)) => void;
  setExpanded: (value: boolean | ((prevVar: boolean | undefined) => boolean)) => void;
}

export const EditOrDeleteButton = ({
  showDelete,
  onDelete,
  definition,
  setIsEditable,
  setExpanded,
}: EditOrDeleteButtonProps): JSX.Element => {
  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>): void => {
    if (onDelete) {
      e.stopPropagation();
      onDelete({ id: definition.id });
    }
  };

  const handleEdit = (): void => {
    setIsEditable(true);
    setExpanded(true);
  };
  return showDelete ? <DeleteButton onClick={handleDelete} /> : <EditButton onClick={handleEdit} />;
};

const tooltipStyles: ITooltipHostStyles = {
  root: {
    height: 'fit-content',
  },
};
const buttonStyles: IButtonStyles = {
  root: {
    alignSelf: 'flex-end',
    margin: 0,
  },
};

const deleteIcon: IIconProps = {
  iconName: 'Delete',
  styles: {
    root: {
      color: '#3AA0F3',
    },
  },
};

const editIcon: IIconProps = {
  iconName: 'Edit',
  styles: {
    root: {
      color: '#3AA0F3',
    },
  },
};

function DeleteButton({ onClick }: ButtonProps): JSX.Element {
  const intl = useIntl();

  const deleteTitle = intl.formatMessage({
    defaultMessage: 'Delete Parameter',
    description: 'Delete Button Tooltip Text',
  });

  return (
    <TooltipHost styles={tooltipStyles} content={deleteTitle}>
      <IconButton
        className="msla-delete-parameter-button"
        ariaLabel={deleteTitle}
        iconProps={deleteIcon}
        styles={buttonStyles}
        onClick={onClick}
      />
    </TooltipHost>
  );
}

function EditButton({ onClick }: ButtonProps): JSX.Element {
  const intl = useIntl();

  const editTitle = intl.formatMessage({
    defaultMessage: 'Edit Parameter',
    description: 'Edit Button Tooltip Text',
  });

  return (
    <TooltipHost content={editTitle}>
      <IconButton
        data-cy="parameter-edit-icon-button"
        className="msla-edit-parameter-button"
        ariaLabel={editTitle}
        iconProps={editIcon}
        styles={buttonStyles}
        onClick={onClick}
      />
    </TooltipHost>
  );
}
