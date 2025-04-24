/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */

import { makeStyles } from '@fluentui/react-components';
import { msColorBodyBackground, msColorBodyText } from './ui-common.themes.styles';

export const useCommonStyles = makeStyles({
  themeDark: {
    backgroundColor: msColorBodyBackground,
    color: msColorBodyText,
  },
});
