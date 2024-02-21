import type { GroupItems, RowItemProps } from '.';
import { RowDropdownOptions, GroupType } from '.';
import type { ValueSegment } from '../editor';
import { ValueSegmentType, removeQuotes } from '../editor';
import type { ChangeHandler, ChangeState, GetTokenPickerHandler } from '../editor/base';
import { isEmptySegments } from '../editor/base/utils/parsesegments';
import { StringEditor } from '../editor/string';
import { Row } from './Row';
import { getOperationValue, getOuterMostCommaIndex } from './helper';
import type { IButtonStyles, IStyle } from '@fluentui/react';
import { ActionButton, FontSizes } from '@fluentui/react';
import { guid, nthLastIndexOf } from '@microsoft/logic-apps-shared';
import { useFunctionalState } from '@react-hookz/web';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

export * from './helper';

export interface SimpleQueryBuilderProps {
  readonly?: boolean;
  itemValue: ValueSegment[];
  isRowFormat?: boolean;
  tokenMapping?: Record<string, ValueSegment>;
  loadParameterValueFromString?: (value: string) => ValueSegment[];
  getTokenPicker: GetTokenPickerHandler;
  onChange?: ChangeHandler;
}

const removeStyle: IStyle = {
  border: '0',
  color: 'rgb(0, 120, 212)',
  backgroundColor: 'transparent',
};
const buttonStyles: IButtonStyles = {
  label: {
    fontSize: FontSizes.medium,
  },
  root: removeStyle,
  rootHovered: removeStyle,
  rootPressed: removeStyle,
};

export const SimpleQueryBuilder = ({ getTokenPicker, itemValue, readonly, onChange, ...baseEditorProps }: SimpleQueryBuilderProps) => {
  const intl = useIntl();

  const [getRootProp, setRootProp] = useFunctionalState<RowItemProps | undefined>(convertAdvancedValueToRootProp(itemValue));
  const [advancedValue, setAdvancedValue] = useState<ValueSegment[]>(itemValue);
  const [isRowFormat, setIsRowFormat] = useState(convertAdvancedValueToRootProp(itemValue) !== undefined);

  const advancedButtonLabel = intl.formatMessage({
    defaultMessage: 'Edit in advanced mode',
    description: 'Button Label when clicked to swith to advanced editor',
  });

  const basicButtonLabel = intl.formatMessage({
    defaultMessage: 'Edit in basic mode',
    description: 'Button Label when clicked to swith to basic editor',
  });

  const invalidRowFormat = intl.formatMessage({
    defaultMessage: 'Condition is too complex or invalid. Unable to switch to basic mode',
    description: 'Error message when unable to switch to basic mode',
  });

  useEffect(() => {
    const rootPropValue = convertAdvancedValueToRootProp(itemValue);
    setAdvancedValue(itemValue);
    setRootProp(rootPropValue);
  }, [itemValue, setRootProp]);

  const handleUpdateParent = (newProps: GroupItems) => {
    const updatedAdvancedValue = convertRootPropToValue(newProps as RowItemProps);
    setAdvancedValue(updatedAdvancedValue);
    setRootProp(newProps as RowItemProps);
    onChange?.({
      value: updatedAdvancedValue,
      viewModel: { isOldFormat: true, itemValue: updatedAdvancedValue, isRowFormat: true },
    });
  };

  const handleUpdateRootProps = (newState: ChangeState) => {
    const updatedAdvancedValue = newState.value;
    setAdvancedValue(updatedAdvancedValue);
    setRootProp(convertAdvancedValueToRootProp(updatedAdvancedValue));
    onChange?.({
      value: updatedAdvancedValue,
      viewModel: { isOldFormat: true, itemValue: updatedAdvancedValue, isRowFormat: !!getRootProp() },
    });
  };

  return (
    <div className="msla-querybuilder-container">
      {isRowFormat ? (
        <Row
          // isTop={false}
          // isBottom={false}
          index={0}
          operand1={getRootProp()?.operand1}
          operand2={getRootProp()?.operand2}
          operator={getRootProp()?.operator}
          getTokenPicker={getTokenPicker}
          handleUpdateParent={handleUpdateParent}
          forceSingleCondition={true}
          groupedItems={[]}
          readonly={readonly}
          clearEditorOnTokenInsertion={true}
          isSimpleQueryBuilder={true}
          {...baseEditorProps}
        />
      ) : (
        <StringEditor
          className={'msla-simple-querybuilder-editor-container'}
          initialValue={advancedValue}
          getTokenPicker={getTokenPicker}
          onChange={handleUpdateRootProps}
          {...baseEditorProps}
        />
      )}
      <ActionButton
        className="msla-simple-querybuilder-advanced-button"
        disabled={readonly || !getRootProp()}
        title={readonly || !getRootProp() ? invalidRowFormat : isRowFormat ? advancedButtonLabel : basicButtonLabel}
        styles={buttonStyles}
        onClick={() => {
          if (isRowFormat) {
            setAdvancedValue(convertRootPropToValue(getRootProp() as RowItemProps));
          } else {
            setRootProp(convertAdvancedValueToRootProp(advancedValue));
          }
          setIsRowFormat(!isRowFormat);
        }}
      >
        {isRowFormat ? advancedButtonLabel : basicButtonLabel}
      </ActionButton>
    </div>
  );
};

