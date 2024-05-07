import { List, Text } from '@fluentui/react';
import { WorkflowparameterField } from '@microsoft/designer-ui';
import type { TemplateParameterDefinition } from '../../../core/state/templates/templateSlice';
import { useIntl } from 'react-intl';
import type { RootState } from '../../../core/state/templates/store';
import { useSelector } from 'react-redux';

const VALUE_KEY = 'value';

export const DisplayParameters = () => {
  const intl = useIntl();
  const { parameters } = useSelector((state: RootState) => state.template);
  const validationErrors = parameters.validationErrors;
  const parametersDefinition = Object.entries(parameters.definitions).map(([key, value]) => ({ id: key, ...value }));

  const titleText = intl.formatMessage({
    defaultMessage: 'Parameters',
    id: 'X7X5ew',
    description: 'Workflow Parameters Title',
  });

  const renderParameter = (item?: TemplateParameterDefinition): JSX.Element => {
    // const parameterErrors = validationErrors && item ? validationErrors[item.id] : undefined;
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
            onChange={() => {}}
            isEditable={{
              [VALUE_KEY]: true,
            }}
            isReadOnly={false}
            useLegacy={false}
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
