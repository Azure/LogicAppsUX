import type { IButtonStyles, IIconProps } from '@fluentui/react';
import { TooltipHost, IconButton } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { NodeKey } from 'lexical';
import { $getSelection } from 'lexical';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

const dynamicContentIconProps: IIconProps = {
  iconName: 'LightningBolt',
};

const buttonStyles: IButtonStyles = {
  root: {
    color: '#FFF',
    width: '100%',
    height: '24px',
    paddingTop: '8px',
  },
  rootHovered: {
    backgroundColor: 'transparent',
  },
  rootPressed: {
    backgroundColor: 'transparent',
  },
};

interface TokenPickerButtonProps {
  onAddComment: () => void;
}

export const TokenPickerButtonNew = ({ onAddComment }: TokenPickerButtonProps): JSX.Element => {
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
        const { right } = rootElement.getBoundingClientRect();
        const { top } = anchorElement.getBoundingClientRect();
        if (anchorElement?.childNodes[0].nodeName === 'BR') {
          boxElem.style.top = `${top - 15}px`;
        } else {
          boxElem.style.top = `${top - 20}px`;
        }
        boxElem.style.left = `${right - 20}px`;
      }
    }
  }, [anchorKey, editor]);

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
  return (
    <>
      {anchorKey ? (
        <div className="msla-token-picker-entrypoint-button-container" ref={boxRef} onMouseDown={(e) => e.preventDefault()}>
          <TooltipHost content={dynamicContentButtonText}>
            <IconButton
              iconProps={dynamicContentIconProps}
              styles={buttonStyles}
              className="msla-setting-section-row-info-icon"
              onClick={onAddComment}
            />
          </TooltipHost>
          <TooltipHost content={expressionButtonText}>
            <IconButton
              iconProps={dynamicContentIconProps}
              styles={buttonStyles}
              className="msla-setting-section-row-info-icon"
              onClick={onAddComment}
            />
          </TooltipHost>
        </div>
      ) : null}
      <OnChangePlugin onChange={onChange} />
    </>
  );
};
