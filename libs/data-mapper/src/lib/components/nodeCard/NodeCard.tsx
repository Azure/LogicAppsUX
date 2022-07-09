import { DefaultButton } from '@fluentui/react';
import { createFocusOutlineStyle, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
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

    borderInlineColor: 'transparent',
    borderBlockColor: 'transparent',

    paddingLeft: 'none',
    marginLeft: 'none',

    '&:enabled': {
      '&:hover': {
        borderInlineColor: 'transparent',
        borderBlockColor: 'transparent',
        boxShadow: tokens.shadow8,
        cursor: 'pointer',
      },

      '&:focus': {
        borderBlockWidth: tokens.strokeWidthThick,
        borderBlockColor: tokens.colorCompoundBrandStroke,
        borderInlineWidth: tokens.strokeWidthThick,
        borderInlineColor: tokens.colorCompoundBrandStroke,
        cursor: 'pointer',
      },
    },
  },

  error: {
    outlineWidth: tokens.strokeWidthThick,
    outlineColor: tokens.colorPaletteRedBackground3,
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

  return (
    <DefaultButton
      className={`${mergedClasses} ${classes.focusIndicator} ${disabled && classes.disabled}`}
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
