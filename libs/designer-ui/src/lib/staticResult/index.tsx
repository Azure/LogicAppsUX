import constants from '../constants';
import { StaticResultProperties } from './staticResultProperties';
import type { IButtonStyles } from '@fluentui/react';
import { DefaultButton, Icon, PrimaryButton, Toggle, useTheme } from '@fluentui/react';
import type { Schema } from '@microsoft/parsers-logic-apps';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

const actionButtonStyles: IButtonStyles = {
  root: {
    width: '100px',
    minWidth: '60px',
    margin: '0px 20px',
    fontSize: '16px',
  },
};

export interface StaticResultProps {
  title?: string;
  enabled?: boolean;
  staticResultSchema: OpenAPIV2.SchemaObject;
  isRoot?: boolean;
}

export type StaticResultRootSchemaType = OpenAPIV2.SchemaObject & {
  properties: {
    status: Schema;
    code: Schema;
    error: Schema;
    outputs?: Schema;
  };
};

export const StaticResult = ({ title, enabled, staticResultSchema, isRoot = true }: StaticResultProps): JSX.Element => {
  const intl = useIntl();
  const { isInverted } = useTheme();
  const [showStaticResults, setShowStaticResults] = useState<boolean>(enabled ?? false);
  const [expanded, setExpanded] = useState(true);

  const toggleLabelOn = intl.formatMessage({
    defaultMessage: 'Disable Static Result',
    description: 'Label for toggle to disable static result',
  });

  const toggleLabelOff = intl.formatMessage({
    defaultMessage: 'Enable Static Result',
    description: 'Label for toggle to enable static result',
  });

  const expandLabel = intl.formatMessage({
    defaultMessage: 'Expand Static Result',
    description: 'An accessible label for expand toggle icon',
  });

  const collapseLabel = intl.formatMessage({
    defaultMessage: 'Collapse Static Result',
    description: 'An accessible label for collapse toggle icon',
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
    console.log('save');
  };

  const cancelStaticResults = () => {
    console.log('cancel');
  };

  const getLabel = () => {
    return showStaticResults ? toggleLabelOff : toggleLabelOn;
  };

  const { properties, additionalProperties, required } = useMemo(() => {
    return parseStaticResultSchema(staticResultSchema);
  }, [staticResultSchema]);

  return (
    <div className="msla-panel-testing-container">
      {isRoot ? (
        <Toggle
          label={getLabel()}
          onChange={() => {
            setShowStaticResults(!showStaticResults);
          }}
        />
      ) : null}
      {showStaticResults ? (
        <div className="msla-static-result-container">
          <button className="msla-static-result-container-header" onClick={() => setExpanded(!expanded)}>
            <Icon
              className="msla-static-result-container-header-icon"
              ariaLabel={expanded ? `${expandLabel}` : `${collapseLabel}`}
              iconName={expanded ? 'ChevronDownMed' : 'ChevronRightMed'}
              styles={{ root: { fontSize: 14, color: isInverted ? constants.STANDARD_TEXT_COLOR : constants.CHEVRON_ROOT_COLOR_LIGHT } }}
            />
            <div className="msla-static-result-container-header-text">{title ?? testingTitle}</div>
          </button>
          {expanded ? (
            <StaticResultProperties
              propertiesSchema={properties as StaticResultRootSchemaType}
              required={required}
              additionalProperties={!!additionalProperties}
            />
          ) : null}
        </div>
      ) : null}
      {isRoot ? (
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
      ) : null}
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
