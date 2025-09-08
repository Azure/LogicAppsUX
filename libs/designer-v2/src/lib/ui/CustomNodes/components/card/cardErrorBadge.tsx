import * as React from 'react';
import { useIntl } from 'react-intl';
import { mergeClasses, Tooltip, Text } from '@fluentui/react-components';
import { useCardStyles } from './card.styles';
import ErrorIcon from './svgs/error.svg';

export const CardErrorBadge = ({ messages }: any) => {
  const styles = useCardStyles();

  const intl = useIntl();

  const errorsText = intl.formatMessage({
    defaultMessage: 'Errors',
    id: 'gBKfs/',
    description: 'Indicates that there are errors with the node',
  });

  const tooltipContent = React.useMemo(() => messages.map((msg: string, index: number) => <Text key={index}>{msg}</Text>), [messages]);

  return (
    <Tooltip relationship={'label'} content={<div className={styles.tooltipContent}>{tooltipContent}</div>} positioning={'after'} withArrow>
      <div className={mergeClasses(styles.badge, styles.badgeFailure)}>
        {messages?.length > 1 ? (
          <Text className={styles.badgeText} aria-label={`${errorsText}: ${messages?.length}`}>
            {messages?.length}
          </Text>
        ) : (
          <img alt={errorsText} src={ErrorIcon} />
        )}
      </div>
    </Tooltip>
  );
};
