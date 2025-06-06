import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useResourceStrings } from '../resources';
import { useMemo } from 'react';
import { getResourceNameFromId, type Template } from '@microsoft/logic-apps-shared';
import { DescriptionWithLink, ErrorBar } from '../common';
import { useIntl } from 'react-intl';
import { formatNameWithIdentifierToDisplay } from '../../../core/configuretemplate/utils/helper';

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
  const intl = useIntl();

  const detailsSectionItems: TemplatesSectionItem[] = useMemo(() => {
    const baseItems: TemplatesSectionItem[] = [
      {
        label: resourceStrings.ParameterName,
        value: formatNameWithIdentifierToDisplay(parameterDefinition.name) || '',
        type: 'text',
        description: intl.formatMessage({
          defaultMessage: 'The name for the parameter in the underlying JSON definition.',
          id: 'c/g86m',
          description: 'Description for parameter name field',
        }),
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
        description: intl.formatMessage({
          defaultMessage: 'The user-friendly name for the parameter in the Azure portal.',
          id: 'TikQGQ',
          description: 'Description for parameter display name field',
        }),
        hint: intl.formatMessage({
          defaultMessage: 'Parameter display name is required for Save.',
          id: 'RWd2ii',
          description: 'Hint message for parameter display name is required for save.',
        }),
      },
      {
        label: resourceStrings.Type,
        value: parameterDefinition.type || '',
        type: 'text',
        description: intl.formatMessage({
          defaultMessage: 'The type of value expected (e.g., string, boolean, number).',
          id: 'GnY5sj',
          description: 'Description for parameter type field',
        }),
      },
      {
        label: resourceStrings.DefaultValue,
        value: parameterDefinition.default || '',
        type: 'textfield',
        description: intl.formatMessage({
          defaultMessage: `Pre-filled value used if the user doesn't enter anything.`,
          id: 'eXWIo2',
          description: 'Description for parameter default value field',
        }),
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
        description: intl.formatMessage({
          defaultMessage: 'Additional context or help text for the parameter.',
          id: 'LULjJn',
          description: 'Description for parameter description field',
        }),
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
        description: intl.formatMessage({
          defaultMessage: 'Indicates to template users whether the parameter must be filled to proceed',
          id: '/qCaDo',
          description: 'Description for the required field',
        }),
        type: 'switch',
        onChange: (value: boolean) => {
          setParameterDefinition({
            ...parameterDefinition,
            required: value,
          });
        },
      },
    ];
    if (parameterDefinition.associatedWorkflows) {
      baseItems.push({
        label: resourceStrings.AssociatedWorkflows,
        value: formatAssociatedWorklows(parameterDefinition.associatedWorkflows) || '',
        type: 'text',
      });
    }
    return baseItems;
  }, [intl, resourceStrings, parameterDefinition, setParameterDefinition]);

  return (
    <div>
      <DescriptionWithLink
        text={intl.formatMessage({
          defaultMessage: 'Update this parameter to customize how your workflow runs.',
          id: 'apfpL7',
          description: 'The description for the customize parameter panel',
        })}
      />
      {parameterError ? <ErrorBar errorMessage={parameterError} /> : null}
      <TemplatesSection items={detailsSectionItems} />
    </div>
  );
};

const formatAssociatedWorklows = (associatedWorkflows: string[]) => {
  return associatedWorkflows.map((workflow) => getResourceNameFromId(workflow)).join(', ');
};
