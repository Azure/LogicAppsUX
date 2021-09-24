/* eslint-disable @typescript-eslint/no-unused-vars */
import { ITooltipStyles, ITooltipStyleProps } from '@fluentui/react/lib/Tooltip';

export const TooltipStyles = (props: ITooltipStyleProps): Partial<ITooltipStyles> => {
  return {
    root: {
      maxWidth: '480px',
    },
  };
};
