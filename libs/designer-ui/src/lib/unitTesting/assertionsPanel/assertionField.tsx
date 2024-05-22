import constants from '../../constants';
import type { GetConditionExpressionHandler } from './assertion';
import type { ILabelStyles, IStyle, ITextFieldStyles } from '@fluentui/react';
import { Label, TextField } from '@fluentui/react';
import { type Assertion, isEmptyString, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { MediumText } from '../../text';
import { useIntl } from 'react-intl';

export const labelStyles: Partial<ILabelStyles> = {
  root: {
    display: 'inline-block',
    minWidth: '120px',
    verticalAlign: 'top',
    padding: '5px 0px',
  },
};

const fieldStyles: IStyle = {
  display: 'inline-block',
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 'auto',
};

const textFieldStyles: Partial<ITextFieldStyles> = {
  root: fieldStyles,
};

const DESCRIPTION_KEY = 'description';
const NAME_KEY = 'name';
const EXPRESSION_KEY = 'expression';

export interface ParameterFieldDetails {
  description: string;
  name: string;
  expressionKey: string;
  expression: string;
}

export interface AssertionFieldProps {
  id: string;
  name: string;
  description: string;
  expression: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  setExpression: React.Dispatch<React.SetStateAction<string>>;
  isEditable: boolean;
  isExpanded: boolean;
  getConditionExpression: GetConditionExpressionHandler;
  handleUpdate: (newAssertion: Assertion) => void;
  validationErrors?: Record<string, string | undefined>;
}

export const AssertionField = ({
  id,
  name,
  description,
  setName,
  setDescription,
  setExpression,
  expression,
  isEditable,
  isExpanded,
  getConditionExpression,
  handleUpdate,
  validationErrors,
}: AssertionFieldProps): JSX.Element => {
  const intl = useIntl();

  const parameterDetails: ParameterFieldDetails = {
    description: `${name}-${DESCRIPTION_KEY}`,
    name: `${name}-${NAME_KEY}`,
    expressionKey: `${id}-${EXPRESSION_KEY}`,
    expression: `${name}-${EXPRESSION_KEY}`,
  };

  const nameTitle = intl.formatMessage({
    defaultMessage: 'Assertion name',
    id: 'LdBN0m',
    description: 'Assertion field name title',
  });

  const descriptionTitle = intl.formatMessage({
    defaultMessage: 'Description',
    id: 's4omwa',
    description: 'Assertion field description title',
  });

  const conditionTitle = intl.formatMessage({
    defaultMessage: 'Condition expression',
    id: 'ujp53j',
    description: 'Assertion field condition title',
  });

  const noDescription = intl.formatMessage({
    defaultMessage: 'No description',
    id: 'kSXjTx',
    description: 'Assertion field no description text',
  });

  const namePlaceholder = intl.formatMessage({
    defaultMessage: 'Enter name',
    id: 'PhBS5+',
    description: 'Assertion field name placeholder',
  });

  const descriptionPlaceholder = intl.formatMessage({
    defaultMessage: 'Enter description',
    id: 'hW7oe7',
    description: 'Assertion field description placeholder',
  });

  const onDescriptionChange = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    setDescription(newValue ?? '');
    handleUpdate({ name, description: newValue ?? '', assertionString: expression });
  };

  const onNameChange = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    setName(newValue ?? '');
    handleUpdate({ name: newValue ?? '', description, assertionString: expression });
  };

  const onExpressionChange = (conditionExpression: string): void => {
    setExpression(conditionExpression);
    console.log('charlie', name);
    handleUpdate({ name, description, assertionString: conditionExpression });
  };

  const conditionExpression = getConditionExpression(
    parameterDetails.expressionKey,
    parameterDetails.expression,
    expression,
    constants.SWAGGER.TYPE.ANY,
    onExpressionChange,
    !isEditable
  );

  return (
    <>
      <div className="msla-assertion-field">
        {isExpanded ? (
          <Label styles={labelStyles} required={true} htmlFor={parameterDetails.name}>
            {nameTitle}
          </Label>
        ) : null}
        {isExpanded ? (
          <TextField
            data-testid={parameterDetails.name}
            styles={textFieldStyles}
            id={parameterDetails.name}
            ariaLabel={nameTitle}
            placeholder={namePlaceholder}
            errorMessage={validationErrors && validationErrors[NAME_KEY]}
            value={name}
            onChange={onNameChange}
            disabled={!isEditable}
          />
        ) : null}
      </div>
      <div className="msla-assertion-field">
        {isExpanded ? (
          <Label styles={labelStyles} htmlFor={parameterDetails.description}>
            {descriptionTitle}
          </Label>
        ) : null}
        {isExpanded ? (
          <TextField
            data-testid={parameterDetails.description}
            styles={textFieldStyles}
            id={parameterDetails.description}
            ariaLabel={descriptionTitle}
            placeholder={descriptionPlaceholder}
            value={description}
            onChange={onDescriptionChange}
            disabled={!isEditable}
            multiline
            autoAdjustHeight
          />
        ) : isEmptyString(description) ? (
          <MediumText text={noDescription} className="msla-assertion-field-read-only assertion-field-no-content" />
        ) : (
          <MediumText text={description} className="msla-assertion-field-read-only" />
        )}
      </div>
      <div className="msla-assertion-condition">
        {isExpanded ? (
          <Label styles={labelStyles} required={true} htmlFor={parameterDetails.expression}>
            {conditionTitle}
          </Label>
        ) : null}
        <div className="msla-assertion-condition-editor">
          {isExpanded ? (
            <>
              {conditionExpression}
              {!isNullOrUndefined(validationErrors) && validationErrors[EXPRESSION_KEY] && (
                <span className="msla-input-parameter-error" role="alert">
                  {validationErrors[EXPRESSION_KEY]}
                </span>
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
};
