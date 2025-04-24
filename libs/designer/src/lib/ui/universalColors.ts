/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */

import { tokens } from '@fluentui/react-components';

export const colors = {
  placeholder: tokens.colorNeutralStrokeAccessible,
  shadow: {
    base: tokens.colorSubtleBackgroundInvertedHover,
    intense: tokens.colorSubtleBackgroundInvertedSelected,
  },
} as const;
