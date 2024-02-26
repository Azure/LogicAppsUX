import { Button } from '@fluentui/react-components';
import { bundleIcon, Delete24Filled, Delete24Regular, Edit24Filled, Edit24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

export interface assertionButtonProps {
  isEditable: boolean;
  isExpanded: boolean;
  onDelete: React.MouseEventHandler<HTMLButtonElement>;
  onEdit: React.MouseEventHandler<HTMLButtonElement>;
}

export const AssertionButtons = ({ onDelete, isEditable, onEdit }: assertionButtonProps): JSX.Element => {
  const intl = useIntl();
  const DeleteIcon = bundleIcon(Delete24Filled, Delete24Regular);
  const EditIcon = bundleIcon(Edit24Filled, Edit24Regular);

  const deleteAssertionText = intl.formatMessage({
    defaultMessage: 'Delete assertion',
    description: 'Create Assertion Text',
  });

  const editAssertionText = intl.formatMessage({
    defaultMessage: 'Edit assertion',
    description: 'Edit Assertion Text',
  });

  const editButton = isEditable ? (
    <Button
      appearance="subtle"
      data-testid="assertion-delete-icon-button"
      aria-label={deleteAssertionText}
      onClick={onDelete}
      icon={<DeleteIcon style={{ color: 'var(--colorBrandForeground1)' }} />}
    />
  ) : (
    <Button
      appearance="subtle"
      data-testid="assertion-edit-icon-button"
      aria-label={editAssertionText}
      onClick={onEdit}
      icon={<EditIcon style={{ color: 'var(--colorBrandForeground1)' }} />}
    />
  );

  return <div className="msla-workflow-assertion-header-buttons">{editButton}</div>;
};
