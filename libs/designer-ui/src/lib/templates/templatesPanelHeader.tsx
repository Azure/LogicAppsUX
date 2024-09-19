import { Label } from '@fluentui/react';
import { Text } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import Markdown from 'react-markdown';

export interface TemplatesPanelHeaderProps {
  title: string;
  description: string;
}

export const TemplatesPanelHeader = ({ title, description }: TemplatesPanelHeaderProps) => {
  const intl = useIntl();
  const intlText = {
    CREATE_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Create a new workflow from template',
      id: 'RZNabt',
      description: 'Panel header title for creating the workflow',
    }),
    BY_MICROSOFT: intl.formatMessage({
      defaultMessage: 'By Microsoft',
      id: 'Xs7Uvt',
      description: 'Panel description for stating it was created by Microsoft',
    }),
  };

  return (
    <div className="msla-templates-panel-header">
      <Text className="msla-templates-panel-header-title">{intlText.CREATE_WORKFLOW}</Text>
      <div>
        <Text className="msla-templates-panel-header-description">{'Template Details'}</Text>
      </div>
      <div>
        <Label>Name</Label>
        <Text className="msla-templates-panel-header-description">{title}</Text>
      </div>
      <div>
        <Label>Description</Label>
        <Markdown className="msla-templates-panel-header-description" linkTarget="_blank">
          {description}
        </Markdown>
      </div>
    </div>
  );
};
