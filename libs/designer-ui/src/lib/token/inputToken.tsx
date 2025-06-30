import { TokenType } from '../editor';
import { CLOSE_TOKENPICKER } from '../editor/base/plugins/CloseTokenPicker';
import { DELETE_TOKEN_NODE } from '../editor/base/plugins/DeleteTokenNode';
import { OPEN_TOKEN_PICKER } from '../editor/base/plugins/OpenTokenPicker';
import iconSvg from './icon/icon.svg';
import { makeStyles, shorthands, tokens, mergeClasses } from '@fluentui/react-components';
import { LockClosedRegular } from '@fluentui/react-icons';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import { $getNodeByKey, BLUR_COMMAND, COMMAND_PRIORITY_EDITOR, FOCUS_COMMAND } from 'lexical';
import type { NodeKey } from 'lexical';
import type { TokenNode } from '../editor/base/nodes/tokenNode';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { getBrandColorWithOpacity } from '../card/utils';

const useStyles = makeStyles({
  tokenWrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '20px',
    lineHeight: '20px',
    paddingLeft: '24px', // Space for icon
    paddingRight: '4px',
    marginLeft: '2px',
    marginRight: '2px',
    fontSize: tokens.fontSizeBase200, // 12px
    fontWeight: tokens.fontWeightSemibold, // Make text more bold
    cursor: 'default', // Default cursor for non-clickable tokens
    userSelect: 'none',
    maxWidth: '144px',
    borderRadius: tokens.borderRadiusMedium, // Modern rounded corners
    position: 'relative',
    transition: 'all 0.1s ease', // Smooth transitions
  },
  tokenWrapperClickable: {
    cursor: 'pointer',
    ':hover': {
      transform: 'translateY(-1px)', // Subtle lift on hover
      boxShadow: tokens.shadow4, // Add shadow on hover
    },
  },
  tokenWrapperSelected: {
    ...shorthands.outline('2px', 'solid', tokens.colorBrandStroke1), // Use Fluent UI brand color
    outlineOffset: '1px',
  },
  tokenIcon: {
    position: 'absolute',
    left: '2px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '16px',
    height: '16px',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    borderRadius: tokens.borderRadiusMedium, // Rounded icon
  },
  tokenTitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
    color: tokens.colorNeutralForeground1, // Ensure good contrast
    fontWeight: tokens.fontWeightSemibold, // Bold text for better legibility
    lineHeight: '20px', // Match token height for proper vertical alignment
    display: 'inline-flex',
    alignItems: 'center', // Center text vertically
  },
  deleteButton: {
    fontSize: tokens.fontSizeBase200, // Match token font size for better alignment
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorNeutralForeground1,
    lineHeight: '1',
    paddingTop: '3px', // Bump down 3px for better visual alignment
    paddingBottom: '0px',
    paddingLeft: '2px',
    paddingRight: '2px',
    marginLeft: '4px',
    backgroundColor: 'transparent',
    ...shorthands.border('none'),
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadiusSmall,
    transition: 'all 0.1s ease',
    minWidth: '16px', // Ensure consistent button size
    height: '16px',
    position: 'relative', // Ensure button is clickable
    zIndex: 1,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1Hover,
    },
    ':focus': {
      ...shorthands.outline('2px', 'solid', tokens.colorBrandStroke1),
      outlineOffset: '-2px',
    },
  },
  deleteButtonDark: {
    color: tokens.colorNeutralForegroundInverted,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackgroundInverted,
      color: tokens.colorNeutralForegroundInverted,
    },
  },
  secureIcon: {
    position: 'absolute',
    left: '4px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '12px',
    height: '12px',
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusCircular,
    padding: '1px',
    zIndex: 1, // Ensure it appears above the regular icon
  },
});

export interface InputTokenProps {
  brandColor?: string;
  value?: string;
  disableFiltering?: boolean;
  icon?: string;
  isAdvanced?: boolean;
  isSecure?: boolean;
  readonly?: boolean;
  required?: boolean;
  title: string;
  nodeKey: NodeKey;
  description?: string;
}

