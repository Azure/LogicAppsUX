import type { DictionaryEditorItemProps } from '.';
import type { ValueSegment } from '../editor';
import { BaseEditor } from '../editor/base';
import { CollapsedDictionaryValidation } from './plugins/CollapsedDictionaryValidation';
import { useIntl } from 'react-intl';

export type CollapsedDictionaryProps = {
  isValid?: boolean;
  collapsedValue: ValueSegment[];
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
  setIsValid: (b: boolean) => void;
  setItems: (items: DictionaryEditorItemProps[]) => void;
  setCollapsedValue: (val: ValueSegment[]) => void;
  onBlur?: () => void;
};

export const CollapsedDictionary = ({
  isValid,
  collapsedValue,
  GetTokenPicker,
  setItems,
  setIsValid,
  setCollapsedValue,
  onBlur,
}: CollapsedDictionaryProps): JSX.Element => {
  const intl = useIntl();

  const errorMessage = intl.formatMessage({
    defaultMessage: 'Please enter a valid dictionary',
    description: 'Error Message for Invalid Dictionary',
  });

  const editorPlaceHolder = intl.formatMessage({
    defaultMessage: 'Enter a Dictionary',
    description: 'Placeholder for empty collapsed dictionary',
  });

  return (
    <div className="msla-dictionary-container msla-dictionary-editor-collapsed">
      <div className="msla-dictionary-content">
        <BaseEditor
          className="msla-collapsed-editor-container"
          BasePlugins={{
            tokens: true,
          }}
          tokenPickerButtonProps={{ buttonClassName: `msla-editor-tokenpicker-button` }}
          placeholder={editorPlaceHolder}
          initialValue={collapsedValue?.length > 0 ? collapsedValue : ([] as ValueSegment[])}
          onBlur={onBlur}
          GetTokenPicker={GetTokenPicker}
        >
          <CollapsedDictionaryValidation
            errorMessage={errorMessage}
            className={'msla-collapsed-editor-validation'}
            isValid={isValid}
            setIsValid={setIsValid}
            setItems={setItems}
            collapsedValue={collapsedValue}
            setCollapsedValue={setCollapsedValue}
          />
        </BaseEditor>
      </div>
    </div>
  );
};
