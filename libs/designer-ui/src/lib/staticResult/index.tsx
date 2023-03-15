import { StaticResultProperty } from './staticResultProperty';
import { Toggle } from '@fluentui/react';
import type { Schema } from '@microsoft/parsers-logic-apps';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

export interface StaticResultProps {
  enabled?: boolean;
  staticResultSchema: OpenAPIV2.SchemaObject;
}

export type StaticResultRootSchemaType = OpenAPIV2.SchemaObject & {
  properties: {
    status: Schema;
    code: Schema;
    error: Schema;
    outputs?: Schema;
  };
};

export const StaticResult = ({ enabled, staticResultSchema }: StaticResultProps): JSX.Element => {
  const intl = useIntl();
  const [showStaticResults, setShowStaticResults] = useState<boolean>(enabled ?? false);

  const toggleLabelOn = intl.formatMessage({
    defaultMessage: 'Disable Static Result',
    description: 'Label for toggle to disable static result',
  });

  const toggleLabelOff = intl.formatMessage({
    defaultMessage: 'Enable Static Result',
    description: 'Label for toggle to enable static result',
  });

  const getLabel = () => {
    return enabled ? toggleLabelOn : toggleLabelOff;
  };

  const { properties, additionalProperties, required } = useMemo(() => {
    return parseStaticReultSchema(staticResultSchema);
  }, [staticResultSchema]);

  return (
    <div className="msla-panel-testing-container">
      <Toggle
        label={getLabel()}
        onChange={() => {
          setShowStaticResults(!showStaticResults);
        }}
      />
      {showStaticResults ? (
        <div className="msla-static-result-container">
          {
            <StaticResultProperty
              properties={properties as StaticResultRootSchemaType}
              required={required}
              additionalProperties={!!additionalProperties}
            />
          }
        </div>
      ) : null}
    </div>
  );
};

const parseStaticReultSchema = (staticResultSchema: OpenAPIV2.SchemaObject) => {
  const { additionalProperties, properties, required, type } = staticResultSchema;
  return {
    additionalProperties,
    properties,
    required,
    type,
  };
};
