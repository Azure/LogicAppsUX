import type { EventHandler } from '../eventhandler';
import type { WorkflowParameterDefinition } from './workflowparameter';
import { Button, Tooltip } from '@fluentui/react-components';
import { bundleIcon, Delete24Filled, Delete24Regular, Edit24Filled, Edit24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

const DeleteIcon = bundleIcon(Delete24Filled, Delete24Regular);
const EditIcon = bundleIcon(Edit24Filled, Edit24Regular);

interface ButtonProps {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  definition: WorkflowParameterDefinition;
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

  return showDelete ? (
    <DeleteButton onClick={handleDelete} definition={definition} />
  ) : (
    <EditButton onClick={handleEdit} definition={definition} />
  );
};

function DeleteButton({ onClick, definition }: ButtonProps): JSX.Element {
  const intl = useIntl();

  const deleteTitle = intl.formatMessage({
    defaultMessage: 'Delete parameter',
    id: 'aac2ff7c4ddc',
    description: 'Delete Button Tooltip Text',
  });

  return (
    <Tooltip relationship="label" content={deleteTitle}>
      <Button
        appearance="subtle"
        data-automation-id={`${definition.id}-parameter-delete-button`}
        aria-label={deleteTitle}
        onClick={onClick}
        icon={<DeleteIcon style={{ color: 'var(--colorBrandForeground1)' }} />}
      />
    </Tooltip>
  );
}

function EditButton({ onClick, definition }: ButtonProps): JSX.Element {
  const intl = useIntl();

  const editTitle = intl.formatMessage({
    defaultMessage: 'Edit parameter',
    id: 'd3744ee5de44',
    description: 'Edit Button Tooltip Text',
  });

  return (
    <Tooltip relationship="label" content={editTitle}>
      <Button
        appearance="subtle"
        data-automation-id={`${definition.id}-parameter-edit-button`}
        aria-label={editTitle}
        onClick={onClick}
        icon={<EditIcon style={{ color: 'var(--colorBrandForeground1)' }} />}
      />
    </Tooltip>
  );
}
