import { IconButton } from '@fluentui/react/lib/Button';
import { Icon, IIconProps } from '@fluentui/react/lib/Icon';
import { Spinner } from '@fluentui/react/lib/Spinner';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import * as React from 'react';
import { useIntl } from 'react-intl';

import { ShowMode } from './models';

export interface SearchBoxIconProps {
  disabled?: boolean;
  isSearching?: boolean;
  isLoading: boolean;
  showMode?: ShowMode;
  onBackClick?(): void;
}

export const SearchBoxIcon: React.FC<SearchBoxIconProps> = (props) => {
  const { disabled = false, isLoading, showMode, isSearching = false, onBackClick } = props;
  const intl = useIntl();
  const RECOMMENDATION_SEARCH_BUTTON_GO_BACK = intl.formatMessage({
    defaultMessage: 'Go back',
    id: 'orvpWh',
  });

  const BackIconProps: IIconProps = {
    ariaLabel: RECOMMENDATION_SEARCH_BUTTON_GO_BACK,
    iconName: 'Back',
  };
  if (isLoading) {
    return <Spinner className="msla-search-box-icon" role="presentation" />;
  } else if (showMode === ShowMode.Both && !isSearching) {
    return <Icon className="msla-search-box-icon" iconName="Search" role="presentation" />;
  } else {
    return (
      <TooltipHost content={RECOMMENDATION_SEARCH_BUTTON_GO_BACK}>
        <IconButton className="msla-search-box-button" disabled={disabled} iconProps={BackIconProps} onClick={onBackClick} />
      </TooltipHost>
    );
  }
};
