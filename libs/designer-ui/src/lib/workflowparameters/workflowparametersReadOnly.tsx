import React from 'react';
import { labelStyles, ParameterFieldDetails } from './workflowparametersField';
import { Label } from '@fluentui/react/lib/Label';
import { Text } from '@fluentui/react/lib/Text';
import { FormattedMessage } from 'react-intl';

export interface ReadOnlyParametersProps {
  parameterDetails: ParameterFieldDetails;
  name?: string;
  type?: string;
  defaultValue?: string;
}

export const ReadOnlyParameters = ({ name, type, defaultValue, parameterDetails }: ReadOnlyParametersProps): JSX.Element => {
  return (
    <>
      <div className="msla-workflow-parameter-field">
        <Label styles={labelStyles} htmlFor={parameterDetails.name}>
          <FormattedMessage defaultMessage="Name" description="Name Title" />
        </Label>
        <Text className="msla-workflow-parameter-read-only">{name}</Text>
      </div>
      <div className="msla-workflow-parameter-field">
        <Label styles={labelStyles} htmlFor={parameterDetails.type}>
          <FormattedMessage defaultMessage="Title" description="Type Title" />
        </Label>
        <Text className="msla-workflow-parameter-read-only">{type}</Text>
      </div>
      <div className="msla-workflow-parameter-value-field">
        <Label styles={labelStyles} htmlFor={parameterDetails.value}>
          <FormattedMessage defaultMessage="Value" description="Value Title" />
        </Label>
        <Text block className="msla-workflow-parameter-read-only">
          {defaultValue}
        </Text>
      </div>
    </>
  );
};
