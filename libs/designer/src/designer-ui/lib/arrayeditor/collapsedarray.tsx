import type { SimpleArrayItem, ComplexArrayItems, ArrayItemSchema } from '.';
import type { ValueSegment } from '../editor';
import type { GetTokenPickerHandler } from '../editor/base';
import { BaseEditor } from '../editor/base';
import type { TokenPickerButtonEditorProps } from '../editor/base/plugins/tokenpickerbutton';
import { Label } from '../label';
import type { LabelProps } from '../label';
import { CollapsedArrayValidation } from './plugins/CollapsedArrayValidation';
import { useIntl } from 'react-intl';

export interface CollapsedArrayProps {
  labelProps?: LabelProps;
  isValid?: boolean;
  collapsedValue: ValueSegment[];
  readonly?: boolean;
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  getTokenPicker: GetTokenPickerHandler;
  itemSchema: ArrayItemSchema;
  isComplex: boolean;
  setCollapsedValue: (val: ValueSegment[]) => void;
  setItems: ((simpleItems: SimpleArrayItem[]) => void) | ((complexItems: ComplexArrayItems[]) => void);
  setIsValid: (b: boolean) => void;
  onBlur?: () => void;
}

export const CollapsedArray = ({
  labelProps,
  collapsedValue,
  itemSchema,
  isComplex,
  setItems,
  setIsValid,
  onBlur,
  setCollapsedValue,
  ...props
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

  const editorPlaceHolder = intl.formatMessage({
    defaultMessage: 'Enter an Array',
    description: 'Placeholder for empty collapsed array',
  });

  return (
    <div className="msla-array-container msla-array-editor-collapsed">
      {labelProps ? renderLabel() : null}
      <div className="msla-array-content">
        <BaseEditor
          {...props}
          className="msla-collapsed-editor-container"
          BasePlugins={{
            tokens: true,
            tabbable: true,
          }}
          placeholder={editorPlaceHolder}
          initialValue={collapsedValue?.length > 0 ? collapsedValue : ([] as ValueSegment[])}
          onBlur={onBlur}
        >
          <CollapsedArrayValidation
            className={'msla-collapsed-editor-validation'}
            itemSchema={itemSchema}
            isComplex={isComplex}
            setCollapsedValue={setCollapsedValue}
            setIsValid={setIsValid}
            setItems={setItems}
          />
        </BaseEditor>
      </div>
    </div>
  );
};
