import type { DictionaryEditorItemProps } from '.';
import type { ValueSegment } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { EditorWrapper } from '../editor/base/EditorWrapper';
import { CollapsedDictionaryValidation } from './plugins/CollapsedDictionaryValidation';
import { useIntl } from 'react-intl';

export interface CollapsedDictionaryProps extends BaseEditorProps {
  keyType?: string;
  setIsValid: (b: boolean) => void;
  setItems: (items: DictionaryEditorItemProps[]) => void;
  setCollapsedValue: (val: ValueSegment[]) => void;
}

export const CollapsedDictionary = ({
  initialValue,
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
          placeholder={editorPlaceHolder}
          {...props}
          className="msla-collapsed-editor-container"
          basePlugins={{
            tabbable: true,
          }}
          initialValue={initialValue?.length > 0 ? initialValue : ([] as ValueSegment[])}
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
