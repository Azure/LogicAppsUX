import { FilePickerPopoverHeader } from './filepickerPopoverHeader';
import { FilePickerPopoverItem } from './filepickerPopoverItem';
import type { FilePickerBreadcrumb } from './types';
import { MenuList, PopoverSurface, Spinner } from '@fluentui/react-components';
import type { TreeDynamicValue } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { useIntl } from 'react-intl';

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
      <div aria-label={loadingMessage} className="msla-filepicker-no-list-content">
        <Spinner label={loadingMessage} />
      </div>
    );
  } else if (files.length === 0) {
    listContent = (
      <div aria-label={noItemsMessage} className="msla-filepicker-no-list-message">
        {noItemsMessage}
      </div>
    );
  } else if (errorDetails?.message) {
    listContent = (
      <div aria-label={errorDetails.message} className="msla-filepicker-no-list-message">
        {errorDetails.message}
      </div>
    );
  } else {
    listContent = (
      <MenuList className="msla-filepicker-item-list">
        {files.map((file) => (
          <FilePickerPopoverItem
            file={file}
            handleFolderNavigation={handleFolderNavigation}
            handleItemSelected={handleItemSelected}
            key={`FilePickerPopover.item.${file.value.Id}`}
          />
        ))}
      </MenuList>
    );
  }

  return (
    <PopoverSurface className="msla-filepicker-body">
      <FilePickerPopoverHeader currentPathSegments={currentPathSegments} />
      {listContent}
    </PopoverSurface>
  );
};
