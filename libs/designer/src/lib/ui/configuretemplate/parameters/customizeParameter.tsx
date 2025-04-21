import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useResourceStrings } from '../resources';
import { useMemo } from 'react';
import { getResourceNameFromId, type Template } from '@microsoft/logic-apps-shared';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../core/state/templates/store';
import { MessageBar, Text } from '@fluentui/react-components';

export const CustomizeParameter = ({
  parameterError,
  parameterDefinition,
  setParameterDefinition,
}: {
  parameterError: string | undefined;
  parameterDefinition: Template.ParameterDefinition;
  setParameterDefinition: (parameterDefinition: Template.ParameterDefinition) => void;
}) => {
  const resourceStrings = useResourceStrings();

  const { isAccelerator } = useSelector((state: RootState) => ({
    isAccelerator: Object.keys(state.template.workflows).length > 1,
  }));

  const detailsSectionItems: TemplatesSectionItem[] = useMemo(() => {
    return [
      {
        label: resourceStrings.ParameterName,
        value: parameterDefinition.name || '',
        type: 'text',
      },
      {
        label: resourceStrings.Type,
        value: parameterDefinition.type || '',
        type: 'text',
      },
      {
        label: resourceStrings.ParameterDisplayName,
        value: parameterDefinition.displayName || '',
        type: 'textfield',
        required: true,
        onChange: (value: string) => {
          setParameterDefinition({
            ...parameterDefinition,
            displayName: value,
          });
        },
      },
      {
        label: resourceStrings.DefaultValue,
        value: parameterDefinition.default || '',
        type: 'textfield',
        onChange: (value: string) => {
          setParameterDefinition({
            ...parameterDefinition,
            default: value,
          });
        },
      },
      {
        label: resourceStrings.Description,
        value: parameterDefinition.description || '',
        type: 'textarea',
        onChange: (value: string) => {
          setParameterDefinition({
            ...parameterDefinition,
            description: value,
          });
        },
      },
      {
        label: resourceStrings.RequiredField,
        value: parameterDefinition.required ?? false,
        type: 'switch',
        onChange: (value: boolean) => {
          setParameterDefinition({
            ...parameterDefinition,
            required: value,
          });
        },
      },
    ];
  }, [resourceStrings, parameterDefinition, setParameterDefinition]);

  return (
    <div>
      {parameterError && (
        <MessageBar intent="error" style={{ marginBottom: '8px' }}>
          {parameterError}
        </MessageBar>
      )}
      <TemplatesSection title={resourceStrings.Details} titleHtmlFor={'detailsSectionLabel'} items={detailsSectionItems} />
      {isAccelerator && parameterDefinition.associatedWorkflows && (
        <TemplatesSection title={resourceStrings.AssociatedWorkflows} titleHtmlFor={'associatedSectionLabel'}>
          <Text>{formatAssociatedWorklows(parameterDefinition.associatedWorkflows)}</Text>
        </TemplatesSection>
      )}
    </div>
  );
};

const formatAssociatedWorklows = (associatedWorkflows: string[]) => {
  return associatedWorkflows.map((workflow) => getResourceNameFromId(workflow)).join(', ');
};
