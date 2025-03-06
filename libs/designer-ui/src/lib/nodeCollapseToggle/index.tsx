import { TooltipHost, DirectionalHint, Icon, css } from '@fluentui/react';
import { FontSizes } from '@fluentui/theme';
import { useCardKeyboardInteraction } from '../card/hooks';
import { useIntl } from 'react-intl';

export interface NodeCollapseToggleProps {
  disabled?: boolean;
  collapsed?: boolean;
  onSmallCard?: boolean;
  handleCollapse?: (includeNested?: boolean) => void;
  tabIndex?: number;
  id: string;
}

const NodeCollapseToggle = (props: NodeCollapseToggleProps) => {
  const { disabled = false, collapsed = false, onSmallCard = false, handleCollapse, tabIndex, id } = props;

  const intl = useIntl();
  const EXPAND_TEXT = intl.formatMessage({
    defaultMessage: 'Expand',
    id: 'ms520e2c5999cc',
    description: 'Expand to make the node bigger and show the contents.',
  });

  const COLLAPSE_TEXT = intl.formatMessage({
    defaultMessage: 'Collapse',
    id: 'msd15ce9d25cd4',
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
        onClick={(e) => handleCollapse?.(e.shiftKey)}
        onKeyDown={keyboardInteraction.keyDown}
        onKeyUp={keyboardInteraction.keyUp}
        tabIndex={disabled ? -1 : tabIndex}
        data-automation-id={`${id}-collapse-toggle`}
      >
        <Icon iconName={iconName} styles={{ root: { fontSize: FontSizes.small } }} />
      </button>
    </TooltipHost>
  );
};

export default NodeCollapseToggle;
