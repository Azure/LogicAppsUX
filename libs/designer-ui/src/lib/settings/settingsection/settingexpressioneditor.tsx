// type FocusableComponent = ui.utils.FocusableComponent;
// export type SetElementHandler = (componentOrElement: FocusableComponent) => void;
import { ActionButton, IconButton } from '@fluentui/react/lib/Button';
import type { IIconProps } from '@fluentui/react/lib/Icon';
import { TextField } from '@fluentui/react/lib/TextField';
import type { ITextField, ITextFieldStyles } from '@fluentui/react/lib/TextField';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import React, { useRef, useState } from 'react';
import { useIntl } from 'react-intl';

export interface TriggerConditionsSettingProps {
  initialExpressions?: string[];
  readOnly?: boolean;
  // setElementToFocus: SetElementHandler;
  visible?: boolean;
  onExpressionsChange(updatedExpressions: string[]): void;
}

export function TriggerConditionsSetting({
  initialExpressions,
  readOnly,
  visible,
  onExpressionsChange,
}: TriggerConditionsSettingProps): JSX.Element | null {
  if (!visible) {
    return null;
  }

  return (
    <>
      <ExpressionsEditor initialExpressions={initialExpressions || []} readOnly={readOnly || false} onChange={onExpressionsChange} />
    </>
  );
}

TriggerConditionsSetting.defaultProps = {
  initialExpressions: [],
  readOnly: false,
  visible: true,
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
  // setElementToFocus: SetElementHandler;
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
    maximumExpressions: maximumExpressions || 10,
  };

  const addIconProps: IIconProps = {
    iconName: 'Add',
  };

  const expressionRef = useRef<typeof Expression & { focus: any }>(); //implement focus
  const [expressions, setExpressions] = useState(initialExpressions);

  const focus = (): void => {
    if (expressionRef.current) {
      expressionRef.current.focus();
    }
  };

  const handleAddClick = (): void => {
    const updatedExpressions = expressions.slice();
    updatedExpressions.push('');

    onChange(updatedExpressions);
    setExpressions(updatedExpressions);
    focus();
  };

  const handleChange = (index: number, newExpression: string): void => {
    const updatedExpressions = expressions.slice();
    updatedExpressions[index] = newExpression;

    onChange(updatedExpressions);
    setExpressions(updatedExpressions);
  };

  const handleDelete = (index: number): void => {
    const updatedExpressions = expressions.slice();
    updatedExpressions.splice(index, 1);

    onChange(updatedExpressions);
    setExpressions(updatedExpressions);
  };

  return (
    <>
      <Expressions
        ref={expressionRef}
        expressions={expressions}
        readOnly={readOnly}
        // setElementToFocus={setElementToFocus}
        onChange={handleChange}
        onDelete={handleDelete}
      />
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
  // setElementToFocus: SetElementHandler;
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
        // const setElementHandler = index === 0 ? { setElementToFocus } : undefined;
        return (
          <Expression
            key={index}
            {...ref}
            // {...setElementHandler}
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
  // setElementToFocus?: SetElementHandler;
  onChange(index: number, newExpression: string | undefined): void;
  onDelete(index: number): void;
}

const Expression = ({ expression, index, readOnly, onChange, onDelete }: ExpressionProps): JSX.Element => {
  let inputRef: ITextField;
  const intl = useIntl();

  const enterConditionError = intl.formatMessage({
    defaultMessage: 'Enter a condition',
    description: 'error displayed when no condition is entered',
  });

  const deleteCondition = intl.formatMessage({
    defaultMessage: 'Delete',
    description: 'type and label to delete a condition',
  });

  const deleteIconButtonProps: IIconProps = {
    iconName: 'Clear',
  };

  // componentDidMount(): void {
  //     const { setElementToFocus } = this.props;
  //     if (setElementToFocus) {
  //         setElementToFocus(this._inputRef);
  //     }
  // }

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
    return !value ? enterConditionError : undefined;
  };

  return (
    <div className="msla-trigger-condition-expression">
      <TextField
        autoComplete="off"
        // componentRef={input => (inputRef = input)}
        disabled={readOnly}
        required={true}
        spellCheck={false}
        styles={styles}
        value={expression}
        onChange={handleChange}
        onGetErrorMessage={handleGetErrorMessage}
      />
      <TooltipHost content={deleteCondition}>
        <IconButton ariaLabel={deleteCondition} disabled={readOnly} iconProps={deleteIconButtonProps} onClick={handleDeleteClick} />
      </TooltipHost>
    </div>
  );
};
