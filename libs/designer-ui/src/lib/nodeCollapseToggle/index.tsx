import { TooltipHost, DirectionalHint, Icon, css } from '@fluentui/react';
import { FontSizes } from '@fluentui/theme';
import { useCardKeyboardInteraction } from '../card/hooks';
import { useIntl } from 'react-intl';

interface NodeCollapseToggleProps {
  disabled?: boolean;
  collapsed?: boolean;
  onSmallCard?: boolean;
  handleCollapse?: () => void;
}

const NodeCollapseToggle = (props: NodeCollapseToggleProps) => {
  const { disabled = false, collapsed = false, onSmallCard = false, handleCollapse } = props;

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

  const iconName = collapsed ? 'ChevronDown' : 'ChevronUp';
  const toggleText = collapsed ? EXPAND_TEXT : COLLAPSE_TEXT;

  const keyboardInteraction = useCardKeyboardInteraction(handleCollapse);

  return (
    <TooltipHost content={toggleText} directionalHint={DirectionalHint.rightCenter}>
      <button
        aria-label={toggleText}
        disabled={disabled}
        className={css('msla-collapse-toggle', disabled && 'disabled', onSmallCard && 'small')}
        onClick={handleCollapse}
        onKeyDown={keyboardInteraction.keyDown}
        onKeyUp={keyboardInteraction.keyUp}
      >
        <Icon iconName={iconName} styles={{ root: { fontSize: FontSizes.small } }} />
      </button>
    </TooltipHost>
  );
};

export default NodeCollapseToggle;
