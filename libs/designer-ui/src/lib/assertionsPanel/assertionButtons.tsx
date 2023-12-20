import { IconButton } from '@fluentui/react';
import { useIntl } from 'react-intl';

export interface assertionButtonProps {
  isEditable: boolean;
  onDelete: React.MouseEventHandler<HTMLButtonElement>;
  onSave: React.MouseEventHandler<HTMLButtonElement>;
  onEdit: React.MouseEventHandler<HTMLButtonElement>;
}

export const AssertionButtons = ({ onDelete, onSave, isEditable, onEdit }: assertionButtonProps): JSX.Element => {
  const intl = useIntl();

  const deleteAssertionText = intl.formatMessage({
    defaultMessage: 'Delete assertion',
    description: 'Create Assertion Text',
  });

  const editAssertionText = intl.formatMessage({
    defaultMessage: 'Edit assertion',
    description: 'Edit Assertion Text',
  });

  const editButton = isEditable ? (
    <IconButton ariaLabel={editAssertionText} iconProps={{ iconName: 'Save' }} onClick={onSave} />
  ) : (
    <IconButton ariaLabel={editAssertionText} iconProps={{ iconName: 'Edit' }} onClick={onEdit} />
  );

  return (
    <div className="msla-workflow-assertion-header-buttons">
      {editButton}
      <IconButton ariaLabel={deleteAssertionText} iconProps={{ iconName: 'Delete' }} onClick={onDelete} />
    </div>
  );
};
