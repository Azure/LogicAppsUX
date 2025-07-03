import { Link, Text } from '@fluentui/react-components';
import { ArrowLeft16Filled } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

export interface TemplatesPanelHeaderProps {
  title: string;
  onBackClick?: () => void;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
}

export const TemplatesPanelHeader = ({ title, onBackClick, children, rightAction }: TemplatesPanelHeaderProps) => {
  const intl = useIntl();
  return (
    <div className="msla-templates-panel-header">
      <div
        className="msla-templates-panel-header-title-section"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <Text className="msla-templates-panel-header-title" style={{ flex: 1 }}>
              {title}
            </Text>
            {rightAction && <div style={{ flexShrink: 0 }}>{rightAction}</div>}
          </div>
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
      </div>
      {children}
    </div>
  );
};
