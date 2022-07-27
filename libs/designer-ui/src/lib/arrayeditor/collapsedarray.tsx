import type { ArrayEditorItemProps } from '.';
import { ValueSegmentType, CollapsedEditor } from '../editor';
import type { Segment } from '../editor/base';
import { Label } from '../label';
import type { LabelProps } from '../label';
import type { Dispatch, SetStateAction } from 'react';
import { useIntl } from 'react-intl';

export interface CollapsedArrayProps {
  labelProps: LabelProps;
  items: ArrayEditorItemProps[];
  isValid?: boolean;
  setItems: Dispatch<SetStateAction<ArrayEditorItemProps[]>>;
  setIsValid?: Dispatch<SetStateAction<boolean>>;
}

export const CollapsedArray = ({ labelProps, items, isValid = true, setItems, setIsValid }: CollapsedArrayProps): JSX.Element => {
  const intl = useIntl();

  const errorMessage = intl.formatMessage({
    defaultMessage: 'Please Enter a valid array',
    description: 'Error Message for Invalid Array',
  });
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

  return (
    <div className="msla-array-container msla-array-editor-collapsed">
      {renderLabel()}
      <div className="msla-array-content">
        <CollapsedEditor
          type={'COLLAPSED_ARRAY'}
          isValid={isValid}
          initialValue={parseInitialValue(items)}
          errorMessage={errorMessage}
          setItems={setItems}
          setIsValid={setIsValid}
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
    content?.forEach((segment) => {
      parsedItems.push(segment);
    });
    parsedItems.push({ type: ValueSegmentType.LITERAL, value: index < items.length - 1 ? '",\n  "' : '"\n]' });
  });
  return parsedItems;
};
