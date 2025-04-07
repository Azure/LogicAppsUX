import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useResourceStrings } from '../resources';
import { useMemo } from 'react';
import { getResourceNameFromId, type Template } from '@microsoft/logic-apps-shared';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../core/state/templates/store';
import { Text } from '@fluentui/react-components';

export const CustomizeParameter = ({
  parameterDefinition,
  setParameterDefinition,
}: {
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
        required: true,
      },
      {
        label: resourceStrings.Type,
        value: parameterDefinition.type || '',
        type: 'text',
        required: true,
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
        required: true,
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
        required: true,
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
        required: true,
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