export const DELETE = '\u00D7';
export const InputToken: React.FC<InputTokenProps> = ({ value, brandColor, icon, isSecure, readonly, title, nodeKey }) => {
  const [hasFocus, setFocus] = useState(true);
  const intl = useIntl();
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const tokenRef = useRef<null | HTMLDivElement>(null);
  const styles = useStyles();
  const [isClickable, setIsClickable] = useState(false);

  useEffect(() => {
    // Check if token is clickable (FX or AGENTPARAMETER)
    editor.getEditorState().read(() => {
      const node: TokenNode | null = $getNodeByKey(nodeKey);
      const token = node?.['__data']?.token;
      const tokenType = token?.tokenType;

      setIsClickable(!readonly && (tokenType === TokenType.FX || tokenType === TokenType.AGENTPARAMETER));
    });
  }, [editor, nodeKey, readonly]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        FOCUS_COMMAND,
        () => {
          setFocus(true);
          return false;
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          setFocus(false);
          return false;
        },
        COMMAND_PRIORITY_EDITOR
      )
    );
  }, [editor]);

  const handleTokenClicked = (e: React.MouseEvent<HTMLSpanElement, MouseEvent> | React.KeyboardEvent<HTMLSpanElement>) => {
    if (!nodeKey) {
      return;
    }

    editor.getEditorState().read(() => {
      const node: TokenNode | null = $getNodeByKey(nodeKey);
      const token = node?.['__data']?.token;
      const tokenType = token?.tokenType;

      if (!token) {
        return;
      }

      if (!readonly && (tokenType === TokenType.FX || tokenType === TokenType.AGENTPARAMETER)) {
        editor.dispatchCommand(OPEN_TOKEN_PICKER, { token, nodeKey });
        return;
      }

      if (e.shiftKey) {
        setSelected(!isSelected);
      } else {
        clearSelection();
        setSelected(true);
        editor.dispatchCommand(CLOSE_TOKENPICKER, { focusEditorAfter: true });
      }

      editor.focus();
    });
  };

  const tokenStyle = {
    backgroundColor: brandColor ? getBrandColorWithOpacity(brandColor, 0.15) : 'rgba(71, 71, 71, 0.15)',
  };

  const iconStyle = {
    backgroundImage: icon ?? `url(${iconSvg})`,
  };

  const tokenDelete = intl.formatMessage({
    defaultMessage: 'Delete',
    id: 'XqamWZ',
    description: 'Label of Delete Token Button',
  });

  const handleTokenDeleteClicked = () => {
    if (nodeKey) {
      editor.dispatchCommand(DELETE_TOKEN_NODE, nodeKey);
      editor.focus();
    }
  };

  const renderTokenDeleteButton = (): JSX.Element | null => {
    if (readonly) {
      return null;
    }

    // Check if we're in dark mode by looking at the theme
    const isDarkMode = document.documentElement.classList.contains('msla-theme-dark');

    return (
      <button
        type="button"
        title={tokenDelete}
        aria-label={tokenDelete}
        className={mergeClasses(styles.deleteButton, isDarkMode && styles.deleteButtonDark)}
        data-automation-id={`msla-token-delete-${title}`}
        tabIndex={-1} // Remove from tab order
        onClick={(e) => {
          e.stopPropagation();
          handleTokenDeleteClicked();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
      >
        {DELETE}
      </button>
    );
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
      handleTokenClicked(e);
      e.stopPropagation();
    }
  };

  // Prepare accessibility attributes
  const accessibilityProps = isClickable
    ? {
        role: 'button',
        // tabIndex: -1, // Not in tab order but still focusable programmatically
        'aria-label': intl.formatMessage(
          {
            defaultMessage: 'Edit {tokenTitle} expression',
            id: 'oBK3A4',
            description: 'Accessible label for editable expression token',
          },
          { tokenTitle: title }
        ),
        'aria-pressed': isSelected,
      }
    : {
        'aria-label': title,
        tabIndex: -1, // Not in tab order for non-clickable tokens either
      };

  return (
    <span
      className={mergeClasses(
        styles.tokenWrapper,
        isClickable && styles.tokenWrapperClickable,
        isSelected && hasFocus && styles.tokenWrapperSelected
      )}
      data-automation-id={`msla-token msla-input-token-${title}`}
      contentEditable="true"
      onClick={(e) => {
        handleTokenClicked(e);
        e.stopPropagation();
      }}
      onKeyDown={handleKeyDown}
      title={value}
      style={tokenStyle}
      ref={tokenRef}
      {...accessibilityProps}
    >
      <div className={styles.tokenIcon} style={iconStyle} aria-hidden="true" />
      {isSecure && <LockClosedRegular className={styles.secureIcon} aria-hidden="true" />}
      <div className={styles.tokenTitle}>{title}</div>
      {renderTokenDeleteButton()}
    </span>
  );
};
