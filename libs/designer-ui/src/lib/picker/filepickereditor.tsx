import type { BaseEditorProps, ChangeHandler } from '../editor/base';
import { BaseEditor } from '../editor/base';
import { Change } from '../editor/base/plugins/Change';
import type { ValueSegment } from '../editor/models/parameter';
import type { PickerTitleInfo } from './models/PickerInfo';
import { Picker } from './picker';
import type { FileItem } from './pickerItem';
import type { IBreadcrumbItem, IIconProps, ITooltipHostStyles } from '@fluentui/react';
import { TooltipHost, IconButton } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export * from './models/PickerInfo';

export interface PickerCallbackHandlers {
  getFileSourceName: () => string;
  getDisplayNameFromSelectedItem: (selectedItem: any) => string;
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
  editorBlur,
  onChange,
  pickerCallbacks,
  ...baseEditorProps
}: FilePickerEditorProps) => {
  const [value, setValue] = useState(initialValue);
  const [showPicker, setShowPicker] = useState(false);
  const [titleSegments] = useState<PickerTitleInfo[] | undefined>();
  const pickerIconId = useId();
  const intl = useIntl();

  const { onFolderNavigation: onFolderNavigated } = pickerCallbacks;

  const openTokenPicker = () => {
    if (!showPicker) {
      onFolderNavigated?.(/* selectedItem */ undefined);
      setShowPicker(true);
    }
  };

  const onValueChange = (newValue: ValueSegment[]): void => {
    setValue(newValue);
    // TODO: Make sure to update displayValue and selectedItem in viewModel.
    onChange?.({ value: newValue, viewModel: { hideErrorMessage: true } });
  };
  const handleBlur = () => {
    editorBlur?.({ value: value });
    // TODO: Make sure to update displayValue and selectedItem in viewModel.
    onChange?.({ value: value, viewModel: { hideErrorMessage: false } });
  };

  const openFolderLabel = intl.formatMessage({ defaultMessage: 'Open folder', description: 'Open folder label' });
  return (
    <div className="msla-filepicker-editor-container">
      <BaseEditor
        readonly={baseEditorProps.readonly}
        className="msla-filepicker-editor"
        BasePlugins={{
          tokens: baseEditorProps.BasePlugins?.tokens ?? true,
        }}
        initialValue={value}
        onBlur={handleBlur}
        onFocus={baseEditorProps.onFocus}
        getTokenPicker={baseEditorProps.getTokenPicker}
        placeholder={baseEditorProps.placeholder}
        isTrigger={baseEditorProps.isTrigger}
        tokenPickerButtonEditorProps={{ showOnLeft: true }}
      >
        <Change setValue={onValueChange} />
      </BaseEditor>
      <TooltipHost content={openFolderLabel} calloutProps={calloutProps} styles={hostStyles}>
        <IconButton iconProps={folderIcon} aria-label={openFolderLabel} onClick={openTokenPicker} id={pickerIconId} disabled={true} />
      </TooltipHost>
      <Picker
        visible={showPicker}
        anchorId={pickerIconId}
        loadingFiles={isLoading}
        currentPathSegments={getPathSegments(titleSegments)}
        files={[]}
        onCancel={() => setShowPicker(false)}
        handleFolderNavigation={onFolderNavigated}
      />
    </div>
  );
};

const getPathSegments = (titleSegments?: PickerTitleInfo[]): IBreadcrumbItem[] => {
  if (!titleSegments || titleSegments.length === 0) return [];
  return titleSegments.map((titleSegment) => {
    return {
      text: titleSegment.title ?? '',
      key: titleSegment.titleKey,
    };
  });
};
