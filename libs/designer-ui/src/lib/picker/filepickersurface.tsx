import { Breadcrumb, BreadcrumbButton, BreadcrumbDivider, BreadcrumbItem, Menu, MenuItem, MenuList, MenuPopover, MenuSplitGroup, MenuTrigger, Popover, PopoverSurface, Spinner } from '@fluentui/react-components';
import { PickerHeader } from './pickerHeader';
import { PickerItem } from './pickerItem';
import type { TreeDynamicValue } from '@microsoft/logic-apps-shared';
import React from 'react';
import { useIntl } from 'react-intl';
import type { FilePickerBreadcrumb } from './types';
import { ChevronRight12Regular, Document28Regular, Folder28Regular } from '@fluentui/react-icons';

export interface FilePickerProps {
  currentPathSegments: FilePickerBreadcrumb[];
  errorDetails?: { message: string };
  files: TreeDynamicValue[];
  handleFolderNavigation: (item: TreeDynamicValue) => void;
  handleItemSelected: (item: TreeDynamicValue) => void;
  loadingFiles?: boolean;
  onCancel?: () => void;
}

export const FilePickerSurface: React.FC<FilePickerProps> = (props) => {
  const {
    currentPathSegments,
    errorDetails,
    files,
    handleFolderNavigation,
    handleItemSelected,
    loadingFiles,
    onCancel,
    visible,
  } = props;

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
      <div>
        <Spinner label={loadingMessage} />
      </div>
    );
  } else if (files.length === 0) {
    listContent = (
      <div>
        {noItemsMessage}
      </div>
    );
  } else if (errorDetails?.message) {
    listContent = (
      <div>
        {errorDetails.message}
      </div>
    );
  } else {
    listContent = (
      <MenuList className="msla-filepicker-item-list">
        {files.map((file) =>
          file.isParent ? (
            <MenuSplitGroup
              className="msla-filepicker-item-split"
              key={`FilePicker.folder.${file.value.Id}`}
            >
              <MenuItem
                className="msla-filepicker-item"
                icon={<Folder28Regular />}
                onClick={() => handleItemSelected(file)}
              >
                {file.displayName}
              </MenuItem>
              <MenuItem
                className="msla-filepicker-item-split-chevron"
                onClick={() => handleFolderNavigation(file)}
                persistOnClick={true}
              >
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
      <Breadcrumb>
        {currentPathSegments.map((segment, index) => (
          <>
            {index > 0 ? (
              <BreadcrumbDivider key={`FilePicker.breadcrumbDivider.${segment.key}`} />
            ) : null}
            <BreadcrumbItem
              key={`FilePicker.breadcrumb.${segment.key}`}
            >
              <BreadcrumbButton
                current={index === currentPathSegments.length - 1}
                onClick={segment.onSelect}
              >
                {segment.text}
              </BreadcrumbButton>
            </BreadcrumbItem>
          </>
        ))}
      </Breadcrumb>
      {listContent}
    </MenuPopover>
  )
};
