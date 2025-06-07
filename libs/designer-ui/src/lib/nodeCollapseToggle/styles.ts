import { makeStyles, shorthands } from '@fluentui/react-components';

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
    '&:hover': {
      filter: 'invert(1) brightness(1.15) invert(1)',
    },
    '&:focus': {
      ...shorthands.outline('1px', 'solid', 'white'),
      outlineOffset: '-3px',
    },
  },
  small: {
    ...shorthands.padding('8px', '6px'),
  },
  disabled: {
    pointerEvents: 'none',
  },
});
