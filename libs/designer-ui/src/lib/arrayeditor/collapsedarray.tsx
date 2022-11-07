import type { SimpleArrayItem, ComplexArrayItems } from '.';
import type { ValueSegment } from '../editor';
import type { TokenPickerHandler } from '../editor/base';
import { BaseEditor } from '../editor/base';
import { Label } from '../label';
import type { LabelProps } from '../label';
import { CollapsedArrayValidation } from './plugins/CollapsedArrayValidation';
import { useIntl } from 'react-intl';

export interface CollapsedArrayProps {
  labelProps?: LabelProps;
  isValid?: boolean;
  collapsedValue: ValueSegment[];
  readOnly?: boolean;
  isTrigger?: boolean;
  itemSchema?: string[];
  dimensionalSchema: any[];
  setCollapsedValue: (val: ValueSegment[]) => void;
  setItems: ((simpleItems: SimpleArrayItem[]) => void) | ((complexItems: ComplexArrayItems[]) => void);
  setIsValid: (b: boolean) => void;
  onBlur?: () => void;
  tokenPickerHandler: TokenPickerHandler;
}

export const CollapsedArray = ({
  labelProps,
  isValid = true,
  collapsedValue,
  readOnly,
  isTrigger,
  itemSchema,
  tokenPickerHandler,
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

  const defaultErrorMessage = intl.formatMessage({
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
          readonly={readOnly}
          isTrigger={isTrigger}
          placeholder={editorPlaceHolder}
          initialValue={collapsedValue?.length > 0 ? collapsedValue : ([] as ValueSegment[])}
          onBlur={onBlur}
          tokenPickerHandler={{ ...tokenPickerHandler, tokenPickerButtonProps: { buttonClassName: `msla-editor-tokenpicker-button` } }}
        >
          <CollapsedArrayValidation
            defaultErrorMessage={defaultErrorMessage}
            className={'msla-collapsed-editor-validation'}
            isValid={isValid}
            collapsedValue={collapsedValue}
            itemSchema={itemSchema}
            setCollapsedValue={setCollapsedValue}
            setIsValid={setIsValid}
            setItems={setItems}
          />
        </BaseEditor>
      </div>
    </div>
  );
};