const convertRootPropToValue = (rootProps: RowItemProps): ValueSegment[] => {
  const { operator, operand1, operand2 } = rootProps;
  const negatory = operator.includes('not');
  const op1: ValueSegment = getOperationValue(operand1[0]) ?? { id: guid(), type: ValueSegmentType.LITERAL, value: '' };
  const separatorLiteral: ValueSegment = { id: guid(), type: ValueSegmentType.LITERAL, value: `,` };
  const op2: ValueSegment = getOperationValue(operand2[0]) ?? { id: guid(), type: ValueSegmentType.LITERAL, value: '' };
  if (negatory) {
    const newOperator = operator.replace('not', '');
    const negatoryOperatorLiteral: ValueSegment = { id: guid(), type: ValueSegmentType.LITERAL, value: `@not(${newOperator}(` };
    const endingLiteral: ValueSegment = { id: guid(), type: ValueSegmentType.LITERAL, value: `))` };
    return [negatoryOperatorLiteral, op1, separatorLiteral, op2, endingLiteral];
  } else {
    const operatorLiteral: ValueSegment = { id: guid(), type: ValueSegmentType.LITERAL, value: `@${operator}(` };
    const endingLiteral: ValueSegment = { id: guid(), type: ValueSegmentType.LITERAL, value: `)` };
    return [operatorLiteral, op1, separatorLiteral, op2, endingLiteral];
  }
};

const convertAdvancedValueToRootProp = (value: ValueSegment[]): RowItemProps | undefined => {
  if (isEmptySegments(value)) {
    return { operator: 'equals', operand1: [], operand2: [], type: GroupType.ROW };
  }
  const nodeMap = new Map<string, ValueSegment>();
  let stringValue = '';
  value.forEach((segment) => {
    if (segment.type === ValueSegmentType.TOKEN) {
      nodeMap?.set(segment.value, segment);
    }
    stringValue += segment.value;
  });
  // cannot be converted into row format
  if (!stringValue.includes('@') || !stringValue.includes(',')) {
    return undefined;
  }
  let operator: string, operand1: ValueSegment[], operand2: ValueSegment[];
  try {
    operator = stringValue.substring(stringValue.indexOf('@') + 1, stringValue.indexOf('('));
    const negatory = operator === 'not';
    if (negatory) {
      stringValue = stringValue.replace('@not(', '@');
      operator = 'not' + stringValue.substring(stringValue.indexOf('@') + 1, stringValue.indexOf('('));
    }
    // if operator is not of the dropdownlist, it cannot be converted into row format
    if (!Object.values(RowDropdownOptions).includes(operator as RowDropdownOptions)) {
      return undefined;
    }
    const operandSubstring = stringValue.substring(stringValue.indexOf('(') + 1, nthLastIndexOf(stringValue, ')', negatory ? 2 : 1));
    const operand1String = removeQuotes(operandSubstring.substring(0, getOuterMostCommaIndex(operandSubstring)).trim());
    const operand2String = removeQuotes(operandSubstring.substring(getOuterMostCommaIndex(operandSubstring) + 1).trim());
    operand1 = [nodeMap.get(operand1String) ?? { id: guid(), type: ValueSegmentType.LITERAL, value: operand1String }];
    operand2 = [nodeMap.get(operand2String) ?? { id: guid(), type: ValueSegmentType.LITERAL, value: operand2String }];
  } catch {
    return undefined;
  }
  return { operator, operand1, operand2, type: GroupType.ROW };
};
