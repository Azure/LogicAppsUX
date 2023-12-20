import type { EventHandler } from '../eventhandler';
import type { WorkflowParameterDefinition } from './workflowparameter';
import { Button, Tooltip } from '@fluentui/react-components';
import { bundleIcon, Delete24Filled, Delete24Regular, Edit24Filled, Edit24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

const DeleteIcon = bundleIcon(Delete24Filled, Delete24Regular);
const EditIcon = bundleIcon(Edit24Filled, Edit24Regular);

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

function DeleteButton({ onClick }: ButtonProps): JSX.Element {
  const intl = useIntl();

  const deleteTitle = intl.formatMessage({
    defaultMessage: 'Delete Parameter',
    description: 'Delete Button Tooltip Text',
  });

  return (
    <Tooltip relationship="label" content={deleteTitle}>
      <Button
        appearance="subtle"
        aria-label={deleteTitle}
        onClick={onClick}
        icon={<DeleteIcon style={{ color: 'var(--colorBrandForeground1)' }} />}
      />
    </Tooltip>
  );
}

function EditButton({ onClick }: ButtonProps): JSX.Element {
  const intl = useIntl();

  const editTitle = intl.formatMessage({
    defaultMessage: 'Edit parameter',
    description: 'Edit Button Tooltip Text',
  });

  return (
    <Tooltip relationship="label" content={editTitle}>
      <Button
        appearance="subtle"
        data-testid="parameter-edit-icon-button"
        aria-label={editTitle}
        onClick={onClick}
        icon={<EditIcon style={{ color: 'var(--colorBrandForeground1)' }} />}
      />
    </Tooltip>
  );
}
