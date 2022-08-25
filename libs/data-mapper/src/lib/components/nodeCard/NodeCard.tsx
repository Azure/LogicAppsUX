import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export interface CardProps {
  iconName: string;
  onClick?: () => void;
  disabled: boolean;
  error: boolean;
}

export const getStylesForSharedState = makeStyles({
  root: {
    opacity: 1,
    boxShadow: tokens.shadow4,
    cursor: 'pointer',
    paddingInline: '0px',
    paddingLeft: 'none',
    marginLeft: 'none',
    position: 'relative',
    ...shorthands.border('0px'),
    '&:disabled': {
      shadow: tokens.shadow2,
      cursor: 'not-allowed',
    },

    '&:enabled': {
      '&:hover': {
        ...shorthands.border('0px'),
        boxShadow: tokens.shadow8,
        cursor: 'pointer',
      },

      '&:focus': {
        ...shorthands.outline(tokens.strokeWidthThick, 'solid', tokens.colorCompoundBrandStroke),
        cursor: 'pointer',
      },
    },
  },

  error: {
    ...shorthands.outline(tokens.strokeWidthThick, 'solid', tokens.colorPaletteRedBackground3),
    cursor: 'pointer',
  },

  focusIndicator: {
    outlineWidth: '2px',
    outlineColor: tokens.colorBrandStroke1,
  },
});
