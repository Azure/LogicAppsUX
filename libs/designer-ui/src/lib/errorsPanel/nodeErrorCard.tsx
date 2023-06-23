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
  inputErrors?: string[];
  settingsErrors?: string[];
  otherErrors?: string[];
}

export const NodeErrorCard: React.FC<NodeErrorCardProps> = ({
  id,
  title,
  iconUri,
  isLoading,
  onClick,
  inputErrors,
  settingsErrors,
  otherErrors,
}) => {
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

  const inputErrorsSubtitle = intl.formatMessage({
    defaultMessage: 'Input Errors',
    description: 'Subtitle for the input errors section',
  });

  const settingsErrorsSubtitle = intl.formatMessage({
    defaultMessage: 'Settings Errors',
    description: 'Subtitle for the settings errors section',
  });

  const otherErrorsSubtitle = intl.formatMessage({
    defaultMessage: 'Other Errors',
    description: 'Subtitle for the other errors section',
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
        <ErrorSubsection subtitle={inputErrorsSubtitle} errors={inputErrors} />
        <ErrorSubsection subtitle={settingsErrorsSubtitle} errors={settingsErrors} />
        <ErrorSubsection subtitle={otherErrorsSubtitle} errors={otherErrors} />
      </div>
    </div>
  );
};

const ErrorSubsection = (props: any) => {
  const { subtitle, errors } = props;

  if (!errors?.length) return null;

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
