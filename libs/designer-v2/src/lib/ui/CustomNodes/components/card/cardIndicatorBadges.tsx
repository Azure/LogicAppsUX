import { mergeClasses, Spinner, Tooltip } from '@fluentui/react-components';
import type { FluentIcon } from '@fluentui/react-icons';
import { BeakerFilled, CommentFilled, LockClosedFilled } from '@fluentui/react-icons';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useCardStyles } from './card.styles';

export interface CardIndicatorBadgesProps {
  cardTitle?: string;
  comment?: string;
  isLoadingDynamicData?: boolean;
  isScope?: boolean;
  isSecureInputsOutputs?: boolean;
  nodeIndex?: number;
  staticResultsEnabled?: boolean;
}

interface Indicator {
  key: string;
  label: string;
  content: string;
  Icon?: FluentIcon;
  isSpinner?: boolean;
}

export const CardIndicatorBadges: React.FC<CardIndicatorBadgesProps> = ({
  cardTitle,
  comment,
  isLoadingDynamicData,
  isScope,
  isSecureInputsOutputs,
  nodeIndex,
  staticResultsEnabled,
}) => {
  const styles = useCardStyles();
  const intl = useIntl();

  const strings = useMemo(
    () => ({
      PANEL_STATIC_RESULT_TITLE: intl.formatMessage({
        defaultMessage: 'Testing',
        id: 'm7Y6Qf',
        description: 'Title for a tab panel',
      }),
      MENU_STATIC_RESULT_ICON_TOOLTIP: intl.formatMessage({
        defaultMessage: 'This action has testing configured.',
        id: 'WxcmZr',
        description: "This is a tooltip for the Status results badge shown on a card. It's shown when the baged is hovered over.",
      }),
      COMMENT: intl.formatMessage({
        defaultMessage: 'Description',
        id: 'AlPxuK',
        description: 'This is for a label for a badge, it is used for screen readers and not shown on the screen.',
      }),
      SECURE_INPUTS_OUTPUTS_TITLE: intl.formatMessage({
        defaultMessage: 'Secure inputs or outputs enabled',
        id: 'eGN8Gl',
        description: 'Secure inputs or outputs enabled',
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
        label: strings.LOADING_DYNAMIC_DATA,
        content: strings.LOADING_DYNAMIC_DATA,
        isSpinner: true,
      });
    }

    if (staticResultsEnabled) {
      result.push({
        key: 'static-results',
        label: strings.PANEL_STATIC_RESULT_TITLE,
        content: strings.MENU_STATIC_RESULT_ICON_TOOLTIP,
        Icon: BeakerFilled,
      });
    }

    if (comment) {
      result.push({
        key: 'comment',
        label: strings.COMMENT,
        content: comment,
        Icon: CommentFilled,
      });
    }

    if (isSecureInputsOutputs) {
      result.push({
        key: 'secure-inputs-outputs',
        label: strings.SECURE_INPUTS_OUTPUTS_TITLE,
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
    <div
      className={mergeClasses(styles.indicators, isScope && styles.scopeIndicators)}
      data-testid="card-indicator-badges"
      data-automation-id="card-indicator-badges"
    >
      {indicators.map(({ key, label, content, Icon, isSpinner }) => (
        <Tooltip
          key={key}
          relationship="label"
          withArrow
          content={cardTitle ? `${cardTitle} ${label}: ${content}` : `${label}: ${content}`}
        >
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
