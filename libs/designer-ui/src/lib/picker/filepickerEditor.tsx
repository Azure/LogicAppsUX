import type { BaseEditorProps, ChangeHandler } from '../editor/base';
import { EditorWrapper } from '../editor/base/EditorWrapper';
import { TokenPickerButtonLocation } from '../editor/base/plugins/tokenpickerbutton';
import { createLiteralValueSegment, notEqual } from '../editor/base/utils/helper';
import type { ValueSegment } from '../editor/models/parameter';
import { FilePickerPopover } from './filepickerPopover';
import { PickerItemType } from './pickerItem';
import { EditorValueChange } from './plugins/EditorValueChange';
import { UpdateEditorFromFilePicker } from './plugins/UpdateEditorFromFilePicker';
import type { FilePickerBreadcrumb } from './types';
import { Button, Menu, MenuTrigger, Tooltip } from '@fluentui/react-components';
import { Folder28Regular } from '@fluentui/react-icons';
import type { TreeDynamicValue } from '@microsoft/logic-apps-shared';
import { equals } from '@microsoft/logic-apps-shared';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface PickerCallbackHandlers {
  getFileSourceName: () => string;
  getDisplayValueFromSelectedItem: (selectedItem: any) => string;
  getValueFromSelectedItem: (selectedItem: any) => string;
  onFolderNavigation: (selectedItem: any | undefined) => void;
}

export interface FilePickerEditorProps extends BaseEditorProps {
  type: string;
  items: TreeDynamicValue[] | undefined;
  displayValue?: string;
  fileFilters?: string[];
  isLoading?: boolean;
  errorDetails?: { message: string };
  editorBlur?: ChangeHandler;
  pickerCallbacks: PickerCallbackHandlers;
}

export const FilePickerEditor = ({
  initialValue,
  isLoading = false,
  type,
  items,
  displayValue,
  fileFilters,
  errorDetails,
  editorBlur,
  pickerCallbacks,
  ...baseEditorProps
}: FilePickerEditorProps) => {
  const intl = useIntl();
  const [selectedItem, setSelectedItem] = useState<any>();
  const initialDisplayValue = displayValue ? [createLiteralValueSegment(displayValue)] : initialValue;
  const [editorDisplayValue, setEditorDisplayValue] = useState<ValueSegment[]>(initialDisplayValue);
  const [pickerDisplayValue, setPickerDisplayValue] = useState<ValueSegment[]>(initialDisplayValue);
  const [showPicker, setShowPicker] = useState(false);

  const { onFolderNavigation, getFileSourceName, getDisplayValueFromSelectedItem, getValueFromSelectedItem } = pickerCallbacks;
  const fileSourceName = getFileSourceName();

  const [titleSegments, setTitleSegments] = useState<FilePickerBreadcrumb[]>([]);

  const onRootClicked = () => {
    setTitleSegments(getInitialTitleSegments(fileSourceName, onRootClicked));
    onFolderNavigation(/* selectedItem */ undefined);
  };

  const openFolderPicker = () => {
    if (!showPicker) {
      setTitleSegments(getInitialTitleSegments(fileSourceName, onRootClicked));
      onFolderNavigation(/* selectedItem */ undefined);
      setShowPicker(true);
    }
  };

  const onFolderNavigated = (selectedItem: TreeDynamicValue) => {
    onFolderNavigation(selectedItem.value);
    const displayValue = selectedItem.displayName;
    setTitleSegments([
      ...titleSegments,
      {
        key: displayValue,
        onSelect: () => onFolderNavigated(selectedItem),
        text: displayValue,
      },
    ]);
  };

  const onFileFolderSelected = (selectedItem: TreeDynamicValue) => {
    if (type === PickerItemType.FILE && selectedItem.isParent) {
      return;
    }
    if (showPicker) {
      setSelectedItem(selectedItem.value);
      setPickerDisplayValue([createLiteralValueSegment(getDisplayValueFromSelectedItem(selectedItem.value))]);
      setShowPicker(false);
    }
  };

  const handleBlur = () => {
    if (selectedItem) {
      const valueSegmentValue: ValueSegment[] = [createLiteralValueSegment(getValueFromSelectedItem(selectedItem))];

      editorBlur?.({
        value: valueSegmentValue,
        viewModel: {
          displayValue: pickerDisplayValue[0]?.value,
          selectedItem: selectedItem,
        },
      });
    } else if (notEqual(editorDisplayValue, pickerDisplayValue)) {
      editorBlur?.({
        value: editorDisplayValue,
        viewModel: { displayValue: undefined, selectedItem: undefined },
      });
    }
  };

  const clearPickerInfo = () => {
    setSelectedItem(undefined);
    setPickerDisplayValue([]);
  };

  const openFolderLabel = intl.formatMessage({
    defaultMessage: 'Open folder',
    id: 's+4LEa',
    description: 'Open folder label',
  });
  return (
    <div className="msla-filepicker-editor-container">
      <EditorWrapper
        {...baseEditorProps}
        className="msla-filepicker-editor"
        basePlugins={{ ...baseEditorProps.basePlugins }}
        initialValue={editorDisplayValue}
        onBlur={handleBlur}
        tokenPickerButtonProps={{ location: TokenPickerButtonLocation.Left }}
      >
        <EditorValueChange
          pickerDisplayValue={pickerDisplayValue}
          setEditorDisplayValue={setEditorDisplayValue}
          clearPickerInfo={clearPickerInfo}
        />
        <UpdateEditorFromFilePicker pickerDisplayValue={pickerDisplayValue} />
      </EditorWrapper>
      <Menu
        open={showPicker}
        onOpenChange={(_event, data) => {
          setShowPicker(data.open);
        }}
        positioning="before-top"
      >
        <Tooltip content={openFolderLabel} relationship="label">
          <MenuTrigger disableButtonEnhancement={true}>
            <Button appearance="subtle" aria-label={openFolderLabel} icon={<Folder28Regular />} onClick={openFolderPicker} />
          </MenuTrigger>
        </Tooltip>
        <FilePickerPopover
          currentPathSegments={titleSegments}
          errorDetails={errorDetails}
          files={filterAndSortItems(items, type, fileFilters)}
          handleFolderNavigation={onFolderNavigated}
          handleItemSelected={onFileFolderSelected}
          loadingFiles={isLoading}
        />
      </Menu>
    </div>
  );
};

const filterAndSortItems = (items?: TreeDynamicValue[], type?: string, fileFilters?: string[]): TreeDynamicValue[] => {
  if (!items || items.length === 0) {
    return [];
  }
  let returnItems = items;
  if (type === PickerItemType.FOLDER) {
    returnItems = items.filter((item) => item.isParent);
  }
  if (fileFilters && fileFilters.length > 0) {
    returnItems = returnItems.filter((item) => {
      return fileFilters.some((filter) => equals(filter, item.mediaType) || item.isParent);
    });
  }
  return Array.from(returnItems).sort((a, b) => {
    if (a.isParent && !b.isParent) {
      return -1;
    }
    if (!a.isParent && b.isParent) {
      return 1;
    }
    return a.displayName.localeCompare(b.displayName);
  });
};

const getInitialTitleSegments = (sourceName?: string, onRootClicked?: () => void): FilePickerBreadcrumb[] => {
  if (!sourceName) {
    return [];
  }
  const items: FilePickerBreadcrumb[] = [{ key: sourceName, text: sourceName, onSelect: onRootClicked }];
  return items;
};
