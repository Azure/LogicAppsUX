import { DefaultButton } from '@fluentui/react';
import { createFocusOutlineStyle, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import type { FunctionComponent } from 'react';

interface NodeCardProps {
  onClick?: () => void;
  disabled?: boolean;
  childClasses?: any;
}

const useStyles = makeStyles({
  root: {
    opacity: 1,
    boxShadow: tokens.shadow4,
    cursor: 'pointer',
    paddingInline: '0px',

    ...shorthands.border('0px'),

    paddingLeft: 'none',
    marginLeft: 'none',

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

  disabled: {
    backgroundColor: tokens.colorNeutralBackgroundDisabled,
    opacity: 0.38,
    shadow: tokens.shadow2,
    cursor: 'not-allowed',
  },

  focusIndicator: createFocusOutlineStyle({
    selector: 'focus-within',
    style: {
      outlineWidth: tokens.strokeWidthThick,
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: '0px',
    },
  }),
});

export const NodeCard: FunctionComponent<NodeCardProps> = ({ onClick, childClasses, disabled, children }) => {
  const classes = useStyles();
  const mergedClasses = mergeClasses(classes.root, childClasses?.root);
  const mergedFocusIndicator = mergeClasses(classes.focusIndicator, childClasses?.focusIndicator);

  return (
    <DefaultButton
      className={`${mergedClasses} ${mergedFocusIndicator} ${disabled && classes.disabled}`}
      toggle
      checked={true}
      onClick={onClick ?? undefined}
      allowDisabledFocus
      disabled={disabled}
    >
      {children}
    </DefaultButton>
  );
};
