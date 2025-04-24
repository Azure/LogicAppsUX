/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */

import type { GriffelStyle } from '@fluentui/react-components';

export const nodeButtonInteractionStyle: GriffelStyle = {
  '&:hover': {
    filter: 'invert(1) brightness(1.15) invert(1)',
  },
  '&:focus': {
    outline: '1px solid white',
    outlineOffset: '-3px',
  },
};

export const pillCardStyle: GriffelStyle = {
  position: 'absolute',
  right: '4px',
  top: '-20px',
};
