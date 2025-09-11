import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { MenuItem } from '@fluentui/react-components';
import { bundleIcon, ArrowBetweenDown24Filled, ArrowBetweenDown24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

const AddIcon = bundleIcon(ArrowBetweenDown24Filled, ArrowBetweenDown24Regular);

export interface AddMenuItemProps {
  onClick: (e: unknown) => void;
  isTrigger?: boolean;
  isScope?: boolean;
  showKey?: boolean;
}

export const AddMenuItem = (props: AddMenuItemProps) => {
  const { onClick } = props;

  const intl = useIntl();
  const readOnly = useReadOnly();

  const addDescription = intl.formatMessage({
    defaultMessage: 'Add an action',
    id: 'mCzkXX',
    description: 'Text for button to add a new action',
  });

  return (
    <MenuItem key={addDescription} disabled={readOnly} icon={<AddIcon />} title={addDescription} onClick={onClick}>
      {addDescription}
    </MenuItem>
  );
};
