import { StaticResult } from './StaticResult';
import type { IButtonStyles } from '@fluentui/react';
import { DefaultButton, PrimaryButton, Toggle } from '@fluentui/react';
import type { Schema } from '@microsoft/parsers-logic-apps';
import isEqual from 'lodash.isequal';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

const actionButtonStyles: IButtonStyles = {
  root: {
    width: '100px',
    minWidth: '60px',
    margin: '0px 20px',
    fontSize: '16px',
  },
};

export enum StaticResultOption {
  ENABLED = 'Enabled',
  DISABLED = 'Disabled',
}
export type StaticResultChangeHandler = (newState: OpenAPIV2.SchemaObject, staticResultOption: StaticResultOption) => void;

export interface StaticResultContainerProps {
  enabled?: boolean;
  staticResultSchema: OpenAPIV2.SchemaObject;
  properties: OpenAPIV2.SchemaObject;
  savePropertiesCallback?: StaticResultChangeHandler;
  // prop only passed to inner StaticResults
  updateParentProperties?: (input: any) => void;
}

export type StaticResultRootSchemaType = OpenAPIV2.SchemaObject & {
  properties: {
    status: Schema;
    code: Schema;
    error: Schema;
    outputs?: Schema;
  };
};

export const StaticResultContainer = ({
  enabled = false,
  staticResultSchema,
  properties,
  updateParentProperties,
  savePropertiesCallback,
}: StaticResultContainerProps): JSX.Element => {
  const intl = useIntl();

  const [showStaticResults, setShowStaticResults] = useState<boolean>(enabled);
  const [propertyValues, setPropertyValues] = useState(properties);

  useEffect(() => {
    // we want to update parentProps whenever our inner properties change
    if (!isEqual(propertyValues, properties)) {
      updateParentProperties?.(propertyValues);
    }
  }, [properties, propertyValues, updateParentProperties]);

  const toggleLabelOn = intl.formatMessage({
    defaultMessage: 'Disable Static Result',
    description: 'Label for toggle to disable static result',
  });

  const toggleLabelOff = intl.formatMessage({
    defaultMessage: 'Enable Static Result',
    description: 'Label for toggle to enable static result',
  });

  const testingTitle = intl.formatMessage({
    defaultMessage: 'Testing',
    description: 'Title for testing section',
  });

  const saveButtonLabel = intl.formatMessage({
    defaultMessage: 'Save',
    description: 'Label for save button',
  });

  const cancelButtonLabel = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Label for cancel button',
  });

  const saveStaticResults = () => {
    savePropertiesCallback?.(propertyValues, showStaticResults ? StaticResultOption.ENABLED : StaticResultOption.DISABLED);
  };

  const cancelStaticResults = () => {
    console.log('cancel');
  };

  const getLabel = () => {
    return showStaticResults ? toggleLabelOff : toggleLabelOn;
  };

  const {
    properties: propertiesSchema,
    additionalProperties: additionalPropertiesSchema,
    required,
  } = useMemo(() => {
    return parseStaticResultSchema(staticResultSchema);
  }, [staticResultSchema]);

  return (
    <div className="msla-panel-testing-container">
      <Toggle
        checked={showStaticResults}
        label={getLabel()}
        onChange={() => {
          setShowStaticResults(!showStaticResults);
        }}
      />
      {showStaticResults ? (
        <StaticResult
          title={testingTitle}
          required={required}
          propertiesSchema={propertiesSchema}
          additionalPropertiesSchema={additionalPropertiesSchema}
          propertyValues={propertyValues}
          setPropertyValues={setPropertyValues}
        />
      ) : null}
      <div className="msla-static-result-actions">
        <PrimaryButton
          className={'msla-static-result-action-button'}
          text={saveButtonLabel}
          onClick={saveStaticResults}
          styles={actionButtonStyles}
        />
        <DefaultButton
          className={'msla-static-result-action-button'}
          text={cancelButtonLabel}
          onClick={cancelStaticResults}
          styles={actionButtonStyles}
        />
      </div>
    </div>
  );
};

const parseStaticResultSchema = (staticResultSchema: OpenAPIV2.SchemaObject) => {
  const { additionalProperties, properties, required, type } = staticResultSchema;
  return {
    additionalProperties,
    properties,
    required,
    type,
  };
};
