import type { StaticResultRootSchemaType } from '.';
import constants from '../constants';
import { StaticResultProperties } from './staticResultProperties';
import { Icon, IconButton, useTheme } from '@fluentui/react';
import type { OpenAPIV2 } from '@microsoft/logic-apps-shared';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface StaticResultProps {
  isRoot?: boolean;
  title: string;
  required?: string[];
  propertiesSchema?: OpenAPIV2.SchemaObject;
  additionalPropertiesSchema?: boolean | OpenAPIV2.IJsonSchema;
  propertyValues: OpenAPIV2.SchemaObject;
  setPropertyValues: Dispatch<SetStateAction<OpenAPIV2.SchemaObject>>;
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
    id: 'DkF25I',
    description: 'An accessible label for expand toggle icon',
  });

  const collapseLabel = intl.formatMessage({
    defaultMessage: 'Collapse Static Result',
    id: 'ZRdkFN',
    description: 'An accessible label for collapse toggle icon',
  });

  const infoButtonLabel = intl.formatMessage({
    defaultMessage: 'Click for more information on Static Result',
    id: 'ANGw2o',
    description: 'button label to show more information on static result',
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
            <a
              href="https://learn.microsoft.com/en-us/azure/logic-apps/test-logic-apps-mock-data-static-results?tabs=standard"
              target="_blank"
              rel="noreferrer"
            >
              <IconButton className="static-result-info-icon" iconProps={{ iconName: 'info' }} title={infoButtonLabel} />
            </a>
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
