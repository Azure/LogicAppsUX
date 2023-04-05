import type { BaseEditorProps, ChangeHandler } from '../editor/base';
import { BaseEditor } from '../editor/base';
import { Change } from '../editor/base/plugins/Change';
import type { ValueSegment } from '../editor/models/parameter';
import { Picker } from './picker';
import type { IIconProps, ITooltipHostStyles } from '@fluentui/react';
import { TooltipHost, IconButton } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export * from './models/PickerInfo';

export interface FilePickerEditorProps extends BaseEditorProps {
  editorBlur?: ChangeHandler;
}

const folderIcon: IIconProps = { iconName: 'FolderOpen' };
const hostStyles: Partial<ITooltipHostStyles> = { root: { display: 'inline-block' } };
const calloutProps = { gapSpace: 0 };

export const FilePickerEditor = ({ initialValue, editorBlur, onChange, ...baseEditorProps }: FilePickerEditorProps) => {
  const [value, setValue] = useState(initialValue);
  const [showPicker, setShowPicker] = useState(false);
  const pickerIconId = useId();
  const intl = useIntl();

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
        <IconButton iconProps={folderIcon} aria-label={openFolderLabel} onClick={() => setShowPicker(true)} id={pickerIconId} />
      </TooltipHost>
      <Picker visible={showPicker} anchorId={pickerIconId} currentPathSegments={[]} files={[]} onCancel={() => setShowPicker(false)} />
    </div>
  );
};
