import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import type { FunctionComponent, ReactNode } from 'react';
import { useIntl } from 'react-intl';

interface NodeCardProps {
  onClick?: () => void;
  disabled?: boolean;
  childClasses?: any;
  children?: ReactNode;
}

export const useStylesForSharedState = makeStyles({
  root: {
    opacity: 1,
    boxShadow: tokens.shadow4,
    cursor: 'pointer',
    paddingInline: '0px',
    paddingLeft: 'none',
    marginLeft: 'none',
    justifyContent: 'left',
    textAlign: 'left',
    ...shorthands.margin('2px'),
    ...shorthands.border('0px'),

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
    outlineOffset: '-1px',
    cursor: 'pointer',
  },

  disabled: {
    backgroundColor: tokens.colorNeutralBackground1,
    opacity: 0.38,
    shadow: tokens.shadow2,
    cursor: 'not-allowed',
  },

  focusIndicator: {
    outlineWidth: '2px',
    outlineColor: tokens.colorStrokeFocus2,
  },
  //  createFocusOutlineStyle({
  //   selector: 'focus-within',
  //   style: {
  //     outlineWidth: tokens.strokeWidthThick,
  //     outlineColor: tokens.colorStrokeFocus2,
  //   },
  // }),
});

export const NodeCard: FunctionComponent<NodeCardProps> = ({ onClick, childClasses, disabled, children }) => {
  const intl = useIntl();
  const classes = useStylesForSharedState();
  buttonStyles = { ...buttonStyles, ...(childClasses as IButtonStyles) };
  const mergedClasses = mergeClasses(classes.root, childClasses?.root);
  const mergedFocusIndicator = mergeClasses(classes.focusIndicator, childClasses?.focusIndicator);

  const buttonAriaLabel = intl.formatMessage({
    defaultMessage: 'Button for managing toggle state',
    description: 'This is a button for keeping toggle states that share the same border states',
  });

  return (
    <div className={mergedClasses}>
      <button
        aria-label={buttonAriaLabel}
        className={`${mergedClasses} ${mergedFocusIndicator} ${disabled && classes.disabled}`}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    </div>
  );
};
