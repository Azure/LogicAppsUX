import type { StaticResultRootSchemaType } from '.';
import constants from '../constants';
import { StaticResultProperties } from './staticResultProperties';
import { Icon, useTheme } from '@fluentui/react';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface StaticResultProps {
  title: string;
  required?: string[];
  propertiesSchema?: OpenAPIV2.SchemaObject;
  additionalPropertiesSchema?: boolean | OpenAPIV2.IJsonSchema;
  propertyValues: OpenAPIV2.SchemaObject;
  setPropertyValues: (newPropertyValue: OpenAPIV2.SchemaObject) => void;
}

export const StaticResult = ({
  title,
  required = [],
  propertiesSchema = {},
  additionalPropertiesSchema,
  propertyValues,
  setPropertyValues,
}: StaticResultProps): JSX.Element => {
  const { isInverted } = useTheme();
  const intl = useIntl();
  const [expanded, setExpanded] = useState(true);

  const expandLabel = intl.formatMessage({
    defaultMessage: 'Expand Static Result',
    description: 'An accessible label for expand toggle icon',
  });

  const collapseLabel = intl.formatMessage({
    defaultMessage: 'Collapse Static Result',
    description: 'An accessible label for collapse toggle icon',
  });
  return (
    <div className="msla-static-result-container">
      <button className="msla-static-result-container-header" onClick={() => setExpanded(!expanded)}>
        <Icon
          className="msla-static-result-container-header-icon"
          ariaLabel={expanded ? `${expandLabel}` : `${collapseLabel}`}
          iconName={expanded ? 'ChevronDownMed' : 'ChevronRightMed'}
          styles={{ root: { fontSize: 14, color: isInverted ? constants.STANDARD_TEXT_COLOR : constants.CHEVRON_ROOT_COLOR_LIGHT } }}
        />
        <div className="msla-static-result-container-header-text">{title}</div>
      </button>
      {expanded ? (
        <StaticResultProperties
          propertyValues={propertyValues}
          setPropertyValues={setPropertyValues}
          propertiesSchema={propertiesSchema as StaticResultRootSchemaType}
          required={required}
          additionalPropertiesSchema={!!additionalPropertiesSchema}
        />
      ) : null}
    </div>
  );
};
