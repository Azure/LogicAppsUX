import type { ParameterFieldDetails } from './workflowparametersField';
import { labelStyles } from './workflowparametersField';
import { Label, Text } from '@fluentui/react';
import { useIntl } from 'react-intl';

export interface ReadOnlyParametersProps {
  parameterDetails: ParameterFieldDetails;
  name?: string;
  type?: string;
  defaultValue?: string;
}

export const ReadOnlyParameters = ({ name, type, defaultValue, parameterDetails }: ReadOnlyParametersProps): JSX.Element => {
  const intl = useIntl();
  const nameTitle = intl.formatMessage({
    defaultMessage: 'Name',
    description: 'Name Title',
  });

  const typeTitle = intl.formatMessage({
    defaultMessage: 'Title',
    description: 'Type Title',
  });

  const valueTitle = intl.formatMessage({
    defaultMessage: 'Value',
    description: 'Value Title',
  });
  return (
    <>
      <div className="msla-workflow-parameter-field">
        <Label data-testid="readonly-name-label" styles={labelStyles} htmlFor={parameterDetails.name}>
          {nameTitle}
        </Label>
        <Text className="msla-workflow-parameter-read-only">{name}</Text>
      </div>
      <div className="msla-workflow-parameter-field">
        <Label styles={labelStyles} htmlFor={parameterDetails.type}>
          {typeTitle}
        </Label>
        <Text className="msla-workflow-parameter-read-only">{type}</Text>
      </div>
      <div className="msla-workflow-parameter-value-field">
        <Label styles={labelStyles} htmlFor={parameterDetails.value}>
          {valueTitle}
        </Label>
        <Text block className="msla-workflow-parameter-read-only">
          {defaultValue}
        </Text>
      </div>
    </>
  );
};
