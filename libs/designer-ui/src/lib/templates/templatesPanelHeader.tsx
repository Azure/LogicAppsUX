import { Text } from '@fluentui/react-components';

export interface TemplatesPanelHeaderProps {
  title: string;
  children: React.ReactNode;
}

export const TemplatesPanelHeader = ({ title, children }: TemplatesPanelHeaderProps) => {
  return (
    <div className="msla-templates-panel-header">
      <Text className="msla-templates-panel-header-title">{title}</Text>
      {children}
    </div>
  );
};
