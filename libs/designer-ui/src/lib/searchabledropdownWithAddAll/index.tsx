import { SearchableDropdown } from '../searchabledropdown';
import type { SearchableDropdownProps } from '../searchabledropdown';
import { Stack } from '@fluentui/react';
import { Button, Tooltip } from '@fluentui/react-components';
import type { FC } from 'react';
import { Label } from '../label';
import { useSearchableDropdownWithAddAllStyles } from './searchabledropdownWithAddAll.styles';

export interface SearchableDropdownWithAddAllProps extends SearchableDropdownProps {
  addAllButtonText?: string;
  addAllButtonTooltip?: string;
  addAllButtonEnabled?: boolean;
  removeAllButtonText?: string;
  removeAllButtonTooltip?: string;
  removeAllButtonEnabled?: boolean;
  label?: string;
  onShowAllClick?: () => void;
  onHideAllClick?: () => void;
}

export const SearchableDropdownWithAddAll: FC<SearchableDropdownWithAddAllProps> = ({
  addAllButtonTooltip,
  addAllButtonText,
  addAllButtonEnabled,
  removeAllButtonTooltip,
  removeAllButtonText,
  removeAllButtonEnabled,
  label,
  onShowAllClick,
  onHideAllClick,
  ...searchableDropdownProps
}): JSX.Element => {
  const styles = useSearchableDropdownWithAddAllStyles();
  const handleShowAll = () => onShowAllClick?.();
  const handleRemoveAll = () => onHideAllClick?.();

  const renderButton = (handler: () => void, text?: string, tooltip?: string, enabled?: boolean, dataAutomationId?: string) => {
    return text ? (
      <Tooltip relationship={'label'} content={tooltip ?? ''} withArrow>
        <Button size={'small'} appearance={'outline'} onClick={handler} disabled={enabled} data-automation-id={dataAutomationId}>
          {text}
        </Button>
      </Tooltip>
    ) : null;
  };

  const labelId = label ? `dropdown-label-${label.replace(' ', '-').toLowerCase()}` : undefined;

  return (
    <>
      {label && <Label id={labelId} className={styles.searchableDropdownLabel} text={label} />}
      <Stack horizontal tokens={{ childrenGap: '8px' }}>
        <SearchableDropdown {...searchableDropdownProps} labelId={labelId} className={styles.searchableDropdownWithButtons} />
        {renderButton(handleShowAll, addAllButtonText, addAllButtonTooltip, !(addAllButtonEnabled ?? true), 'msla-add-all-button')}
        {renderButton(
          handleRemoveAll,
          removeAllButtonText,
          removeAllButtonTooltip,
          !(removeAllButtonEnabled ?? true),
          'msla-remove-all-button'
        )}
      </Stack>
    </>
  );
};
