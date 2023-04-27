import type { BaseEditorProps, ChangeHandler } from '../editor/base';
import { BaseEditor } from '../editor/base';
import type { ValueSegment } from '../editor/models/parameter';
import { ValueSegmentType } from '../editor/models/parameter';
import { PickerValueChange } from './PickerValueChange';
import { Picker } from './picker';
import type { FileItem } from './pickerItem';
import { PickerItemType } from './pickerItem';
import type { IBreadcrumbItem, IIconProps, ITooltipHostStyles } from '@fluentui/react';
import { TooltipHost, IconButton } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import { guid } from '@microsoft/utils-logic-apps';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

export interface PickerCallbackHandlers {
  getFileSourceName: () => string;
  getDisplayValueFromSelectedItem: (selectedItem: any) => string;
  getValueFromSelectedItem: (selectedItem: any) => string;
  onFolderNavigation: (selectedItem: any | undefined) => void;
}

export interface FilePickerEditorProps extends BaseEditorProps {
  type: string;
  items: FileItem[] | undefined;
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
  // fileFilters,
  errorDetails,
  editorBlur,
  onChange,
  pickerCallbacks,
  ...baseEditorProps
}: FilePickerEditorProps) => {
  const pickerIconId = useId();
  const intl = useIntl();
  const [selectedItem, setSelectedItem] = useState<any>();
  const [editorDisplayValue, setEditorDisplayValue] = useState<ValueSegment[]>(
    displayValue ? [{ id: guid(), value: displayValue, type: ValueSegmentType.LITERAL }] : initialValue
  );
  const [pickerDisplayValue, setPickerDisplayValue] = useState<ValueSegment[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (displayValue) {
      setPickerDisplayValue([{ id: guid(), value: displayValue, type: ValueSegmentType.LITERAL }]);
    }
  }, [displayValue]);

  const { onFolderNavigation, getFileSourceName, getDisplayValueFromSelectedItem, getValueFromSelectedItem } = pickerCallbacks;
  const fileSourceName = getFileSourceName?.();

  const [titleSegments, setTitleSegments] = useState<IBreadcrumbItem[]>(getInitialTitleSegments(fileSourceName));

  const openFolderPicker = () => {
    if (!showPicker) {
      setTitleSegments(getInitialTitleSegments(fileSourceName));
      onFolderNavigation?.(/* selectedItem */ undefined);
      setShowPicker(true);
    }
  };

  const onFolderNavigated = (selectedItem: any) => {
    onFolderNavigation?.(selectedItem);
    const displayValue = getDisplayValueFromSelectedItem?.(selectedItem);
    setTitleSegments([...titleSegments, { text: displayValue, key: displayValue, onClick: () => onFolderNavigated(selectedItem) }]);
  };

  const onFolderSelected = (selectedItem: any) => {
    if (showPicker) {
      setSelectedItem(selectedItem);
      setPickerDisplayValue([{ id: guid(), value: selectedItem.Path, type: ValueSegmentType.LITERAL }]);
      setShowPicker(false);
    }
  };

  const handleBlur = () => {
    const valueSegmentValue: ValueSegment[] = [
      { id: guid(), type: ValueSegmentType.LITERAL, value: getValueFromSelectedItem?.(selectedItem) },
    ];
    editorBlur?.({ value: valueSegmentValue });
    onChange?.({ value: valueSegmentValue, viewModel: { hideErrorMessage: false, displayValue: editorDisplayValue, selectedItem } });
  };

  const openFolderLabel = intl.formatMessage({ defaultMessage: 'Open folder', description: 'Open folder label' });
  return (
    <div className="msla-filepicker-editor-container">
      <BaseEditor
        readonly={baseEditorProps.readonly}
        className="msla-filepicker-editor"
        BasePlugins={{ ...baseEditorProps.BasePlugins }}
        initialValue={editorDisplayValue}
        onBlur={handleBlur}
        onFocus={baseEditorProps.onFocus}
        getTokenPicker={baseEditorProps.getTokenPicker}
        placeholder={baseEditorProps.placeholder}
        isTrigger={baseEditorProps.isTrigger}
        tokenPickerButtonEditorProps={{ showOnLeft: true }}
      >
        <PickerValueChange pickerDisplayValue={pickerDisplayValue} setEditorDisplayValue={setEditorDisplayValue} />
      </BaseEditor>
      <TooltipHost content={openFolderLabel} calloutProps={calloutProps} styles={hostStyles}>
        <IconButton iconProps={folderIcon} aria-label={openFolderLabel} onClick={openFolderPicker} id={pickerIconId} />
      </TooltipHost>
      <Picker
        visible={showPicker}
        anchorId={pickerIconId}
        loadingFiles={isLoading}
        currentPathSegments={titleSegments}
        files={type === PickerItemType.FOLDER ? (items ?? []).filter((item) => item.isParent) : items ?? []}
        errorDetails={errorDetails}
        onCancel={() => setShowPicker(false)}
        handleFolderNavigation={onFolderNavigated}
        handleFolderSelected={onFolderSelected}
      />
    </div>
  );
};

const getInitialTitleSegments = (sourceName?: string): IBreadcrumbItem[] => {
  if (!sourceName) return [];
  const items: IBreadcrumbItem[] = [{ key: sourceName, text: sourceName }];
  return items;
};
