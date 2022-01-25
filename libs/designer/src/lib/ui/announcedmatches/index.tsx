import { Announced } from '@fluentui/react/lib/Announced';
import * as React from 'react';

import { useIntl } from 'react-intl';

export interface AnnouncedMatchesProps {
  count: number;
  isLoading?: boolean;
  visible: boolean;
}

export const AnnouncedMatches = ({ count, isLoading = false, visible }: AnnouncedMatchesProps) => {
  const intl = useIntl();
  if (!visible) {
    return null;
  }

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading...',
    description:
      'This is a message shown while loading. This is announced text that is said out loud with screen readers. Not shown in text.',
  });
  const matchesText = intl.formatMessage(
    {
      defaultMessage: '{count, plural, one {# item matched.} =0 {no items matched.} other {# items matched.}}',
      description: 'This is announced text that is said out loud with screen readers. Not shown in text.',
    },
    {
      count,
    }
  );
  const message = isLoading ? loadingText : matchesText;

  return <Announced message={message} />;
};
