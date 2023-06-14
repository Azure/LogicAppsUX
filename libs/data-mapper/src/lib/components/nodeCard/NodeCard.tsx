import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export interface CardProps {
  onClick?: () => void;
  displayHandle: boolean;
  disabled: boolean;
}

export const getStylesForSharedState = makeStyles({
  root: {
    opacity: 1,
    boxShadow: tokens.shadow4,
    cursor: 'pointer',
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

export const selectedCardStyles = {
  outlineWidth: tokens.strokeWidthThick,
  outlineColor: tokens.colorBrandStroke1,
  outlineStyle: 'solid',
  opacity: 1,
  boxShadow: tokens.shadow4,
};

export const highlightedCardStyles = {
  outlineWidth: tokens.strokeWidthThick,
  outlineColor: tokens.colorBrandStroke2,
  outlineStyle: 'solid',
  opacity: 1,
  boxShadow: tokens.shadow4,
};

export const errorCardStyles = {
  outlineWidth: tokens.strokeWidthThick,
  outlineColor: tokens.colorPaletteRedBackground3,
  outlineStyle: 'solid',
  opacity: 1,
  boxShadow: tokens.shadow4,
};
