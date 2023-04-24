import type { BaseEditorProps, ChangeHandler } from '../editor/base';
import { BaseEditor } from '../editor/base';
import { Change } from '../editor/base/plugins/Change';
import type { ValueSegment } from '../editor/models/parameter';
import type { PickerTitleInfo } from './models/PickerInfo';
import { Picker } from './picker';
import type { IBreadcrumbItem, IIconProps, ITooltipHostStyles } from '@fluentui/react';
import { TooltipHost, IconButton } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export * from './models/PickerInfo';

export interface PickerCallbackHandler {
  onOpenPicker: () => void;
  onFolderNavigated: (selectedObject: any) => void;
  getValueFromSelectedItem: (selectedObject: any) => string;
}

export interface FilePickerEditorProps extends BaseEditorProps {
  isLoading?: boolean;
  titleSegments?: PickerTitleInfo[];
  editorBlur?: ChangeHandler;
  pickerCallback?: PickerCallbackHandler;
  errorDetails?: string;
}

const folderIcon: IIconProps = { iconName: 'FolderOpen' };
const hostStyles: Partial<ITooltipHostStyles> = { root: { display: 'inline-block' } };
const calloutProps = { gapSpace: 0 };

export const FilePickerEditor = ({
  initialValue,
  isLoading = false,
  titleSegments,
  editorBlur,
  onChange,
  pickerCallback,
  ...baseEditorProps
}: FilePickerEditorProps) => {
  const [value, setValue] = useState(initialValue);
  const [showPicker, setShowPicker] = useState(false);
  const pickerIconId = useId();
  const intl = useIntl();

  const { onFolderNavigated, onOpenPicker } = pickerCallback ?? {};

  const openTokenPicker = () => {
    if (!showPicker) {
      onOpenPicker?.();
      setShowPicker(true);
    }
  };

  const onValueChange = (newValue: ValueSegment[]): void => {
    setValue(newValue);
    onChange?.({ value: newValue, viewModel: { hideErrorMessage: true } });
  };
  const handleBlur = () => {
    editorBlur?.({ value: value });
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
