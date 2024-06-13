import { List } from '@fluentui/react';
import type { TemplatesParameterUpdateEvent } from '@microsoft/designer-ui';
import { updateTemplateParameterValue } from '../../../core/state/templates/templateSlice';
import { useIntl } from 'react-intl';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { TemplatesParameterField, XLargeText } from '@microsoft/designer-ui';
import type { Template } from '@microsoft/logic-apps-shared';

export const DisplayParameters = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { parameters } = useSelector((state: RootState) => state.template);
  const intl = useIntl();
  const validationErrors = parameters.validationErrors;
  const parametersDefinition = Object.entries(parameters.definitions).map(([key, value]) => ({ id: key, ...value }));

  const onUpdateParameterValue = (event: TemplatesParameterUpdateEvent) => dispatch(updateTemplateParameterValue(event));

  const titleText = intl.formatMessage({
    defaultMessage: 'Parameters',
    id: 'X7X5ew',
    description: 'Workflow Parameters Title',
  });

  const renderParameter = (item?: Template.ParameterDefinition): JSX.Element => {
    if (!item) {
      // eslint-disable-next-line react/jsx-no-useless-fragment
      return <></>;
    }

    return (
      <div key={item?.name} className="msla-workflow-parameter">
        <div>
        <TemplatesParameterField
            name={item?.name}
            definition={{ id: item?.name ?? 'id', ...item }}
            validationErrors={{
              value: validationErrors[item?.name ?? ''],
            }}
            // setName={() => {}}
            onChange={onUpdateParameterValue}
            // isEditable={{
            //   value: true,
            // }}
            required={item?.required ?? false}
          />
          {/* <WorkflowparameterField
            name={item?.name}
            definition={{ id: item?.name ?? 'id', ...item }}
            validationErrors={{
              value: validationErrors[item?.name ?? ''],
            }}
            setName={() => {}}
            onChange={onUpdateParameterValue}
            isEditable={{
              value: true,
            }}
            required={{
              value: item?.required ?? false,
            }}
          /> */}
        </div>
      </div>
    );
  };

  return (
    <>
      <XLargeText text={titleText} />
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
0