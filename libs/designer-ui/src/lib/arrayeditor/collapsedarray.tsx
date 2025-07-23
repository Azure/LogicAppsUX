import type { SimpleArrayItem, ComplexArrayItems, ArrayItemSchema } from '.';
import type { ValueSegment } from '../editor';
import type { BasePlugins, GetTokenPickerHandler, loadParameterValueFromStringHandler } from '../editor/base';
import { EditorWrapper } from '../editor/base/EditorWrapper';
import type { TokenPickerButtonEditorProps } from '../editor/base/plugins/tokenpickerbutton';
import { Label, RequiredMarkerSide } from '../label';
import type { LabelProps } from '../label';
import { CollapsedArrayValidation } from './plugins/CollapsedArrayValidation';
import { useIntl } from 'react-intl';

export interface CollapsedArrayProps {
  labelProps?: LabelProps;
  isValid?: boolean;
  collapsedValue: ValueSegment[];
  readonly?: boolean;
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  itemSchema: ArrayItemSchema;
  isComplex: boolean;
  setCollapsedValue: (val: ValueSegment[]) => void;
  setItems: ((simpleItems: SimpleArrayItem[]) => void) | ((complexItems: ComplexArrayItems[]) => void);
  setIsValid: (b: boolean) => void;
  onBlur?: () => void;
  getTokenPicker: GetTokenPickerHandler;
  tokenMapping?: Record<string, ValueSegment>;
  loadParameterValueFromString?: loadParameterValueFromStringHandler;
  basePlugins?: BasePlugins;
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
  basePlugins,
  ...props
}: CollapsedArrayProps): JSX.Element => {
  const intl = useIntl();

  const renderLabel = (): JSX.Element => {
    const { text, isRequiredField } = labelProps as LabelProps;
    return (
      <div className="msla-input-parameter-label">
        <div className="msla-array-editor-label">
          <Label text={text} isRequiredField={isRequiredField} requiredMarkerSide={RequiredMarkerSide.LEFT} />
        </div>
      </div>
    );
  };

  const editorPlaceHolder = intl.formatMessage({
    defaultMessage: 'Enter an array',
    id: '0C5Ywr',
    description: 'Placeholder for empty collapsed array',
  });

  return (
    <div className="msla-array-container msla-array-editor-collapsed">
      {labelProps ? renderLabel() : null}
      <div className="msla-array-content">
        <EditorWrapper
          {...props}
          className="msla-collapsed-editor-container"
          basePlugins={{
            tabbable: true,
            ...basePlugins,
          }}
          tokenPickerButtonProps={{ verticalOffSet: 17 }}
          placeholder={editorPlaceHolder}
          initialValue={collapsedValue?.length > 0 ? collapsedValue : ([] as ValueSegment[])}
          onBlur={onBlur}
        >
          <CollapsedArrayValidation
            itemSchema={itemSchema}
            isComplex={isComplex}
            setCollapsedValue={setCollapsedValue}
            setIsValid={setIsValid}
            setItems={setItems}
          />
        </EditorWrapper>
      </div>
    </div>
  );
};
