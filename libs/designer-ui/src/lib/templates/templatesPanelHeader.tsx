import { Link, Text } from '@fluentui/react-components';
import { ArrowLeft16Filled } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

export interface TemplatesPanelHeaderProps {
  title: string;
  onBackClick?: () => void;
  children: React.ReactNode;
}

export const TemplatesPanelHeader = ({ title, onBackClick, children }: TemplatesPanelHeaderProps) => {
  const intl = useIntl();
  return (
    <div className="msla-templates-panel-header">
      <div className="msla-templates-panel-header-title-section">
        <Text className="msla-templates-panel-header-title">{title}</Text>
        {onBackClick && (
          <Link as="button" className="msla-templates-panel-header-back-button" onClick={onBackClick}>
            <ArrowLeft16Filled />
            {intl.formatMessage({
              defaultMessage: 'Back to template library',
              id: '7adnmH',
              description: 'Button to navigate back to the template library',
            })}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
};
