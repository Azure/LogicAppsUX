import { isEnterKey, isSpaceKey } from '../utils';
import { Icon } from '@fluentui/react';
import { MediumText } from '../text';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { Text } from '@fluentui/react-components';

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

  const handleKeyDown: React.KeyboardEventHandler<HTMLElement> = (e) => {
    if (isEnterKey(e) || isSpaceKey(e)) {
      e.stopPropagation();
      onClick?.();
    }
  };

  const title = intl.formatMessage({
    defaultMessage: 'Workflow parameters',
    id: 'y+eYFf',
    description: 'Title for the workflow parameters error card',
  });

  const wfpButtonHint = intl.formatMessage({
    defaultMessage: 'Open panel',
    id: '53MgCQ',
    description: 'Hint for the button on the error card',
  });

  const noNameFallback = intl.formatMessage({
    defaultMessage: 'New parameter',
    id: 'nPgYuI',
    description: "The default to use when a parameter doesn't have a name.",
  });

  const getParameterName = useCallback(
    (parameterId: string) => {
      const name = parameterNames?.[parameterId];
      if (!name || name === '') {
        return noNameFallback;
      }
      return name;
    },
    [noNameFallback, parameterNames]
  );

  return (
    <div key="workflowParametersErrorCard" className="msla-error-card" onClick={handleClick} tabIndex={0} role="list">
      <div className="msla-error-card-header">
        <div className="msla-error-card-icon">
          <Icon iconName="Parameter" />
        </div>
        <Text className="msla-error-card-title">{title}</Text>
        <Text className="msla-error-card-button-hint" onKeyDown={handleKeyDown} tabIndex={0} role="button">
          {wfpButtonHint}
          <Icon iconName="ChevronRight" style={{ marginLeft: '8px' }} />
        </Text>
      </div>
      <div className="msla-error-card-body">
        {Object.entries(errors ?? {}).map(([parameterId, errorValues]) => (
          <div key={parameterId} className="msla-error-card-subsection">
            <Text className="msla-error-card-subtitle">{getParameterName(parameterId)}</Text>
            {Object.values(errorValues)
              .filter((e) => !!e)
              .map((e) => (
                <div key={e}>
                  <div className="msla-error-dot" />
                  <MediumText key={e} text={e ?? ''} />
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
};
