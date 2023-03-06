import constants from '../../../../constants';
import { TokenPickerMode } from '../../../../tokenpicker';
import { FxIcon } from './assets/fxIcon';
import type { IButtonStyles, IIconProps } from '@fluentui/react';
import { useTheme, TooltipHost, IconButton } from '@fluentui/react';
import { Button } from '@fluentui/react-components';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { NodeKey } from 'lexical';
import { $getSelection } from 'lexical';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

const dynamicContentIconProps: IIconProps = {
  iconName: 'LightningBolt',
};

const expressionButtonStyles: CSSProperties = {
  minWidth: '32px',
  position: 'relative',
  left: '4px',
};

export interface TokenPickerButtonEditorProps {
  showOnLeft?: boolean;
}

interface TokenPickerButtonProps extends TokenPickerButtonEditorProps {
  openTokenPicker: (mode: TokenPickerMode) => void;
}

export const TokenPickerButtonNew = ({ showOnLeft, openTokenPicker }: TokenPickerButtonProps): JSX.Element => {
  const intl = useIntl();
  const { isInverted } = useTheme();
  const [editor] = useLexicalComposerContext();
  const [anchorKey, setAnchorKey] = useState<NodeKey | null>(null);
  const [showHoveredExpressionButton, setShowHoveredExpressionButton] = useState(false);
  const [showPressedExpressionButton, setShowPressedExpressionButton] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const updateAnchorPoint = useCallback(() => {
    editor.getEditorState().read(() => {
      setAnchorKey($getSelection()?.getNodes()[0]?.__key ?? null);
    });
  }, [editor]);

  useEffect(() => {
    updateAnchorPoint();
  }, [editor, updateAnchorPoint]);

  const onChange = () => {
    updateAnchorPoint();
  };

  const updatePosition = useCallback(() => {
    if (anchorKey) {
      const boxElem = boxRef.current;
      const rootElement = editor.getRootElement();
      const anchorElement = editor.getElementByKey(anchorKey);

      if (boxElem && rootElement && anchorElement) {
        const { right, left } = rootElement.getBoundingClientRect();
        const { top } = anchorElement.getBoundingClientRect();
        if (anchorElement?.childNodes[0].nodeName === 'BR') {
          boxElem.style.top = `${top - 15}px`;
        } else {
          boxElem.style.top = `${top - 20}px`;
        }
        if (showOnLeft) {
          boxElem.style.left = `${left - 40}px`;
        } else {
          boxElem.style.left = `${right - 20}px`;
        }
      }
    }
  }, [anchorKey, editor, showOnLeft]);

  useEffect(() => {
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [editor, updatePosition]);

  useLayoutEffect(() => {
    updatePosition();
  }, [anchorKey, editor, updatePosition]);

  const buttonStyles: IButtonStyles = {
    root: {
      color: isInverted ? constants.INVERTED_TEXT_COLOR : constants.STANDARD_TEXT_COLOR,
      width: '100%',
      height: '24px',
      paddingTop: '8px',
    },
    rootHovered: {
      backgroundColor: 'transparent',
      color: constants.BRAND_COLOR,
    },
    rootPressed: {
      backgroundColor: 'transparent',
      color: constants.BRAND_COLOR_LIGHT,
    },
  };

  const dynamicContentButtonText = intl.formatMessage({
    defaultMessage: 'Insert data from previous step',
    description: 'Label for button to open dynamic content token picker',
  });

  const expressionButtonText = intl.formatMessage({
    defaultMessage: 'Insert Expression',
    description: 'Label for button to open expression token picker',
  });
  return (
    <>
      {anchorKey ? (
        <div className="msla-token-picker-entrypoint-button-container" ref={boxRef} onMouseDown={(e) => e.preventDefault()}>
          <TooltipHost content={dynamicContentButtonText}>
            <IconButton
              iconProps={dynamicContentIconProps}
              styles={buttonStyles}
              className="msla-token-picker-entrypoint-button-dynamic-content"
              onClick={() => openTokenPicker(TokenPickerMode.TOKEN)}
            />
          </TooltipHost>
          <TooltipHost content={expressionButtonText}>
            <Button
              onMouseEnter={() => setShowHoveredExpressionButton(true)}
              onMouseLeave={() => setShowHoveredExpressionButton(false)}
              onMouseDown={() => setShowPressedExpressionButton(true)}
              onMouseUp={() => {
                setShowPressedExpressionButton(false);
                openTokenPicker(TokenPickerMode.EXPRESSION);
              }}
              style={expressionButtonStyles}
            >
              <span className="msla-token-picker-entrypoint-button-expression-icon">
                <FxIcon
                  fill={
                    showHoveredExpressionButton
                      ? showPressedExpressionButton
                        ? constants.BRAND_COLOR_LIGHT
                        : constants.BRAND_COLOR
                      : isInverted
                      ? constants.INVERTED_TEXT_COLOR
                      : constants.STANDARD_TEXT_COLOR
                  }
                />
              </span>
            </Button>
          </TooltipHost>
        </div>
      ) : null}
      <OnChangePlugin onChange={onChange} />
    </>
  );
};
