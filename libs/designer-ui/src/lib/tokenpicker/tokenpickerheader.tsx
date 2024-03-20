import constants from '../constants';
import type { IButtonStyles } from '@fluentui/react';
import { IconButton } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LogEntryLevel, LoggerService } from '@microsoft/designer-client-services-logic-apps';
import type { LexicalEditor } from 'lexical';
import { useIntl } from 'react-intl';

const buttonStyles: IButtonStyles = {
  root: {
    height: '24px',
  },
  rootHovered: {
    backgroundColor: 'transparent',
  },
  rootPressed: {
    backgroundColor: 'transparent',
    color: constants.BRAND_COLOR_LIGHT,
  },
};

interface TokenPickerHeaderProps {
  fullScreen: boolean;
  isExpression: boolean;
  closeTokenPicker?: () => void;
  setFullScreen: (fullScreen: boolean) => void;
  pasteLastUsedExpression?: () => void;
}

export function TokenPickerHeader({
  fullScreen,
  isExpression,
  closeTokenPicker,
  setFullScreen,
  pasteLastUsedExpression,
}: TokenPickerHeaderProps) {
  let editor: LexicalEditor | null;
  try {
    [editor] = useLexicalComposerContext();
  } catch {
    editor = null;
  }
  const intl = useIntl();

  const closeMessage = intl.formatMessage({
    defaultMessage: 'Close',
    id: 'Zg3IjD',
    description: 'Close token picker',
  });

  const infoMessage = intl.formatMessage({
    defaultMessage: 'Info',
    id: 'gRUmiA',
    description: 'Info about token picker',
  });

  const fullScreenMessage = intl.formatMessage({
    defaultMessage: 'Full Screen',
    id: 'ae7W0a',
    description: 'Full Screen token picker',
  });
  const fullScreenExitMessage = intl.formatMessage({
    defaultMessage: 'Exit full screen',
    id: 'HMiE+4',
    description: "Token picker for 'Exit full screen'",
  });

  const pasteLastUsedExpressionMessage = intl.formatMessage({
    defaultMessage: 'Paste last used expression',
    id: '+ijo/2',
    description: "Token picker for 'Paste last used expression'",
  });

  const isExpressionString = isExpression ? 'expression' : 'token';

  const handleCloseTokenPicker = () => {
    editor?.focus();
    closeTokenPicker?.();
    LoggerService().log({
      area: 'TokenPickerHeader:handleCloseTokenPicker',
      args: [isExpressionString],
      level: LogEntryLevel.Verbose,
      message: 'Token picker close button clicked.',
    });
  };

  return (
    <div className="msla-token-picker-header">
      <div className="msla-token-picker-header-close" data-automation-id="msla-token-picker-header-close">
        <IconButton
          iconProps={{ iconName: 'Cancel' }}
          title={closeMessage}
          ariaLabel={closeMessage}
          onClick={handleCloseTokenPicker}
          styles={buttonStyles}
        />
      </div>
      <div className="msla-token-picker-header-expand" data-automation-id="msla-token-picker-header-expand">
        <IconButton
          iconProps={{ iconName: fullScreen ? 'BackToWindow' : 'FullScreen' }}
          title={fullScreen ? fullScreenExitMessage : fullScreenMessage}
          ariaLabel={fullScreen ? fullScreenExitMessage : fullScreenMessage}
          onClick={() => {
            const newValue = !fullScreen;
            setFullScreen(newValue);
            LoggerService().log({
              area: 'TokenPickerHeader:onIconButtonClick',
              args: ['fullScreen', `${newValue}`, isExpressionString],
              level: LogEntryLevel.Verbose,
              message: `Token picker set to fullscreen=${newValue}.`,
            });
          }}
          styles={buttonStyles}
        />
      </div>
      {isExpression ? (
        <div className="msla-token-picker-header-paste" data-automation-id="msla-token-picker-header-paste">
          <IconButton
            iconProps={{ iconName: 'Paste' }}
            title={pasteLastUsedExpressionMessage}
            ariaLabel={pasteLastUsedExpressionMessage}
            onClick={() => {
              pasteLastUsedExpression?.();
              LoggerService().log({
                area: 'TokenPickerHeader:onIconButtonClick',
                args: ['pasteLastUsed', isExpressionString],
                level: LogEntryLevel.Verbose,
                message: 'Last used expression pasted into expression editor.',
              });
            }}
            styles={buttonStyles}
          />
        </div>
      ) : null}
      <div className="msla-token-picker-header-info" data-automation-id="msla-token-picker-header-info">
        <IconButton
          iconProps={{ iconName: 'Info' }}
          title={infoMessage}
          ariaLabel={infoMessage}
          onClick={() => {
            window.open('https://learn.microsoft.com/en-us/azure/logic-apps/workflow-definition-language-functions-reference', '_blank');
            LoggerService().log({
              area: 'TokenPickerHeader:onIconButtonClick',
              args: ['info', isExpressionString],
              level: LogEntryLevel.Verbose,
              message: 'Token picker button clicked.',
            });
          }}
          styles={buttonStyles}
        />
      </div>
    </div>
  );
}
