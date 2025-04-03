import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useResourceStrings } from '../resources';
import { useMemo } from 'react';
import { useParameterDefinition } from '../../../core/configuretemplate/configuretemplateselectors';

export const CustomizeParameter = ({ parameterId }: { parameterId: string }) => {
  // const intl = useIntl();
  const resourceStrings = useResourceStrings();
  const parameterDefinition = useParameterDefinition(parameterId);

  const detailsSectionItems: TemplatesSectionItem[] = useMemo(() => {
    return [
      {
        label: resourceStrings.ParameterName,
        value: parameterDefinition.name || '',
        type: 'text',
        required: true,
      },
      //TODO: add state type
    ];
  }, [resourceStrings, parameterDefinition]);

  return (
    <div>
      <TemplatesSection title={resourceStrings.Details} titleHtmlFor={'detailsSectionLabel'} items={detailsSectionItems} />
    </div>
  );
};
