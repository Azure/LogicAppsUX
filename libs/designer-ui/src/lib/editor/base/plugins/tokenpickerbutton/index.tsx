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

const singleTokenHeightReduction = 15;

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

export interface hideButtonOptions {
  hideDynamicContent?: boolean;
  hideExpression?: boolean;
}

export interface TokenPickerButtonEditorProps {
  location?: TokenPickerButtonLocation;
  hideButtonOptions?: hideButtonOptions;
  verticalOffSet?: number;
  horizontalOffSet?: number;
  newlineVerticalOffset?: number;
}

interface TokenPickerButtonProps extends TokenPickerButtonEditorProps {
  openTokenPicker: (mode: TokenPickerMode) => void;
}

export const TokenPickerButton = ({
  location = TokenPickerButtonLocation.Left,
  hideButtonOptions,
  verticalOffSet = 20,
  horizontalOffSet = 38,
  newlineVerticalOffset = 15,
  openTokenPicker,
}: TokenPickerButtonProps): JSX.Element => {
  const { hideDynamicContent, hideExpression } = hideButtonOptions ?? {};
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
        const additionalOffset = hideExpression || hideDynamicContent ? singleTokenHeightReduction : 0;
        if (anchorElement?.childNodes[0]?.nodeName === 'BR') {
          boxElem.style.top = `${top - newlineVerticalOffset + additionalOffset}px`;
        } else {
          boxElem.style.top = `${top - verticalOffSet + additionalOffset}px`;
        }

        if (location === TokenPickerButtonLocation.Right) {
          boxElem.style.left = `${right - 20}px`;
        } else {
          boxElem.style.left = `${left - horizontalOffSet}px`;
        }
      }
    }
  }, [anchorKey, editor, hideExpression, hideDynamicContent, location, newlineVerticalOffset, verticalOffSet, horizontalOffSet]);

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
            {!hideDynamicContent ? (
              <IconButton
                iconProps={dynamicContentIconProps}
                styles={{ root: `top-root-button-style ${hideExpression ? 'top-root-button-style-single' : ''}` }}
                className="msla-token-picker-entrypoint-button-dynamic-content"
                data-automation-id="msla-token-picker-entrypoint-button-dynamic-content"
                onClick={() => openTokenPicker(TokenPickerMode.TOKEN)}
              />
            ) : null}
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
