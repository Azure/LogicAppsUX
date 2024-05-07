import { List, Text } from '@fluentui/react';
import type { WorkflowParameterUpdateEvent } from '@microsoft/designer-ui';
import { WorkflowparameterField } from '@microsoft/designer-ui';
import { updateTemplateParameterValue, type TemplateParameterDefinition } from '../../../core/state/templates/templateSlice';
import { useIntl } from 'react-intl';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';

const VALUE_KEY = 'value';

export const DisplayParameters = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { parameters } = useSelector((state: RootState) => state.template);
  const intl = useIntl();
  const validationErrors = parameters.validationErrors;
  const parametersDefinition = Object.entries(parameters.definitions).map(([key, value]) => ({ id: key, ...value }));

  const onUpdateParameterValue = (event: WorkflowParameterUpdateEvent) => dispatch(updateTemplateParameterValue(event));

  const titleText = intl.formatMessage({
    defaultMessage: 'Parameters',
    id: 'X7X5ew',
    description: 'Workflow Parameters Title',
  });

  const renderParameter = (item?: TemplateParameterDefinition): JSX.Element => {
    return (
      <div className="msla-workflow-parameter">
        <div>
          <WorkflowparameterField
            name={item?.name}
            definition={{ id: item?.name ?? 'id', type: 'array', ...item }}
            validationErrors={{
              [VALUE_KEY]: validationErrors[item?.name ?? ''],
            }}
            setName={() => {}}
            onChange={onUpdateParameterValue}
            isEditable={{
              [VALUE_KEY]: true,
            }}
            isReadOnly={false}
            useLegacy={false}
            required={{
              [VALUE_KEY]: item?.required ?? false,
            }}
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
