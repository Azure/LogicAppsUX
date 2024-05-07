import { List, Text } from '@fluentui/react';
import type { TemplateParameterUpdateEvent } from '@microsoft/designer-ui';
import { updateTemplateParameterValue } from '../../../core/state/templates/templateSlice';
import { useIntl } from 'react-intl';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { TemplateparameterField } from '@microsoft/designer-ui';
import type { Template } from '@microsoft/logic-apps-shared';

export const DisplayParameters = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { parameters } = useSelector((state: RootState) => state.template);
  const intl = useIntl();
  const validationErrors = parameters.validationErrors;
  const parametersDefinition = Object.entries(parameters.definitions).map(([key, value]) => ({ id: key, ...value }));

  const onUpdateParameterValue = (event: TemplateParameterUpdateEvent) => dispatch(updateTemplateParameterValue(event));

  const titleText = intl.formatMessage({
    defaultMessage: 'Parameters',
    id: 'X7X5ew',
    description: 'Workflow Parameters Title',
  });

  const renderParameter = (item?: Template.ParameterDefinition): JSX.Element => {
    if (!item) {
      return <></>;
    }
    return (
      <div className="msla-workflow-parameter">
        <div>
          <TemplateparameterField
            definition={item}
            validationError={validationErrors[item?.name ?? '']}
            onChange={onUpdateParameterValue}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <Text variant="xLarge">{titleText}</Text>

      <div className="msla-workflow-parameters">
        {parametersDefinition.length ? (
          <List items={parametersDefinition} onRenderCell={renderParameter} />
        ) : (
          <>PLACEHOLDER: No parameters</>
        )}
      </div>
    </>
  );
};
