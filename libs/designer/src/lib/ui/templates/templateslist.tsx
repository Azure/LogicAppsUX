import type { RootState } from '../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { TemplateCard } from './cards/templateCard';
import { TemplatePanel } from '../panel/templatePanel/templatePanel';
import { EmptySearch } from '@microsoft/designer-ui';
import { Text } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { TemplateFilters } from './filters/templateFilters';
import { useEffect } from 'react';
import { setLayerHostSelector } from '@fluentui/react';
import type { TemplatesDesignerProps } from './TemplatesDesigner';

export const TemplatesList = ({ detailFilters, createWorkflowCall }: TemplatesDesignerProps) => {
  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
  const intl = useIntl();

  const { templateName, workflows } = useSelector((state: RootState) => state.template);
  const filteredTemplateNames = useSelector((state: RootState) => state.manifest.filteredTemplateNames);

  const intlText = {
    NO_RESULTS: intl.formatMessage({
      defaultMessage: "Can't find any search results",
      id: 'iCni1C',
      description: 'Accessbility text to indicate no search results found',
    }),
    TRY_DIFFERENT: intl.formatMessage({
      defaultMessage: 'Try a different search term or remove filters',
      id: 'yKNKV/',
      description: 'Accessbility text to indicate to try different search term or remove filters',
    }),
  };

  return (
    <>
      <TemplateFilters detailFilters={detailFilters} />
      <br />

      {filteredTemplateNames && filteredTemplateNames?.length > 0 ? (
        <div className="msla-templates-list">
          {filteredTemplateNames.map((templateName: string) => (
            <TemplateCard key={templateName} templateName={templateName} />
          ))}
        </div>
      ) : (
        <div className="msla-templates-empty-list">
          <EmptySearch />
          <Text size={500} weight="semibold" align="start" className="msla-template-empty-list-title">
            {intlText.NO_RESULTS}
          </Text>
          <Text>{intlText.TRY_DIFFERENT}</Text>
        </div>
      )}

      {templateName === undefined || Object.keys(workflows).length !== 1 ? null : (
        <TemplatePanel showCreate={true} workflowId={Object.keys(workflows)[0]} createWorkflow={createWorkflowCall} />
      )}

      <div
        id={'msla-layer-host'}
        style={{
          position: 'absolute',
          inset: '0px',
          visibility: 'hidden',
        }}
      />
    </>
  );
};
