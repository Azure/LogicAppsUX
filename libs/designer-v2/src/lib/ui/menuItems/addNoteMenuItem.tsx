import { MenuItem } from '@fluentui/react-components';
import { bundleIcon, NoteAddFilled, NoteAddRegular } from '@fluentui/react-icons';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

const NoteIcon = bundleIcon(NoteAddFilled, NoteAddRegular);

export interface AddNoteMenuItemProps {
  onClick: (e: unknown) => void;
}

export const AddNoteMenuItem = (props: AddNoteMenuItemProps) => {
  const { onClick } = props;

  const intl = useIntl();

  const titleText = intl.formatMessage({
    defaultMessage: 'Add note',
    id: 'xWwv6D',
    description: 'Add Note text',
  });
  const onAddClick = useCallback<AddNoteMenuItemProps['onClick']>(
    (e) => {
      onClick(e);
      LoggerService().log({
        area: 'AddNoteMenuItem:onAddClick',
        args: ['note'],
        level: LogEntryLevel.Verbose,
        message: 'Note added.',
      });
    },
    [onClick]
  );

  return (
    <MenuItem key={titleText} icon={<NoteIcon />} onClick={onAddClick} data-automation-id={'msla-add-note-menu-option'}>
      {titleText}
    </MenuItem>
  );
};
