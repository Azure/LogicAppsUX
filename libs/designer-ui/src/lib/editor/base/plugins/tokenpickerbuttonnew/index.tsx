import { TokenPickerMode } from '../../../../tokenpicker';
import type { IIconProps, ICalloutProps } from '@fluentui/react';
import { IconButton, DirectionalHint } from '@fluentui/react';
import { useConst, useId } from '@fluentui/react-hooks';
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

export interface TokenPickerButtonEditorProps {
  showOnLeft?: boolean;
}

interface TokenPickerButtonProps extends TokenPickerButtonEditorProps {
  openTokenPicker: (mode: TokenPickerMode) => void;
}

export const TokenPickerButtonNew = ({ showOnLeft, openTokenPicker }: TokenPickerButtonProps): JSX.Element => {
  const intl = useIntl();
  const [editor] = useLexicalComposerContext();
  const [anchorKey, setAnchorKey] = useState<NodeKey | null>(null);
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
        if (anchorElement?.childNodes[0]?.nodeName === 'BR') {
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

  const dynamicContentButtonText = intl.formatMessage({
    defaultMessage: 'Insert data from previous step',
    description: 'Label for button to open dynamic content token picker',
  });

  const expressionButtonText = intl.formatMessage({
    defaultMessage: 'Insert Expression',
    description: 'Label for button to open expression token picker',
  });
  const topButtonTooltipAnchor = useId('tokenpicker-id');
  const topButtonTooltipAnchor2 = useId('tokenpicker-id');
  const calloutProps = useConst({
    gapSpace: 0,
    // If the tooltip should point to an absolutely-positioned element,
    // you must manually specify the callout target.
    target: `#${topButtonTooltipAnchor}`,
    directionalHint: DirectionalHint.leftCenter,
  });
  const calloutProps2 = useConst<ICalloutProps>({
    gapSpace: 0,
    // If the tooltip should point to an absolutely-positioned element,
    // you must manually specify the callout target.
    target: `#${topButtonTooltipAnchor2}`,
    directionalHint: DirectionalHint.leftCenter,
  });
  return (
    <>
      {anchorKey ? (
        <div
          className="msla-token-picker-entrypoint-button-container"
          ref={boxRef}
          onMouseDown={(e) => e.preventDefault()}
          style={{ boxShadow: Depths.depth4 }}
        >
          <TooltipHost content={dynamicContentButtonText} calloutProps={calloutProps}>
            <IconButton
              id={topButtonTooltipAnchor}
              iconProps={dynamicContentIconProps}
              styles={{ root: 'top-root-button-style' }}
              className="msla-token-picker-entrypoint-button-dynamic-content"
              onClick={() => openTokenPicker(TokenPickerMode.TOKEN)}
            />
          </TooltipHost>
          <TooltipHost content={expressionButtonText} calloutProps={calloutProps2}>
            <IconButton
              id={topButtonTooltipAnchor2}
              iconProps={expressionButtonProps}
              styles={{ root: 'bottom-root-button-style' }}
              className="msla-token-picker-entrypoint-button-dynamic-content"
              onClick={() => openTokenPicker(TokenPickerMode.EXPRESSION)}
            />
          </TooltipHost>
        </div>
      ) : null}
      <OnChangePlugin onChange={onChange} />
    </>
  );
};
