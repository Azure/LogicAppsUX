import { Text, Icon } from '@fluentui/react';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

export interface WorkflowParametersErrorCardProps {
  errors?: Record<string, Record<string, string | undefined>>;
  parameterNames?: Record<string, string>;
  onClick?(): void;
}

export const WorkflowParametersErrorCard: React.FC<WorkflowParametersErrorCardProps> = ({ onClick, parameterNames, errors }) => {
  const intl = useIntl();

  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.();
  };

  const title = intl.formatMessage({
    defaultMessage: 'Workflow Parameters',
    description: 'Title for the workflow parameters error card',
  });

  const wfpButtonHint = intl.formatMessage({
    defaultMessage: 'Open panel',
    description: 'Hint for the button on the error card',
  });

  const noNameFallback = intl.formatMessage({
    defaultMessage: 'New Parameter',
    description: 'Fallback for when a parameter has no name',
  });

  const getParameterName = useCallback(
    (parameterId: string) => {
      const name = parameterNames?.[parameterId];
      if (!name || name === '') return noNameFallback;
      return name;
    },
    [noNameFallback, parameterNames]
  );

  return (
    <div className="msla-error-card" onClick={handleClick}>
      <div className="msla-error-card-header">
        <div className="msla-error-card-icon">
          <Icon iconName="Parameter" />
        </div>
        <span className="msla-error-card-title">{title}</span>
        <span className="msla-error-card-button-hint">
          {wfpButtonHint}
          <Icon iconName="ChevronRight" style={{ marginLeft: '8px' }} />
        </span>
      </div>
      <div className="msla-error-card-body">
        {Object.entries(errors ?? {}).map(([parameterId, errorValues]) => (
          <div key={parameterId} className="msla-error-card-subsection">
            <span className="msla-error-card-subtitle">{getParameterName(parameterId)}</span>
            {Object.values(errorValues)
              .filter((e) => !!e)
              .map((e) => (
                <div key={e}>
                  <div className="msla-error-dot" />
                  <Text key={e} variant="medium">
                    {e}
                  </Text>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
};
