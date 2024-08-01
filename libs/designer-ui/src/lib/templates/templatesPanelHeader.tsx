import { Text } from '@fluentui/react-components';
import Markdown from 'react-markdown';

export interface TemplatesPanelHeaderProps {
  title: string;
  description: string;
}

export const TemplatesPanelHeader = ({ title, description }: TemplatesPanelHeaderProps) => {
  return (
    <div className="msla-templates-panel-header">
      <Text className="msla-templates-panel-header-title">{title}</Text>
      <Markdown className="msla-templates-panel-header-description" linkTarget="_blank">
        {description}
      </Markdown>
    </div>
  );
};
