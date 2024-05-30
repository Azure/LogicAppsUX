import type { FilePickerBreadcrumb } from './types';
import {
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuSplitGroup,
  Spinner,
} from '@fluentui/react-components';
import { ChevronRight12Regular, Document28Regular, Folder28Regular } from '@fluentui/react-icons';
import type { TreeDynamicValue } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { useIntl } from 'react-intl';
import { FilePickerPopoverHeader } from './filepickerPopoverHeader';

export interface FilePickerProps {
  currentPathSegments: FilePickerBreadcrumb[];
  errorDetails?: { message: string };
  files: TreeDynamicValue[];
  handleFolderNavigation: (item: TreeDynamicValue) => void;
  handleItemSelected: (item: TreeDynamicValue) => void;
  loadingFiles?: boolean;
}

export const FilePickerPopover: React.FC<FilePickerProps> = (props) => {
  const { currentPathSegments, errorDetails, files, handleFolderNavigation, handleItemSelected, loadingFiles } = props;

  const intl = useIntl();

  const loadingMessage = intl.formatMessage({
    defaultMessage: 'Loading Files...',
    id: 'O27gKq',
    description: 'Loading indicator message showing that the UX is getting the next list of files',
  });

  const noItemsMessage = intl.formatMessage({
    defaultMessage: 'No items',
    id: 'Q8HCYK',
    description: 'Message to show when there are no items to show',
  });

  let listContent: JSX.Element;

  if (loadingFiles) {
    listContent = (
      <div className="msla-filepicker-no-list-content">
        <Spinner label={loadingMessage} />
      </div>
    );
  } else if (files.length === 0) {
    listContent = <div className="msla-filepicker-no-list-message">{noItemsMessage}</div>;
  } else if (errorDetails?.message) {
    listContent = <div className="msla-filepicker-no-list-message">{errorDetails.message}</div>;
  } else {
    listContent = (
      <MenuList className="msla-filepicker-item-list">
        {files.map((file) =>
          file.isParent ? (
            <MenuSplitGroup className="msla-filepicker-item-split" key={`FilePicker.folder.${file.value.Id}`}>
              <MenuItem className="msla-filepicker-item" icon={<Folder28Regular />} onClick={() => handleItemSelected(file)}>
                {file.displayName}
              </MenuItem>
              <MenuItem className="msla-filepicker-item-split-chevron" onClick={() => handleFolderNavigation(file)} persistOnClick={true}>
                <ChevronRight12Regular />
              </MenuItem>
            </MenuSplitGroup>
          ) : (
            <MenuItem
              className="msla-filepicker-item"
              icon={<Document28Regular />}
              key={`FilePicker.item.${file.value.Id}`}
              onClick={() => handleItemSelected(file)}
            >
              {file.displayName}
            </MenuItem>
          )
        )}
      </MenuList>
    );
  }

  return (
    <MenuPopover className="msla-filepicker-body">
      <FilePickerPopoverHeader currentPathSegments={currentPathSegments} />
      {listContent}
    </MenuPopover>
  );
};
