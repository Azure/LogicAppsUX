import { TokenPickerMode } from '../../../../tokenpicker';
import type { IIconProps } from '@fluentui/react';
import { css, IconButton } from '@fluentui/react';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { Depths } from '@fluentui/theme';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { NodeKey } from 'lexical';
import { $getSelection } from 'lexical';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

const dynamicContentIconProps: IIconProps = {
  iconName: 'LightningBolt',
};

const expressionButtonProps: IIconProps = {
  iconName: 'Variable',
};

export enum TokenPickerButtonLocation {
  Left = 'left',
  Right = 'right',
}

export interface TokenPickerButtonEditorProps {
  location?: TokenPickerButtonLocation;
  insideEditor?: boolean;
  hideExpression?: boolean;
}

interface TokenPickerButtonProps extends TokenPickerButtonEditorProps {
  openTokenPicker: (mode: TokenPickerMode) => void;
}

export const TokenPickerButton = ({
  location = TokenPickerButtonLocation.Left,
  insideEditor,
  openTokenPicker,
  hideExpression = false,
}: TokenPickerButtonProps): JSX.Element => {
  const intl = useIntl();
  const [editor] = useLexicalComposerContext();
  const [anchorKey, setAnchorKey] = useState<NodeKey | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const panel = document.getElementsByClassName('ms-Panel-scrollableContent')[0];

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
        const singleElementTop = hideExpression ? 15 : 0;
        if (anchorElement?.childNodes[0]?.nodeName === 'BR') {
          // some of our editors have smaller heights, so we need to adjust the position of the tokenpicker button
          if (rootElement.clientHeight === 24) {
            boxElem.style.top = `${top - 16 + singleElementTop}px`;
          } else {
            boxElem.style.top = `${top - 15 + singleElementTop}px`;
          }
        } else {
          boxElem.style.top = `${top - 20 + singleElementTop}px`;
        }
        if (location === TokenPickerButtonLocation.Right) {
          boxElem.style.left = `${right - 20}px`;
        } else {
          if (insideEditor) {
            boxElem.style.left = `${left - 33}px`;
          } else {
            boxElem.style.left = `${left - 38}px`;
          }
        }
      }
    }
  }, [anchorKey, editor, insideEditor, location]);

  useEffect(() => {
    window.addEventListener('resize', updatePosition);
    panel?.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      panel?.removeEventListener('scroll', updatePosition);
    };
  }, [editor, updatePosition, panel]);

  useLayoutEffect(() => {
    updatePosition();
  }, [anchorKey, editor, updatePosition]);

  const dynamicContentButtonText = intl.formatMessage({
    defaultMessage: `Enter the data from previous step. You can also add data by typing the '/' character.`,
    description: 'Label for button to open dynamic content token picker',
  });

  const expressionButtonText = intl.formatMessage({
    defaultMessage: 'Insert Expression (You can also add by typing / in the editor)',
    description: 'Label for button to open expression token picker',
  });

  return (
    <>
      {anchorKey ? (
        <div
          className={css('msla-token-picker-entrypoint-button-container')}
          ref={boxRef}
          onMouseDown={(e) => e.preventDefault()}
          style={{ boxShadow: Depths.depth4 }}
        >
          <TooltipHost content={dynamicContentButtonText}>
            <IconButton
              iconProps={dynamicContentIconProps}
              styles={{ root: `top-root-button-style ${hideExpression ? 'top-root-button-style-single' : ''}` }}
              className="msla-token-picker-entrypoint-button-dynamic-content"
              data-automation-id="msla-token-picker-entrypoint-button-dynamic-content"
              onClick={() => openTokenPicker(TokenPickerMode.TOKEN)}
            />
          </TooltipHost>
          {!hideExpression ? (
            <TooltipHost content={expressionButtonText}>
              <IconButton
                iconProps={expressionButtonProps}
                styles={{ root: 'bottom-root-button-style' }}
                className="msla-token-picker-entrypoint-button-dynamic-content"
                data-automation-id="msla-token-picker-entrypoint-button-expression"
                onClick={() => openTokenPicker(TokenPickerMode.EXPRESSION)}
              />
            </TooltipHost>
          ) : null}
        </div>
      ) : null}
      <OnChangePlugin onChange={onChange} />
    </>
  );
};
