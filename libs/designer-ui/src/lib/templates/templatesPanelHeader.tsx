import { Link, Text } from '@fluentui/react-components';
import { ArrowLeft16Filled } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useStyles } from './templatesPanelHeader.styles';

export interface TemplatesPanelHeaderProps {
  title: string;
  onBackClick?: () => void;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
}

export const TemplatesPanelHeader = ({ title, onBackClick, children, rightAction }: TemplatesPanelHeaderProps) => {
  const intl = useIntl();
  const styles = useStyles();

  return (
    <div className={styles.header}>
      <div className={styles.titleSection}>
        <div className={styles.titleWrapper}>
          <div className={styles.titleRow}>
            <Text className={styles.title}>{title}</Text>
            {rightAction && <div className={styles.rightActionWrapper}>{rightAction}</div>}
          </div>
          {onBackClick && (
            <Link as="button" className={styles.backButton} onClick={onBackClick}>
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
