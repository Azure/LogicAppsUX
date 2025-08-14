import type { BaseEditorProps, ChangeHandler } from '../editor/base';
import { EditorWrapper } from '../editor/base/EditorWrapper';
import { TokenPickerButtonLocation } from '../editor/base/plugins/tokenpickerbutton';
import { createLiteralValueSegment, notEqual } from '../editor/base/utils/helper';
import type { ValueSegment } from '../editor/models/parameter';
import { FilePickerPopover } from './filepickerPopover';
import { filterAndSortItems } from './helpers';
import { EditorValueChange } from './plugins/EditorValueChange';
import { UpdateEditorFromFilePicker } from './plugins/UpdateEditorFromFilePicker';
import type { FilePickerBreadcrumb } from './types';
import { PickerItemType } from './types';
import { Button, mergeClasses, Popover, PopoverTrigger, Tooltip } from '@fluentui/react-components';
import { Folder28Regular } from '@fluentui/react-icons';
import type { TreeDynamicValue } from '@microsoft/logic-apps-shared';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface PickerCallbackHandlers {
  getFileSourceName: () => string;
  getDisplayValueFromSelectedItem: (selectedItem: any) => string;
  getValueFromSelectedItem: (selectedItem: any) => string;
  onFolderNavigation: (selectedItem: any | undefined) => void;
}

export interface FilePickerEditorProps extends BaseEditorProps {
  type: PickerItemType;
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

    LoggerService().log({
      area: 'FilePickerEditor:onRootClicked',
      level: LogEntryLevel.Verbose,
      message: 'Navigated to root.',
    });
  };

  const onFolderNavigated = (selectedItem: TreeDynamicValue) => {
    onFolderNavigation(selectedItem.value);
    const displayValue = selectedItem.displayName;
    setTitleSegments([
      ...titleSegments,
      {
        key: selectedItem.id || displayValue,
        onSelect: () => onFolderNavigated(selectedItem),
        text: displayValue,
      },
    ]);

    LoggerService().log({
      area: 'FilePickerEditor:onFolderNavigated',
      level: LogEntryLevel.Verbose,
      message: 'Navigated to folder.', // Folder name is PII; do not include.
    });
  };

  const onFileFolderSelected = (selectedItem: TreeDynamicValue) => {
    if (type === PickerItemType.FILE && selectedItem.isParent) {
      return;
    }
    if (showPicker) {
      setSelectedItem(selectedItem.value);
      const displayValue = getDisplayValueFromSelectedItem(selectedItem.value);
      setPickerDisplayValue([createLiteralValueSegment(displayValue)]);

      editorBlur?.({
        value: [createLiteralValueSegment(getValueFromSelectedItem(selectedItem.value))],
        viewModel: {
          displayValue: displayValue,
          selectedItem: selectedItem.value,
        },
      });
      setShowPicker(false);

      LoggerService().log({
        area: 'FilePickerEditor:onFileFolderSelected',
        args: [`${type}Picker`, selectedItem.isParent ? 'folder' : 'file'],
        level: LogEntryLevel.Verbose,
        message: 'File or folder was selected.', // Item name is PII; do not include.
      });
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
    <div className={mergeClasses('msla-filepicker-editor-container', baseEditorProps.className)}>
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
      <Popover
        open={showPicker}
        onOpenChange={(_event, data) => {
          if (!showPicker && data.open) {
            setTitleSegments(getInitialTitleSegments(fileSourceName, onRootClicked));
            onFolderNavigation(/* selectedItem */ undefined);
          }

          setShowPicker(data.open);

          LoggerService().log({
            area: 'FilePickerEditor:openFolderPicker',
            level: LogEntryLevel.Verbose,
            message: data.open ? 'Picker opened.' : 'Picker closed.',
          });
        }}
        positioning="before-top"
        trapFocus={true}
        withArrow={true}
      >
        <Tooltip content={openFolderLabel} relationship="label">
          <PopoverTrigger disableButtonEnhancement={true}>
            <Button appearance="subtle" aria-label={openFolderLabel} icon={<Folder28Regular />} />
          </PopoverTrigger>
        </Tooltip>
        <FilePickerPopover
          currentPathSegments={titleSegments}
          errorDetails={errorDetails}
          files={filterAndSortItems(items, type, fileFilters)}
          handleFolderNavigation={onFolderNavigated}
          handleItemSelected={onFileFolderSelected}
          loadingFiles={isLoading}
        />
      </Popover>
    </div>
  );
};

const getInitialTitleSegments = (sourceName?: string, onRootClicked?: () => void): FilePickerBreadcrumb[] => {
  if (!sourceName) {
    return [];
  }
  const items: FilePickerBreadcrumb[] = [{ key: sourceName, text: sourceName, onSelect: onRootClicked }];
  return items;
};
