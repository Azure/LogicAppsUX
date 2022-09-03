import type { ArrayEditorItemProps } from '.';
import type { ValueSegment } from '../editor';
import { BaseEditor } from '../editor/base';
import { Label } from '../label';
import type { LabelProps } from '../label';
import { CollapsedArrayValidation } from './plugins/CollapsedArrayValidation';
import { useIntl } from 'react-intl';

export interface CollapsedArrayProps {
  labelProps?: LabelProps;
  isValid?: boolean;
  collapsedValue: ValueSegment[];
  setCollapsedValue: (val: ValueSegment[]) => void;
  setItems: (items: ArrayEditorItemProps[]) => void;
  setIsValid: (b: boolean) => void;
  onBlur?: () => void;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
}

export const CollapsedArray = ({
  labelProps,
  isValid = true,
  collapsedValue,
  GetTokenPicker,
  setItems,
  setIsValid,
  onBlur,
  setCollapsedValue,
}: CollapsedArrayProps): JSX.Element => {
  const intl = useIntl();

  const renderLabel = (): JSX.Element => {
    const { text, isRequiredField } = labelProps as LabelProps;
    return (
      <div className="msla-input-parameter-label">
        <div className="msla-array-editor-label">
          <Label text={text} isRequiredField={isRequiredField} />
        </div>
      </div>
    );
  };

  const errorMessage = intl.formatMessage({
    defaultMessage: 'Please enter a valid array',
    description: 'Error Message for Invalid Array',
  });
  const editorPlaceHolder = intl.formatMessage({
    defaultMessage: 'Enter an Array',
    description: 'Placeholder for empty collapsed array',
  });

  return (
    <div className="msla-array-container msla-array-editor-collapsed">
      {labelProps ? renderLabel() : null}
      <div className="msla-array-content">
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
          <CollapsedArrayValidation
            errorMessage={errorMessage}
            className={'msla-collapsed-editor-validation'}
            isValid={isValid}
            collapsedValue={collapsedValue}
            setCollapsedValue={setCollapsedValue}
            setIsValid={setIsValid}
            setItems={setItems}
          />
        </BaseEditor>
      </div>
    </div>
  );
};
