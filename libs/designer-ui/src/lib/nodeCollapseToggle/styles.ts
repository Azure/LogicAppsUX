import { makeStyles, shorthands } from '@fluentui/react-components';
import { nodeButtonInteraction } from '../utils/styles';

export const useNodeCollapseToggleStyles = makeStyles({
  root: {
    background: 'none',
    height: '100%',
    ...shorthands.border('none'),
    color: 'white',
    backgroundColor: 'var(--brand-color, black)',
    ...shorthands.padding('12px', '6px'),
    display: 'flex',
    alignItems: 'flex-start',
    cursor: 'pointer',
    // node-button-interaction mixin
    ...nodeButtonInteraction(),
  },
  small: {
    ...shorthands.padding('8px', '6px'),
  },
  disabled: {
    pointerEvents: 'none',
  },
});
