import { Text, Spinner, SpinnerSize, Icon } from '@fluentui/react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

export interface NodeErrorCardProps {
  id: string;
  title: string;
  brandColor: string;
  iconUri?: string;
  isLoading?: boolean;
  onClick?(): void;
  errors?: Record<string, string[]>;
}

export const NodeErrorCard: React.FC<NodeErrorCardProps> = ({ id, title, iconUri, isLoading, onClick, errors }) => {
  const intl = useIntl();

  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.();
  };

  const cardIcon = useMemo(
    () =>
      isLoading ? (
        <Spinner className="msla-card-header-spinner" size={SpinnerSize.medium} />
      ) : iconUri ? (
        <img className="panel-card-icon" src={iconUri} alt="" />
      ) : (
        <Spinner className="msla-card-header-spinner" size={SpinnerSize.medium} />
      ),
    [iconUri, isLoading]
  );

  const buttonHint = intl.formatMessage({
    defaultMessage: 'Open operation',
    description: 'Hint for the button on the error card',
  });

  return (
    <div key={id} className="msla-error-card" onClick={handleClick}>
      <div className="msla-error-card-header">
        {cardIcon}
        <span className="msla-error-card-title">{title}</span>
        <span className="msla-error-card-button-hint">
          {buttonHint}
          <Icon iconName="ChevronRight" style={{ marginLeft: '8px' }} />
        </span>
      </div>
      <div className="msla-error-card-body">
        {Object.entries(errors ?? {}).map(([subtitle, values]) => (
          <ErrorSubsection key={subtitle} subtitle={subtitle} errors={values} />
        ))}
      </div>
    </div>
  );
};

interface ErrorSubsectionProps {
  subtitle: string;
  errors: string[];
}

const ErrorSubsection = (props: ErrorSubsectionProps) => {
  const { subtitle, errors } = props;

  // create new errors array with no empty values
  const filteredErrors = errors?.filter((e: string) => e);
  if (!filteredErrors?.length) return null;

  return (
    <div className="msla-error-card-subsection">
      <span className="msla-error-card-subtitle">{subtitle}</span>
      {errors.map((e: string) => (
        <div key={e}>
          <div className="msla-error-dot" />
          <Text key={e} variant="medium">
            {e}
          </Text>
        </div>
      ))}
    </div>
  );
};
