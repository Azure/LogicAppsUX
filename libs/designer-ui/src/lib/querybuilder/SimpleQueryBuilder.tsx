import type { GroupItems, RowItemProps } from '.';
import { RowDropdownOptions, GroupType } from '.';
import type { ValueSegment } from '../editor';
import { removeQuotes } from '../editor';
import type { BaseEditorProps, ChangeState } from '../editor/base';
import { createLiteralValueSegment } from '../editor/base/utils/helper';
import { isEmptySegments } from '../editor/base/utils/parsesegments';
import { StringEditor } from '../editor/string';
import { Row } from './Row';
import { getOperationValue, getOuterMostCommaIndex } from './helper';
import type { IButtonStyles, IStyle } from '@fluentui/react';
import { ActionButton, FontSizes } from '@fluentui/react';
import { nthLastIndexOf, splitAtIndex } from '@microsoft/logic-apps-shared';
import { useFunctionalState } from '@react-hookz/web';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import constants from '../constants';

export * from './helper';

export interface SimpleQueryBuilderProps extends BaseEditorProps {
  readonly?: boolean;
  itemValue?: RowItemProps;
  rowFormat?: boolean;
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

export const SimpleQueryBuilder = ({
  getTokenPicker,
  itemValue,
  readonly,
  initialValue,
  onChange,
  rowFormat,
  ...baseEditorProps
}: SimpleQueryBuilderProps) => {
  const intl = useIntl();

  const [getRootProp, setRootProp] = useFunctionalState<RowItemProps | undefined>(itemValue);
  const [advancedValue, setAdvancedValue] = useState<ValueSegment[]>(itemValue ? convertRootPropToValue(itemValue) : initialValue || []);
  const [isRowFormat, setIsRowFormat] = useState(rowFormat);

  const advancedButtonLabel = intl.formatMessage({
    defaultMessage: 'Edit in advanced mode',
    id: '4SQKyc',
    description: 'Button label when selecting to switch to basic editor',
  });

  const basicButtonLabel = intl.formatMessage({
    defaultMessage: 'Edit in basic mode',
    id: 'TQd85R',
    description: 'Button label to show when selecting switch to advanced editor',
  });

  const invalidRowFormat = intl.formatMessage({
    defaultMessage: 'Condition is too complex or invalid. Unable to switch to basic mode',
    id: 'FIL1Nt',
    description: 'Error message when unable to switch to basic mode',
  });

  // useEffect(() => {
  //   setRootProp(itemValue);
  //   if (itemValue) {
  //     setAdvancedValue(convertRootPropToValue(itemValue));
  //     setIsRowFormat(true);
  //   } else if (initialValue) {
  //     const convertedRowProps = convertAdvancedValueToRootProp(initialValue, baseEditorProps.loadParameterValueFromString);
  //     setRootProp(convertedRowProps);
  //     setAdvancedValue(initialValue);
  //     setIsRowFormat(convertedRowProps !== undefined);
  //   }
  // }, [itemValue, initialValue, setRootProp, baseEditorProps.loadParameterValueFromString]);

  const handleUpdateParent = (newProps: GroupItems) => {
    const updatedRowProps = newProps as RowItemProps;
    const updatedAdvancedValue = convertRootPropToValue(updatedRowProps);
    setAdvancedValue(updatedAdvancedValue);
    setRootProp(updatedRowProps);
    onChange?.({
      value: updatedAdvancedValue,
      viewModel: { isOldFormat: true, itemValue: updatedRowProps, isRowFormat: true },
    });
  };

  const handleUpdateRootProps = (newState: ChangeState) => {
    const updatedAdvancedValue = newState.value;
    const convertedRowProps = convertAdvancedValueToRootProp(updatedAdvancedValue, baseEditorProps.loadParameterValueFromString);
    setAdvancedValue(updatedAdvancedValue);
    setRootProp(convertedRowProps);
    onChange?.({
      value: updatedAdvancedValue,
      viewModel: { isOldFormat: true, itemValue: convertedRowProps, isRowFormat: convertedRowProps !== undefined },
    });
  };

  return (
    <div className="msla-querybuilder-container">
      {isRowFormat ? (
        <Row
          isTop={false}
          isBottom={false}
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
          valueType={constants.SWAGGER.TYPE.ANY}
          {...baseEditorProps}
        />
      )}
      <ActionButton
        className="msla-simple-querybuilder-advanced-button"
        disabled={readonly || (!getRootProp() && !advancedValue?.length)}
        title={
          readonly || (!getRootProp() && !advancedValue?.length) ? invalidRowFormat : isRowFormat ? advancedButtonLabel : basicButtonLabel
        }
        styles={buttonStyles}
        onClick={() => {
          if (isRowFormat) {
            setAdvancedValue(convertRootPropToValue(getRootProp() as RowItemProps));
          } else {
            setRootProp(convertAdvancedValueToRootProp(advancedValue, baseEditorProps.loadParameterValueFromString));
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
  const op1: ValueSegment = getOperationValue(operand1[0]) ?? createLiteralValueSegment('');
  const separatorLiteral: ValueSegment = createLiteralValueSegment(',');
  const op2: ValueSegment = getOperationValue(operand2[0]) ?? createLiteralValueSegment('');
  if (negatory) {
    const newOperator = operator.replace('not', '');
    const negatoryOperatorLiteral: ValueSegment = createLiteralValueSegment(`@not(${newOperator}(`);
    const endingLiteral: ValueSegment = createLiteralValueSegment('))');
    return [negatoryOperatorLiteral, op1, separatorLiteral, op2, endingLiteral];
  }
  const operatorLiteral: ValueSegment = createLiteralValueSegment(`@${operator}(`);
  const endingLiteral: ValueSegment = createLiteralValueSegment(')');
  return [operatorLiteral, op1, separatorLiteral, op2, endingLiteral];
};

// Common parsing logic extracted
export const parseQueryStringToRowItemProps = (
  stringValue: string,
  loadParameterValueFromString?: (value: string, options: any) => ValueSegment[],
  nodeMap?: Map<string, ValueSegment>
): RowItemProps | undefined => {
  // Basic validation
  if (!stringValue || !stringValue.includes('@') || !stringValue.includes(',')) {
    return undefined;
  }

  try {
    let workingString = stringValue;
    let operator: string = workingString.substring(workingString.indexOf('@') + 1, workingString.indexOf('('));
    const negatory = operator === 'not';

    // Handle negation
    if (negatory) {
      workingString = workingString.replace('@not(', '@');
      const negatedOperator = workingString.substring(workingString.indexOf('@') + 1, workingString.indexOf('('));
      operator = `not${negatedOperator}`;
    }

    // Validate operator exists in dropdown options
    if (!Object.values(RowDropdownOptions).includes(operator as RowDropdownOptions)) {
      return undefined;
    }

    // Extract operands substring
    const operandSubstring = workingString.substring(workingString.indexOf('(') + 1, nthLastIndexOf(workingString, ')', negatory ? 2 : 1));

    // Split operands at the outermost comma
    const [operand1String, operand2String] = splitAtIndex(operandSubstring, getOuterMostCommaIndex(operandSubstring)).map((s) =>
      removeQuotes(s.trim())
    );

    // Helper function to get operand segments with nodeMap fallback
    const getOperandSegments = (operandString: string): ValueSegment[] => {
      // First try to get from nodeMap if available
      if (nodeMap) {
        const tokenFromMap = nodeMap.get(operandString);
        if (tokenFromMap) {
          return [tokenFromMap];
        }
      }

      // Fallback to loadParameterValueFromString if available
      if (loadParameterValueFromString) {
        return loadParameterValueFromString(operandString, {
          removeQuotesFromExpression: true,
          trimExpression: true,
          convertIfContainsExpression: true,
        });
      }

      // Final fallback to literal segment
      return [createLiteralValueSegment(operandString)];
    };

    const operand1ValueSegments = getOperandSegments(operand1String);
    const operand2ValueSegments = getOperandSegments(operand2String);

    return {
      operator: operator as RowDropdownOptions,
      operand1: operand1ValueSegments,
      operand2: operand2ValueSegments,
      type: GroupType.ROW,
    };
  } catch {
    return undefined;
  }
};

// Updated convertAdvancedValueToRootProp using common logic
const convertAdvancedValueToRootProp = (
  value: ValueSegment[],
  loadParameterValueFromString?: (value: string, options: any) => ValueSegment[]
): RowItemProps | undefined => {
  if (isEmptySegments(value)) {
    return {
      operator: RowDropdownOptions.EQUALS,
      operand1: [],
      operand2: [],
      type: GroupType.ROW,
    };
  }

  const nodeMap = new Map<string, ValueSegment>();
  let stringValue = '';
  value.forEach((segment) => {
    if (segment?.token) {
      nodeMap.set(segment.value, segment);
    }
    stringValue += segment.value;
  });

  return parseQueryStringToRowItemProps(stringValue, loadParameterValueFromString, nodeMap);
};
