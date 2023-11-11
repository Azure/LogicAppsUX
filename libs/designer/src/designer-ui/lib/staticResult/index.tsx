import { StaticResult } from './StaticResult';
import { deserializePropertyValues, parseStaticResultSchema, serializePropertyValues } from './util';
import type { IButtonStyles } from '@fluentui/react';
import { DefaultButton, PrimaryButton, Toggle } from '@fluentui/react';
import type { OpenAPIV2 } from '@microsoft/logic-apps-designer';
import isEqual from 'lodash.isequal';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

type Schema = OpenAPIV2.Schema;

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
  cancelPropertiesCallback?: () => void;
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
  cancelPropertiesCallback,
  savePropertiesCallback,
}: StaticResultContainerProps): JSX.Element => {
  const intl = useIntl();
  const initialPropertyValues = useMemo(() => deserializePropertyValues(properties, staticResultSchema), [properties, staticResultSchema]);

  const [showStaticResults, setShowStaticResults] = useState<boolean>(enabled);
  const [propertyValues, setPropertyValues] = useState<OpenAPIV2.SchemaObject>(initialPropertyValues);

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
    // console.log(JSON.stringify(serializePropertyValues(propertyValues, staticResultSchema), null, 2));
    savePropertiesCallback?.(
      serializePropertyValues(propertyValues, staticResultSchema),
      showStaticResults ? StaticResultOption.ENABLED : StaticResultOption.DISABLED
    );
  };

  const cancelStaticResults = () => {
    setPropertyValues(initialPropertyValues);
    cancelPropertiesCallback?.();
  };

  const getLabel = () => {
    return showStaticResults ? toggleLabelOn : toggleLabelOff;
  };

  const isLabelDisabled = (): boolean => {
    return JSON.stringify(propertyValues) === JSON.stringify(initialPropertyValues) && showStaticResults === enabled;
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
          isRoot={true}
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
          disabled={isLabelDisabled()}
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
