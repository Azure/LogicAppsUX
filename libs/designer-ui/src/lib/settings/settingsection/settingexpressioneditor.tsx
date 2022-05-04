import { ActionButton, IconButton } from '@fluentui/react/lib/Button';
import type { IIconProps } from '@fluentui/react/lib/Icon';
import { TextField } from '@fluentui/react/lib/TextField';
import type { ITextField, ITextFieldStyles } from '@fluentui/react/lib/TextField';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import React, { useRef, useState } from 'react';
import { useIntl } from 'react-intl';

export interface MultiAddExpressionEditorProps {
  initialExpressions?: string[];
  readOnly?: boolean;
  visible?: boolean;
}

export const MultiAddExpressionEditor = ({ initialExpressions, readOnly, visible }: MultiAddExpressionEditorProps): JSX.Element | null => {
  const defaultProps = {
    initialExpressions: [],
    readOnly: false,
    visible: true,
  };
  if (!initialExpressions || readOnly === undefined || visible === undefined) {
    initialExpressions = defaultProps.initialExpressions;
    readOnly = defaultProps.readOnly;
    visible = defaultProps.visible;
  }
  const [expressions, setExpressions] = useState(initialExpressions);
  const onExpressionsChange = (updatedExpressions: string[]): void => {
    setExpressions(updatedExpressions);
  };

  return (
    <>
      <ExpressionsEditor initialExpressions={initialExpressions ?? []} readOnly={readOnly ?? false} onChange={onExpressionsChange} />
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

interface ExpressionsEditorProps {
  initialExpressions: string[];
  maximumExpressions?: number;
  readOnly: boolean;
  onChange(updatedExpressions: string[]): void;
}

export const ExpressionsEditor = ({ initialExpressions, maximumExpressions, readOnly, onChange }: ExpressionsEditorProps): JSX.Element => {
  const intl = useIntl();
  const addCondition = intl.formatMessage({
    defaultMessage: 'Add',
    description: 'label to add a condition',
  });

  const defaultProps: Required<ExpressionsEditorProps> = {
    initialExpressions,
    readOnly,
    onChange,
    maximumExpressions: maximumExpressions ?? 10,
  };

  const addIconProps: IIconProps = {
    iconName: 'Add',
  };

  const expressionRef = useRef<typeof Expression & { focus: any }>(); //TODO(andrewfowose): implement focus
  const [expressions, setExpressions] = useState(initialExpressions);

  const focus = (): void => {
    if (expressionRef.current) {
      expressionRef.current.focus();
    }
  };

  const handleAddClick = (): void => {
    const updatedExpressions = [...expressions];
    updatedExpressions.push('');

    onChange(updatedExpressions);
    setExpressions(updatedExpressions);
    focus();
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
      <Expressions ref={expressionRef} expressions={expressions} readOnly={readOnly} onChange={handleChange} onDelete={handleDelete} />
      {expressions.length < defaultProps.maximumExpressions ? (
        <ActionButton disabled={readOnly} iconProps={addIconProps} text={addCondition} onClick={handleAddClick} />
      ) : null}
    </>
  );
};

interface ExpressionsProps {
  ref?: React.RefObject<any>;
  expressions: string[];
  readOnly: boolean;
  onChange(index: number, newExpression: string): void;
  onDelete(index: number): void;
}

const Expressions = ({ expressions, readOnly, onChange, onDelete }: ExpressionsProps): JSX.Element => {
  const expressionRef = useRef<typeof Expressions & { focus: any }>();

  const focus = (): void => {
    if (expressionRef.current) {
      expressionRef.current.focus();
    }
  };
  return (
    <>
      {expressions.map((expression, index, array) => {
        const ref = index === array.length - 1 ? { ref: expressionRef } : undefined;
        return (
          <Expression
            key={index}
            {...ref}
            expression={expression}
            index={index}
            readOnly={readOnly}
            onChange={onChange}
            onDelete={onDelete}
          />
        );
      })}
    </>
  );
};

interface ExpressionProps {
  expression: string;
  index: number;
  readOnly: boolean;
  onChange(index: number, newExpression: string | undefined): void;
  onDelete(index: number): void;
}

const Expression = ({ expression, index, readOnly, onChange, onDelete }: ExpressionProps): JSX.Element => {
  let inputRef: ITextField;
  const intl = useIntl();

  const enterValueError = intl.formatMessage({
    defaultMessage: 'Enter a value',
    description: 'error displayed when no value is entered',
  });

  const deleteValue = intl.formatMessage({
    defaultMessage: 'Delete',
    description: 'type and label to delete a value',
  });

  const deleteIconButtonProps: IIconProps = {
    iconName: 'Clear',
  };

  const focus = (): void => {
    if (inputRef) {
      inputRef.focus();
    }
  };

  const handleChange = (_: React.FormEvent<HTMLElement>, newExpression: string | undefined): void => {
    onChange(index, newExpression);
  };

  const handleDeleteClick = (): void => {
    onDelete(index);
  };

  const handleGetErrorMessage = (value: string): string | undefined => {
    return !value ? enterValueError : undefined;
  };

  return (
    <div className="msla-trigger-condition-expression">
      <TextField
        autoComplete="off"
        disabled={readOnly}
        required={true}
        spellCheck={false}
        styles={styles}
        value={expression}
        onChange={handleChange}
        onGetErrorMessage={handleGetErrorMessage}
      />
      <TooltipHost content={deleteValue}>
        <IconButton ariaLabel={deleteValue} disabled={readOnly} iconProps={deleteIconButtonProps} onClick={handleDeleteClick} />
      </TooltipHost>
    </div>
  );
};
