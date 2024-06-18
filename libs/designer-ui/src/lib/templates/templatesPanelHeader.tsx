import { Text } from '@fluentui/react-components';

export interface TemplatesPanelHeaderProps {
  title: string;
  description: string;
}

export const TemplatesPanelHeader = ({ title, description }: TemplatesPanelHeaderProps) => {
  return (
    <div className="msla-templates-panel-header">
      <Text className="msla-templates-panel-header-title">{title}</Text>
      <div className="msla-templates-panel-header-description-wrapper">
        <Text className="msla-templates-panel-header-description">{description}</Text>
      </div>
    </div>
  );
};
