import type { ValueSegment } from '../editor';
import type { ChangeState } from '../editor/base';
import { TokenField } from '../settings/settingsection/settingTokenField';
import type { ILabelStyles, IStyle, ITextFieldStyles } from '@fluentui/react';
import { Label, Text, TextField } from '@fluentui/react';
import { isEmptyString } from '@microsoft/utils-logic-apps';
import { useState } from 'react';
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
const CONDITION_KEY = 'condition';

export interface ParameterFieldDetails {
  description: string;
  name: string;
  condition: any; //TODO(ccastrotrejo): Change to condition object type
}

export interface AssertionFieldProps {
  name: string;
  description: string;
  expression: any;
  setName: React.Dispatch<React.SetStateAction<string>>;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  setExpression: React.Dispatch<React.SetStateAction<any>>;
  isEditable?: boolean;
  isReadOnly?: boolean;
}

export const AssertionField = ({
  name,
  description,
  setName,
  setDescription,
  expression,
  isEditable,
  isReadOnly,
}: AssertionFieldProps): JSX.Element => {
  const intl = useIntl();
  const [tokenMapping, _setTokenMapping] = useState<Record<string, ValueSegment>>({});

  const parameterDetails: ParameterFieldDetails = {
    description: `${name}-${DESCRIPTION_KEY}`,
    name: `${name}-${NAME_KEY}`,
    condition: `${name}-${CONDITION_KEY}`,
  };

  const nameTitle = intl.formatMessage({
    defaultMessage: 'Assertion name',
    description: 'Assertion field name title',
  });

  const descriptionTitle = intl.formatMessage({
    defaultMessage: 'Description',
    description: 'Assertion field description title',
  });

  const conditionTitle = intl.formatMessage({
    defaultMessage: 'Condition expression',
    description: 'Assertion field condition title',
  });

  const noDescription = intl.formatMessage({
    defaultMessage: 'No description',
    description: 'Assertion field no description text',
  });

  const namePlaceholder = intl.formatMessage({
    defaultMessage: 'Enter name',
    description: 'Assertion field name placeholder',
  });

  const descriptionPlaceholder = intl.formatMessage({
    defaultMessage: 'Enter description',
    description: 'Assertion field description placeholder',
  });

  const onDescriptionChange = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    setDescription(newValue ?? '');
  };

  const onNameChange = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    setName(newValue ?? '');
  };

  const onExpressionChange = (newState: ChangeState): void => {
    console.log('charlie', newState);
  };

  console.log('charlie expression', expression);

  return (
    <>
      <div className="msla-assertion-field">
        {isEditable ? (
          <Label styles={labelStyles} required={true} htmlFor={parameterDetails.name}>
            {nameTitle}
          </Label>
        ) : null}
        {isEditable ? (
          <TextField
            data-testid={parameterDetails.name}
            styles={textFieldStyles}
            id={parameterDetails.name}
            ariaLabel={nameTitle}
            placeholder={namePlaceholder}
            value={name}
            onChange={onNameChange}
            disabled={isReadOnly}
          />
        ) : null}
      </div>
      <div className="msla-assertion-field">
        {isEditable ? (
          <Label styles={labelStyles} htmlFor={parameterDetails.description}>
            {descriptionTitle}
          </Label>
        ) : null}
        {isEditable ? (
          <TextField
            data-testid={parameterDetails.description}
            styles={textFieldStyles}
            id={parameterDetails.description}
            ariaLabel={descriptionTitle}
            placeholder={descriptionPlaceholder}
            value={description}
            onChange={onDescriptionChange}
            disabled={isReadOnly}
            multiline
            autoAdjustHeight
          />
        ) : isEmptyString(description) ? (
          <Text className="msla-assertion-field-read-only assertion-field-no-content">{noDescription}</Text>
        ) : (
          <Text className="msla-assertion-field-read-only">{description}</Text>
        )}
      </div>
      <div className="msla-assertion-condition">
        {isEditable ? (
          <Label styles={labelStyles} required={true} htmlFor={parameterDetails.condition}>
            {conditionTitle}
          </Label>
        ) : null}
        <div className="msla-assertion-condition-editor">
          {isEditable ? (
            <TokenField
              editor="condition"
              editorViewModel={expression ?? {}}
              readOnly={false}
              label="Condition"
              labelId="condition-label"
              tokenEditor={true}
              value={[]}
              tokenMapping={tokenMapping}
              getTokenPicker={() => {
                return <div>{'Token Picker'}</div>;
              }}
              onCastParameter={() => ''}
              onValueChange={onExpressionChange}
            />
          ) : // <QueryBuilderEditor
          //   readonly={readOnly}
          //   groupProps={JSON.parse(JSON.stringify(editorViewModel.items))}
          //   onChange={onValueChange}
          //   tokenMapping={tokenMapping}
          //   loadParameterValueFromString={loadParameterValueFromString}
          //   getTokenPicker={getTokenPicker}
          //   showDescription={true}
          // />
          null}
        </div>
      </div>
    </>
  );
};
