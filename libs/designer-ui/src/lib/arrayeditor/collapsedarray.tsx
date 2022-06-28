import type { ArrayEditorItemProps } from '.';
import { ValueSegmentType } from '../editor';
import type { Segment } from '../editor/base';
import { BaseEditor } from '../editor/base';
import { Label } from '../label';
import type { LabelProps } from '../label';
import type { Dispatch, SetStateAction } from 'react';

export interface CollapsedArrayProps {
  labelProps: LabelProps;
  items: ArrayEditorItemProps[];
  isValid?: boolean;
  setItems: Dispatch<SetStateAction<ArrayEditorItemProps[]>>;
  setIsValid?: Dispatch<SetStateAction<boolean>>;
}

export const CollapsedArray = ({ labelProps, items, setItems }: CollapsedArrayProps): JSX.Element => {
  const renderLabel = (): JSX.Element => {
    const { text, isRequiredField } = labelProps;
    return (
      <div className="msla-input-parameter-label">
        <div className="msla-array-editor-label">
          <Label text={text} isRequiredField={isRequiredField} />
        </div>
      </div>
    );
  };
  console.log(setItems);

  return (
    <div className="msla-array-container msla-array-editor-collapsed">
      {renderLabel()}
      <div className="msla-array-content">
        <BaseEditor
          className="msla-array-editor-container-collapsed"
          BasePlugins={{
            tokens: true,
            validation: { type: 'ARRAY', errorMessage: 'Please Enter a Valid Array', className: 'msla-array-editor-validation' },
          }}
          placeholder={'Enter an Array'}
          initialValue={parseInitialValue(items)}
          // isValid={isValid}
          // setIsValid={setIsValid}
        />
      </div>
    </div>
  );
};
const parseInitialValue = (items: ArrayEditorItemProps[]): Segment[] => {
  if (items.length === 0) {
    return [{ type: ValueSegmentType.LITERAL, value: '[\n  null\n]' }];
  }
  const parsedItems: Segment[] = [];
  parsedItems.push({ type: ValueSegmentType.LITERAL, value: '[\n  "' });
  items.forEach((item, index) => {
    const { content } = item;

    content.forEach((segment) => {
      parsedItems.push(segment);
    });
    parsedItems.push({ type: ValueSegmentType.LITERAL, value: index < items.length - 1 ? '",\n  "' : '"\n]' });
  });
  return parsedItems;
};
