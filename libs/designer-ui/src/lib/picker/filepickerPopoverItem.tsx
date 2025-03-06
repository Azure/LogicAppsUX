import { MenuItem, MenuSplitGroup, Tooltip } from '@fluentui/react-components';
import { ChevronRight12Regular, Document28Regular, Folder28Regular } from '@fluentui/react-icons';
import type { TreeDynamicValue } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { useIntl } from 'react-intl';

export interface FilePickerPopoverItemProps {
  file: TreeDynamicValue;
  handleFolderNavigation: (item: TreeDynamicValue) => void;
  handleItemSelected: (item: TreeDynamicValue) => void;
}

export const FilePickerPopoverItem: React.FC<FilePickerPopoverItemProps> = (props) => {
  const { file, handleFolderNavigation, handleItemSelected } = props;
  const { displayName, id, isParent } = file;

  const intl = useIntl();
  const navMessage = intl.formatMessage(
    {
      defaultMessage: 'Navigate to {folderName} folder',
      id: 'cff518e24eea',
      description: 'a label that shows which folder the user will be able to dig deeper into',
    },
    {
      folderName: displayName,
    }
  );

  if (isParent) {
    return (
      <MenuSplitGroup className="msla-filepicker-item-split" key={`FilePicker.folder.${id}`}>
        <MenuItem className="msla-filepicker-item" icon={<Folder28Regular />} onClick={() => handleItemSelected(file)}>
          {displayName}
        </MenuItem>
        <Tooltip content={navMessage} relationship="label">
          <MenuItem className="msla-filepicker-item-split-chevron" onClick={() => handleFolderNavigation(file)} persistOnClick={true}>
            <ChevronRight12Regular />
          </MenuItem>
        </Tooltip>
      </MenuSplitGroup>
    );
  }

  return (
    <MenuItem
      className="msla-filepicker-item"
      icon={<Document28Regular />}
      key={`FilePicker.item.${id}`}
      onClick={() => handleItemSelected(file)}
    >
      {displayName}
    </MenuItem>
  );
};
