import type { GroupItems, RowItemProps } from '.';
import { GroupType } from '.';
import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import type { ChangeHandler, ChangeState, TokenPickerHandler } from '../editor/base';
import { StringEditor } from '../editor/string';
import { Row } from './Row';
import type { IButtonStyles, IStyle } from '@fluentui/react';
import { ActionButton, FontSizes } from '@fluentui/react';
import { isBoolean, isNumber } from '@microsoft/parsers-logic-apps';
import { guid } from '@microsoft/utils-logic-apps';
import { useFunctionalState, useUpdateEffect } from '@react-hookz/web';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface UntilProps {
  readonly?: boolean;
  items: RowItemProps;
  tokenPickerHandler: TokenPickerHandler;
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

const emptyValue = [{ id: guid(), type: ValueSegmentType.LITERAL, value: 'null' }];

export const UntilEditor = ({ tokenPickerHandler, items, readonly, onChange }: UntilProps) => {
  const intl = useIntl();

  const [getRootProp, setRootProp] = useFunctionalState<GroupItems>(items);
  const [currValue, setCurrValue] = useState<string>(convertRootPropToValue(items));
  const [isAdvanced, setIsAdvanced] = useState(false);

  const advancedButtonLabel = intl.formatMessage({
    defaultMessage: 'Edit in advanced mode',
    description: 'Button Label when clicked to swith to advanced editor',
  });

  const basicButtonLabel = intl.formatMessage({
    defaultMessage: 'Edit in basic mode',
    description: 'Button Label when clicked to swith to basic editor',
  });

  useUpdateEffect(() => {
    onChange?.({
      value: emptyValue,
      viewModel: { items: getRootProp(), isOldFormat: true, value: removeQuotes(currValue) },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currValue]);

  const handleUpdateParent = (newProps: GroupItems) => {
    setCurrValue(convertRootPropToValue(newProps as RowItemProps));
    setRootProp(newProps);
  };

  const handleUpdateRootProps = (newState: ChangeState) => {
    setCurrValue(newState.value[0].value);
    setRootProp(convertValueToRootProp(newState.value));
  };

  return (
    <div className="msla-querybuilder-container">
      {isAdvanced ? (
        <StringEditor
          className={'msla-until-editor-container'}
          initialValue={[{ id: guid(), type: ValueSegmentType.LITERAL, value: currValue }]}
          tokenPickerHandler={tokenPickerHandler}
          BasePlugins={{ tokens: false }}
          editorBlur={handleUpdateRootProps}
        />
      ) : (
        <Row
          isTop={false}
          isBottom={false}
          index={0}
          operand1={items.operand1}
          operand2={items.operand2}
          operator={items.operator}
          tokenPickerHandler={tokenPickerHandler}
          handleUpdateParent={handleUpdateParent}
          forceSingleCondition={true}
          groupedItems={[]}
          readonly={readonly}
        />
      )}
      <ActionButton
        className="msla-until-advanced-button"
        disabled={readonly}
        styles={buttonStyles}
        onClick={() => {
          setIsAdvanced(!isAdvanced);
        }}
      >
        {isAdvanced ? basicButtonLabel : advancedButtonLabel}
      </ActionButton>
    </div>
  );
};

const convertRootPropToValue = (rootProps: RowItemProps): string => {
  const op1: string = rootProps.operand1?.[0]?.value ? getOperationValue(rootProps.operand1?.[0].value) : 'null';
  const op2: string = rootProps.operand2?.[0]?.value ? getOperationValue(rootProps.operand2?.[0].value) : 'null';
  return `@${rootProps.operator}(${op1},${op2})`;
};

const convertValueToRootProp = (value: ValueSegment[]): GroupItems => {
  const input = value[0].value;
  const operation: string = input.substring(input.indexOf('@') + 1, input.indexOf('('));
  const operations = input.split(',');
  const operand1: ValueSegment[] = [
    { id: guid(), type: ValueSegmentType.LITERAL, value: removeQuotes(operations[0].substring(operations[0].indexOf('(') + 1).trim()) },
  ];
  const operand2: ValueSegment[] = [
    { id: guid(), type: ValueSegmentType.LITERAL, value: removeQuotes(operations[1].substring(0, operations[1].indexOf(')')).trim()) },
  ];
  return { operator: operation, operand1, operand2, type: GroupType.ROW };
};

const getOperationValue = (s: string): string => {
  const opeartionHasQuote = checkIfHasQuotes(s);
  return `${opeartionHasQuote ? "'" : ''}${s}${opeartionHasQuote ? "'" : ''}`;
};

export function checkIfHasQuotes(value?: string): boolean {
  if (value && (isNumber(value) || isBoolean(value))) {
    return false;
  }
  return true;
}

const removeQuotes = (s: string): string => {
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  return s;
};
