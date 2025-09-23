import { useIntl } from 'react-intl';
import { Button, Tooltip } from '@fluentui/react-components';
import { bundleIcon, ChevronUpFilled, ChevronUpRegular, ChevronDownFilled, ChevronDownRegular } from '@fluentui/react-icons';

const ChevronUp = bundleIcon(ChevronUpFilled, ChevronUpRegular);
const ChevronDown = bundleIcon(ChevronDownFilled, ChevronDownRegular);

export interface CollapseToggleProps {
  id: string;
  tabIndex?: number;
  disabled?: boolean;
  collapsed?: boolean;
  handleCollapse: () => void;
}

export const CollapseToggle = (props: CollapseToggleProps) => {
  const { id, tabIndex, disabled = false, collapsed = false, handleCollapse } = props;
  const intl = useIntl();
  const EXPAND_TEXT = intl.formatMessage({
    defaultMessage: 'Expand',
    id: 'Ug4sWZ',
    description: 'Expand to make the node bigger and show the contents.',
  });

  const COLLAPSE_TEXT = intl.formatMessage({
    defaultMessage: 'Collapse',
    id: '0Vzp0l',
    description: 'Collapse, making the node smaller, hiding the contents',
  });

  const toggleText = collapsed ? EXPAND_TEXT : COLLAPSE_TEXT;

  return (
    <Tooltip content={toggleText} positioning={'after'} withArrow relationship={'description'}>
      <Button
        id={id}
        tabIndex={tabIndex}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleCollapse();
        }}
        icon={collapsed ? <ChevronUp /> : <ChevronDown />}
        size={'small'}
        appearance={'transparent'}
        style={{ color: '#fff' }}
      />
    </Tooltip>
  );
};
