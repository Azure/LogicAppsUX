import type { StaticResultRootSchemaType } from '.';
import constants from '../constants';
import { StaticResultProperties } from './staticResultProperties';
import { Icon, useTheme } from '@fluentui/react';
import type { OpenAPIV2 } from '@microsoft/logic-apps-designer';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface StaticResultProps {
  isRoot?: boolean;
  title: string;
  required?: string[];
  propertiesSchema?: OpenAPIV2.SchemaObject;
  additionalPropertiesSchema?: boolean | OpenAPIV2.IJsonSchema;
  propertyValues: OpenAPIV2.SchemaObject;
  setPropertyValues: (newPropertyValue: OpenAPIV2.SchemaObject) => void;
}

export const StaticResult = ({
  isRoot = false,
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
      {!isRoot ? (
        <button className="msla-static-result-container-header" onClick={() => setExpanded(!expanded)}>
          <div className="msla-static-result-container-header-text">{title}</div>
          <Icon
            className="msla-static-result-container-header-icon"
            aria-label={expanded ? `${expandLabel}` : `${collapseLabel}`}
            iconName={expanded ? 'ChevronDownMed' : 'ChevronLeftMed'}
            styles={{ root: { fontSize: 14, color: isInverted ? constants.INVERTED_TEXT_COLOR : constants.CHEVRON_ROOT_COLOR_LIGHT } }}
          />
        </button>
      ) : (
        <div>
          <div className="msla-static-result-container-header-root">
            <div className="msla-static-result-container-header-text">{title}</div>
          </div>
        </div>
      )}
      {expanded ? (
        <StaticResultProperties
          isRoot={isRoot}
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
