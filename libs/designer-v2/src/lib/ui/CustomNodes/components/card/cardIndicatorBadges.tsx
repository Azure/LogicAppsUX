import { Spinner, Tooltip } from '@fluentui/react-components';
import type { FluentIcon } from '@fluentui/react-icons';
import { BeakerFilled, CommentFilled, LockClosedFilled } from '@fluentui/react-icons';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useCardStyles } from './card.styles';

export interface CardIndicatorBadgesProps {
  comment?: string;
  isLoadingDynamicData?: boolean;
  isSecureInputsOutputs?: boolean;
  nodeIndex?: number;
  staticResultsEnabled?: boolean;
}

interface Indicator {
  key: string;
  content: string;
  Icon?: FluentIcon;
  isSpinner?: boolean;
}

export const CardIndicatorBadges: React.FC<CardIndicatorBadgesProps> = ({
  comment,
  isLoadingDynamicData,
  isSecureInputsOutputs,
  nodeIndex,
  staticResultsEnabled,
}) => {
  const styles = useCardStyles();
  const intl = useIntl();

  const strings = useMemo(
    () => ({
      MENU_STATIC_RESULT_ICON_TOOLTIP: intl.formatMessage({
        defaultMessage: 'This action has testing configured.',
        id: 'WxcmZr',
        description: "This is a tooltip for the Status results badge shown on a card. It's shown when the baged is hovered over.",
      }),
      SECURE_INPUTS_OUTPUTS_TOOLTIP: intl.formatMessage({
        defaultMessage: 'This operation has secure inputs or outputs enabled.',
        id: 'byRkj+',
        description: 'This operation has secure inputs or outputs enabled.',
      }),
      LOADING_DYNAMIC_DATA: intl.formatMessage({
        defaultMessage: 'Loading dynamic data',
        id: 'qMFpNH',
        description: 'Loading dynamic data',
      }),
    }),
    [intl]
  );

  const indicators = useMemo<Indicator[]>(() => {
    const result: Indicator[] = [];

    if (isLoadingDynamicData) {
      result.push({
        key: 'loading-dynamic-data',
        content: strings.LOADING_DYNAMIC_DATA,
        isSpinner: true,
      });
    }

    if (staticResultsEnabled) {
      result.push({
        key: 'static-results',
        content: strings.MENU_STATIC_RESULT_ICON_TOOLTIP,
        Icon: BeakerFilled,
      });
    }

    if (comment) {
      result.push({
        key: 'comment',
        content: comment,
        Icon: CommentFilled,
      });
    }

    if (isSecureInputsOutputs) {
      result.push({
        key: 'secure-inputs-outputs',
        content: strings.SECURE_INPUTS_OUTPUTS_TOOLTIP,
        Icon: LockClosedFilled,
      });
    }

    return result;
  }, [comment, isLoadingDynamicData, isSecureInputsOutputs, staticResultsEnabled, strings]);

  if (indicators.length === 0) {
    return null;
  }

  return (
    <div className={styles.indicators} data-testid="card-indicator-badges" data-automation-id="card-indicator-badges">
      {indicators.map(({ key, content, Icon, isSpinner }) => (
        <Tooltip key={key} relationship="label" withArrow positioning="below" content={content}>
          <span
            className={styles.indicator}
            data-testid={`card-indicator-${key}`}
            data-automation-id={`card-indicator-${key}`}
            tabIndex={nodeIndex}
          >
            {isSpinner ? <Spinner className={styles.spinner} size="extra-tiny" /> : Icon ? <Icon /> : null}
          </span>
        </Tooltip>
      ))}
    </div>
  );
};
