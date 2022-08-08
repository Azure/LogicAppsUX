import type { TokenGroup } from './models/token';
import { useBoolean } from '@fluentui/react-hooks';
import { useIntl } from 'react-intl';

interface TokenPickerHeaderProps {
  section: TokenGroup;
}
export const TokenPickerHeader = ({ section }: TokenPickerHeaderProps): JSX.Element => {
  const intl = useIntl();
  const [moreOptions, { toggle: toggleMoreOptions }] = useBoolean(true);

  const buttonTextMore = intl.formatMessage({
    defaultMessage: 'See More',
    description: 'Click to view more token options',
  });

  const buttonTextLess = intl.formatMessage({
    defaultMessage: 'See Less',
    description: 'Click to view less token options',
  });

  const handleMoreLess = () => {
    toggleMoreOptions();
  };
  return (
    <div className="msla-token-picker-section-header">
      <span> {section.label}</span>
      <button className="msla-token-picker-section-header-button" onClick={handleMoreLess}>
        <span> {moreOptions ? buttonTextMore : buttonTextLess}</span>
      </button>
    </div>
  );
};
