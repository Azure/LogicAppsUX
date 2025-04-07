import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useResourceStrings } from '../resources';
import { useMemo } from 'react';
import { useParameterDefinition } from '../../../core/configuretemplate/configuretemplateselectors';
import { useFunctionalState } from '@react-hookz/web';
import type { Template } from '@microsoft/logic-apps-shared';

export const CustomizeParameter = ({ parameterId }: { parameterId: string }) => {
  // const intl = useIntl();
  const resourceStrings = useResourceStrings();
  const parameterDefinition = useParameterDefinition(parameterId);

  const [modifiedParameterDefinition, setModifiedParameterDefinition] =
    useFunctionalState<Template.ParameterDefinition>(parameterDefinition);

  const detailsSectionItems: TemplatesSectionItem[] = useMemo(() => {
    return [
      {
        label: resourceStrings.ParameterName,
        value: modifiedParameterDefinition().name || '',
        type: 'text',
        required: true,
      },
      {
        label: resourceStrings.Type,
        value: modifiedParameterDefinition().type || '',
        type: 'text',
        required: true,
      },
      {
        label: resourceStrings.ParameterDisplayName,
        value: modifiedParameterDefinition().displayName || '',
        type: 'textfield',
        required: true,
        onChange: (value: string) => {
          setModifiedParameterDefinition((prev) => ({
            ...prev,
            displayName: value,
          }));
        },
      },
      {
        label: resourceStrings.DefaultValue,
        value: modifiedParameterDefinition().default || '',
        type: 'textfield',
        required: true,
        onChange: (value: string) => {
          setModifiedParameterDefinition((prev) => ({
            ...prev,
            default: value,
          }));
        },
      },
      {
        label: resourceStrings.Description,
        value: modifiedParameterDefinition().description || '',
        type: 'textarea',
        required: true,
        onChange: (value: string) => {
          setModifiedParameterDefinition((prev) => ({
            ...prev,
            description: value,
          }));
        },
      },
      {
        label: resourceStrings.RequiredField,
        value: modifiedParameterDefinition().required ?? false,
        type: 'switch',
        required: true,
        onChange: (value: boolean) => {
          setModifiedParameterDefinition((prev) => ({
            ...prev,
            required: value,
          }));
        },
      },
    ];
  }, [resourceStrings, modifiedParameterDefinition, setModifiedParameterDefinition]);

  return (
    <div>
      <TemplatesSection title={resourceStrings.Details} titleHtmlFor={'detailsSectionLabel'} items={detailsSectionItems} />
    </div>
  );
};
