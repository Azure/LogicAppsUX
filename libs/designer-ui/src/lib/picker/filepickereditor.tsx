import type { BaseEditorProps, ChangeHandler } from '../editor/base';
import { EditorWrapper } from '../editor/base/EditorWrapper';
import { TokenPickerButtonLocation } from '../editor/base/plugins/tokenpickerbutton';
import { notEqual } from '../editor/base/utils/helper';
import type { ValueSegment } from '../editor/models/parameter';
import { ValueSegmentType } from '../editor/models/parameter';
import { Picker } from './picker';
import { PickerItemType } from './pickerItem';
import { EditorValueChange } from './plugins/EditorValueChange';
import { UpdateEditorFromFilePicker } from './plugins/UpdateEditorFromFilePicker';
import type { IBreadcrumbItem, IIconProps, ITooltipHostStyles } from '@fluentui/react';
import { TooltipHost, IconButton } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import type { TreeDynamicValue } from '@microsoft/designer-client-services-logic-apps';
import { equals, guid } from '@microsoft/utils-logic-apps';
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

const folderIcon: IIconProps = { iconName: 'FolderOpen' };
const hostStyles: Partial<ITooltipHostStyles> = { root: { display: 'inline-block' } };
const calloutProps = { gapSpace: 0 };

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
  const pickerIconId = useId();
  const intl = useIntl();
  const [selectedItem, setSelectedItem] = useState<any>();
  const initialDisplayValue = displayValue ? [{ id: guid(), value: displayValue, type: ValueSegmentType.LITERAL }] : initialValue;
  const [editorDisplayValue, setEditorDisplayValue] = useState<ValueSegment[]>(initialDisplayValue);
  const [pickerDisplayValue, setPickerDisplayValue] = useState<ValueSegment[]>(initialDisplayValue);
  const [showPicker, setShowPicker] = useState(false);

  const { onFolderNavigation, getFileSourceName, getDisplayValueFromSelectedItem, getValueFromSelectedItem } = pickerCallbacks;
  const fileSourceName = getFileSourceName();

  const [titleSegments, setTitleSegments] = useState<IBreadcrumbItem[]>([]);

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
    setTitleSegments([...titleSegments, { text: displayValue, key: displayValue, onClick: () => onFolderNavigated(selectedItem) }]);
  };

  const onFileFolderSelected = (selectedItem: TreeDynamicValue) => {
    if (type === PickerItemType.FILE && selectedItem.isParent) {
      return;
    }
    if (showPicker) {
      setSelectedItem(selectedItem.value);
      setPickerDisplayValue([{ id: guid(), value: getDisplayValueFromSelectedItem(selectedItem.value), type: ValueSegmentType.LITERAL }]);
      setShowPicker(false);
    }
  };

  const handleBlur = () => {
    if (selectedItem) {
      const valueSegmentValue: ValueSegment[] = [
        { id: guid(), type: ValueSegmentType.LITERAL, value: getValueFromSelectedItem(selectedItem) },
      ];

      editorBlur?.({
        value: valueSegmentValue,
        viewModel: { displayValue: pickerDisplayValue[0]?.value, selectedItem: selectedItem },
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

  const openFolderLabel = intl.formatMessage({ defaultMessage: 'Open folder', description: 'Open folder label' });
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
      <TooltipHost content={openFolderLabel} calloutProps={calloutProps} styles={hostStyles}>
        <IconButton iconProps={folderIcon} aria-label={openFolderLabel} onClick={openFolderPicker} id={pickerIconId} />
      </TooltipHost>
      <Picker
        visible={showPicker}
        anchorId={pickerIconId}
        loadingFiles={isLoading}
        currentPathSegments={titleSegments}
        files={filterItems(items, type, fileFilters)}
        errorDetails={errorDetails}
        onCancel={() => setShowPicker(false)}
        handleFolderNavigation={onFolderNavigated}
        handleItemSelected={onFileFolderSelected}
      />
    </div>
  );
};

const filterItems = (items?: TreeDynamicValue[], type?: string, fileFilters?: string[]): TreeDynamicValue[] => {
  if (!items || items.length === 0) return [];
  let returnItems = items;
  if (type === PickerItemType.FOLDER) {
    returnItems = items.filter((item) => item.isParent);
  }
  if (fileFilters && fileFilters.length > 0) {
    returnItems = returnItems.filter((item) => {
      return fileFilters.some((filter) => equals(filter, item.mediaType) || item.isParent);
    });
  }
  return returnItems;
};

const getInitialTitleSegments = (sourceName?: string, onRootClicked?: () => void): IBreadcrumbItem[] => {
  if (!sourceName) return [];
  const items: IBreadcrumbItem[] = [{ key: sourceName, text: sourceName, onClick: onRootClicked }];
  return items;
};
