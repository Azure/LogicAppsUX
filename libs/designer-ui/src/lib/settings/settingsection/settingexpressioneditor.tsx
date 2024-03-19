import type { SettingProps } from './settingtoggle';
import { ActionButton, IconButton } from '@fluentui/react/lib/Button';
import type { IIconProps } from '@fluentui/react/lib/Icon';
import { TextField } from '@fluentui/react/lib/TextField';
import type { ITextFieldStyles } from '@fluentui/react/lib/TextField';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';

export type ExpressionChangeHandler = (updatedExpressions: string[]) => void;
export interface MultiAddExpressionEditorProps extends SettingProps {
  initialExpressions?: string[];
  onExpressionsChange: ExpressionChangeHandler;
}

// TODO: MultiAddExpressionEditor seems to be overfactored, and can be simplified
export const MultiAddExpressionEditor = ({
  initialExpressions = [],
  readOnly = false,
  customLabel,
  ariaLabel,
  onExpressionsChange,
}: MultiAddExpressionEditorProps): JSX.Element | null => {
  return (
    <>
      {customLabel ? customLabel : null}
      <ExpressionsEditor
        initialExpressions={initialExpressions ?? []}
        readOnly={readOnly}
        onChange={onExpressionsChange}
        ariaLabel={ariaLabel}
      />
    </>
  );
};

const styles: Partial<ITextFieldStyles> = {
  fieldGroup: {
    selectors: {
      ':before': {
        content: '',
      },
    },
  },
};

export interface ExpressionsEditorProps extends SettingProps {
  initialExpressions: string[];
  maximumExpressions?: number;
  onChange(updatedExpressions: string[]): void;
}

export const ExpressionsEditor = ({
  initialExpressions,
  maximumExpressions,
  readOnly = false,
  onChange,
  ariaLabel,
}: ExpressionsEditorProps): JSX.Element => {
  const intl = useIntl();
  const addCondition = intl.formatMessage({
    defaultMessage: 'Add',
    id: 'LpPNAD',
    description: 'label to add a condition',
  });
  const expressionEditorLabel = intl.formatMessage({
    defaultMessage: 'Expression Editor',
    id: 'zEv8dd',
    description: 'label for expression editor',
  });

  const defaultProps: ExpressionsEditorProps = {
    initialExpressions,
    readOnly: false,
    onChange,
    maximumExpressions: maximumExpressions ?? 10,
    customLabel: <div>{expressionEditorLabel}</div>,
  };

  const addIconProps: IIconProps = {
    iconName: 'Add',
  };

  // const expressionRef = useRef<typeof Expression & { focus: any }>(); //TODO: implement focus
  const [expressions, setExpressions] = useState(initialExpressions);

  const handleAddClick = (): void => {
    const updatedExpressions = [...expressions];
    updatedExpressions.push('');

    onChange(updatedExpressions);
    setExpressions(updatedExpressions);
  };

  const handleChange = (index: number, newExpression: string): void => {
    const updatedExpressions = [...expressions];
    updatedExpressions[index] = newExpression;

    onChange(updatedExpressions);
    setExpressions(updatedExpressions);
  };

  const handleDelete = (index: number): void => {
    const updatedExpressions = [...expressions];
    updatedExpressions.splice(index, 1);

    onChange(updatedExpressions);
    setExpressions(updatedExpressions);
  };

  return (
    <>
      {expressions.length < (defaultProps.maximumExpressions ?? 10) ? (
        <ActionButton disabled={readOnly} iconProps={addIconProps} text={addCondition} onClick={handleAddClick} />
      ) : null}
      <Expressions ariaLabel={ariaLabel} expressions={expressions} readOnly={readOnly} onChange={handleChange} onDelete={handleDelete} />
    </>
  );
};

export interface ExpressionsProps extends SettingProps {
  expressions: string[];
  onChange(index: number, newExpression: string): void;
  onDelete(index: number): void;
}

export const Expressions = ({ expressions, readOnly = false, onChange, onDelete, ariaLabel }: ExpressionsProps): JSX.Element => {
  const intl = useIntl();
  const indexItem = intl.formatMessage({
    defaultMessage: 'item',
    id: 'NFgfP4',
    description: 'Label for users to know which item they are on in the dictionary',
  });

  return (
    <>
      {expressions.map((expression, index) => {
        return (
          <Expression
            key={index}
            expression={expression}
            index={index}
            readOnly={readOnly}
            onChange={onChange}
            onDelete={onDelete}
            ariaLabel={`${ariaLabel} ${indexItem} ${index + 1}`}
          />
        );
      })}
    </>
  );
};

export interface ExpressionProps extends SettingProps {
  expression: string;
  index: number;
  onChange(index: number, newExpression: string | undefined): void;
  onDelete(index: number): void;
}

export const Expression = ({ expression, index, readOnly = false, onChange, onDelete, ariaLabel }: ExpressionProps): JSX.Element => {
  const intl = useIntl();

  const expressionValue = expression ? `'${expression}'` : '';
  const deleteValue = intl.formatMessage(
    {
      defaultMessage: 'Delete {expressionValue}',
      id: 'UMPuUJ',
      description: 'Label to delete a value',
    },
    {
      expressionValue,
    }
  );

  const deleteIconButtonProps: IIconProps = {
    iconName: 'Clear',
  };

  const handleChange = (_: React.FormEvent<HTMLElement>, newExpression: string | undefined): void => {
    onChange(index, newExpression);
  };

  const handleDeleteClick = (): void => {
    onDelete(index);
  };

  return (
    <div className="msla-trigger-condition-expression">
      <TextField
        autoComplete="off"
        disabled={readOnly}
        spellCheck={false}
        styles={styles}
        value={expression}
        onChange={handleChange}
        ariaLabel={ariaLabel}
      />
      <TooltipHost content={deleteValue}>
        <IconButton
          className="msla-trigger-condition-expression-add"
          ariaLabel={deleteValue}
          disabled={readOnly}
          iconProps={deleteIconButtonProps}
          onClick={handleDeleteClick}
        />
      </TooltipHost>
    </div>
  );
};
