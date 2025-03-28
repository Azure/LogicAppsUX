import type { DictionaryEditorItemProps } from '.';
import type { ValueSegment } from '../editor';
import type { GetTokenPickerHandler, loadParameterValueFromStringHandler } from '../editor/base';
import { EditorWrapper } from '../editor/base/EditorWrapper';
import type { TokenPickerButtonEditorProps } from '../editor/base/plugins/tokenpickerbutton';
import { CollapsedDictionaryValidation } from './plugins/CollapsedDictionaryValidation';
import { useIntl } from 'react-intl';

export type CollapsedDictionaryProps = {
  readonly?: boolean;
  collapsedValue: ValueSegment[];
  keyType?: string;
  valueType?: string;
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  setIsValid: (b: boolean) => void;
  setItems: (items: DictionaryEditorItemProps[]) => void;
  setCollapsedValue: (val: ValueSegment[]) => void;
  onBlur?: () => void;
  getTokenPicker: GetTokenPickerHandler;
  tokenMapping?: Record<string, ValueSegment>;
  labelId?: string;
  loadParameterValueFromString?: loadParameterValueFromStringHandler;
};

export const CollapsedDictionary = ({
  collapsedValue,
  keyType,
  valueType,
  setItems,
  setIsValid,
  setCollapsedValue,
  onBlur,
  ...props
}: CollapsedDictionaryProps): JSX.Element => {
  const intl = useIntl();

  const editorPlaceHolder = intl.formatMessage({
    defaultMessage: 'Enter a valid JSON',
    id: 'ox2Ou7',
    description: 'Placeholder for empty collapsed dictionary',
  });

  return (
    <div className="msla-dictionary-container msla-dictionary-editor-collapsed">
      <div className="msla-dictionary-content">
        <EditorWrapper
          {...props}
          className="msla-collapsed-editor-container"
          basePlugins={{
            tabbable: true,
          }}
          placeholder={editorPlaceHolder}
          initialValue={collapsedValue?.length > 0 ? collapsedValue : ([] as ValueSegment[])}
          tokenPickerButtonProps={{ verticalOffSet: 17 }}
          onBlur={onBlur}
        >
          <CollapsedDictionaryValidation
            setIsValid={setIsValid}
            keyType={keyType}
            valueType={valueType}
            setItems={setItems}
            setCollapsedValue={setCollapsedValue}
          />
        </EditorWrapper>
      </div>
    </div>
  );
};
