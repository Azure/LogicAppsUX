import { Announced } from '@fluentui/react';
import { useIntl } from 'react-intl';

export interface AnnouncedMatchesProps {
  count: number;
  isLoading?: boolean;
  visible: boolean;
}

export const AnnouncedMatches: React.FC<AnnouncedMatchesProps> = ({ count, isLoading = false, visible }) => {
  const intl = useIntl();
  if (!visible) {
    return null;
  }

  const message = isLoading
    ? intl.formatMessage({
        defaultMessage: 'Loading...',
        id: 'gwEKLM',
        description: 'This is a message shown while loading. This announced text is read aloud with screen readers. Not shown in text.',
      })
    : intl.formatMessage(
        {
          defaultMessage: '{count, plural, one {# item matched.} =0 {no items matched.} other {# items matched.}}',
          id: 'klY9UN',
          description: 'This announced text is read aloud with screen readers. Not shown in text.',
        },
        {
          count,
        }
      );

  return <Announced message={message} />;
};
