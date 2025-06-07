import { shorthands } from '@fluentui/react-components';

/**
 * Utility functions to replace LESS mixins
 */

/**
 * Node button interaction styles (hover and focus states)
 * Replaces .node-button-interaction() mixin
 */
export const nodeButtonInteraction = {
  '&:hover': {
    filter: 'invert(1) brightness(1.15) invert(1)',
  },
  '&:focus': {
    ...shorthands.outline('1px', 'solid', 'white'),
    outlineOffset: '-3px',
  },
};
