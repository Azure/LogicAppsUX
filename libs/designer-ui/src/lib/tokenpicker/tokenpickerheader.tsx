import constants from '../constants';
import { CLOSE_TOKENPICKER } from '../editor/base/plugins/CloseTokenPicker';
import type { IButtonStyles } from '@fluentui/react';
import { IconButton } from '@fluentui/react';
import copilotLogo from './images/copilotLogo.svg';
import { Button, Tooltip } from '@fluentui/react-components';
import { ChevronLeft24Filled, ChevronLeft24Regular, bundleIcon } from '@fluentui/react-icons';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import type { LexicalEditor } from 'lexical';
import { useIntl } from 'react-intl';
import { TokenPickerMode } from '.';
import { useMemo } from 'react';

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
  isNl2fExpression: boolean;
  setSelectedMode: (value: React.SetStateAction<TokenPickerMode>) => void;
  setFullScreen: (fullScreen: boolean) => void;
  pasteLastUsedExpression?: () => void;
}

export function TokenPickerHeader({
  fullScreen,
  isExpression,
  isNl2fExpression,
  setFullScreen,
  pasteLastUsedExpression,
  setSelectedMode,
}: TokenPickerHeaderProps) {
  let editor: LexicalEditor | null;
  try {
    [editor] = useLexicalComposerContext();
  } catch {
    editor = null;
  }

  const intl = useIntl();
  const intlText = useMemo(() => {
    return {
      closeMessage: intl.formatMessage({
        defaultMessage: 'Close',
        id: 'Zg3IjD',
        description: 'Close token picker',
      }),
      infoMessage: intl.formatMessage({
        defaultMessage: 'Info',
        id: 'gRUmiA',
        description: 'Info about token picker',
      }),
      fullScreenMessage: intl.formatMessage({
        defaultMessage: 'Full Screen',
        id: 'ae7W0a',
        description: 'Full Screen token picker',
      }),
      fullScreenExitMessage: intl.formatMessage({
        defaultMessage: 'Exit full screen',
        id: 'HMiE+4',
        description: "Token picker for 'Exit full screen'",
      }),
      pasteLastUsedExpressionMessage: intl.formatMessage({
        defaultMessage: 'Paste last used expression',
        id: '+ijo/2',
        description: "Token picker for 'Paste last used expression'",
      }),
      createWithNl2fButtonText: intl.formatMessage({
        defaultMessage: 'Create an expression with Copilot',
        id: '+Agiub',
        description: 'Button text for the create expression with copilot feature',
      }),
      previewTag: intl.formatMessage({
        defaultMessage: 'Preview',
        id: 'W2fZ0v',
        description: 'Preview disclaimer tag',
      }),
      returnToExpressionEditor: intl.formatMessage({
        defaultMessage: 'Return to expression editor',
        id: 'MwMpAh',
        description: 'Text of Tooltip to return to expression editor',
      }),
    };
  }, [intl]);

  const isExpressionString = isExpression ? 'expression' : 'token';

  const handleCloseTokenPicker = () => {
    editor?.dispatchCommand(CLOSE_TOKENPICKER, { focusEditorAfter: true });
    LoggerService().log({
      area: 'TokenPickerHeader:handleCloseTokenPicker',
      args: [isExpressionString],
      level: LogEntryLevel.Verbose,
      message: 'Token picker close button clicked.',
    });
  };

  const DismissIcon = bundleIcon(ChevronLeft24Filled, ChevronLeft24Regular);
  const renderNl2fExHeader = (
    <div className="msla-token-picker-nl2f-header">
      <div className="msla-token-picker-nl2f-header-title-container">
        <Tooltip relationship="label" positioning={'before'} content={intlText.returnToExpressionEditor}>
          <Button
            data-testId={'expression-assistant-panel-header-back-button'}
            appearance="subtle"
            icon={<DismissIcon />}
            className={'msla-token-picker-nl2f-header-back'}
            onClick={() => {
              setSelectedMode(TokenPickerMode.EXPRESSION);
            }}
            data-automation-id="msla-token-picker-nl2f-header-back"
          />
        </Tooltip>
        <img src={copilotLogo} alt="Copilot" />
        <div className={'msla-token-picker-nl2f-title'} data-testId={'expression-assistant-panel-header-title'}>
          {intlText.createWithNl2fButtonText}
        </div>
        <div className={'msla-token-picker-nl2f-header-preview-tag'}>{intlText.previewTag}</div>
      </div>
      <div className={'msla-token-picker-nl2f-header-close-icon-container'}>
        <IconButton
          data-testId={'expression-assistant-panel-header-close-button'}
          className="msla-token-picker-nl2f-header-close-icon"
          iconProps={{ iconName: 'Cancel' }}
          title={intlText.closeMessage}
          ariaLabel={intlText.closeMessage}
          onClick={handleCloseTokenPicker}
          styles={buttonStyles}
        />
      </div>
    </div>
  );

  const renderRegularHeader = (
    <div className="msla-token-picker-header">
      <div className="msla-token-picker-header-close" data-automation-id="msla-token-picker-header-close">
        <IconButton
          iconProps={{ iconName: 'Cancel' }}
          title={intlText.closeMessage}
          ariaLabel={intlText.closeMessage}
          onClick={handleCloseTokenPicker}
          styles={buttonStyles}
        />
      </div>
      <div className="msla-token-picker-header-expand" data-automation-id="msla-token-picker-header-expand">
        <IconButton
          iconProps={{ iconName: fullScreen ? 'BackToWindow' : 'FullScreen' }}
          title={fullScreen ? intlText.fullScreenExitMessage : intlText.fullScreenMessage}
          ariaLabel={fullScreen ? intlText.fullScreenExitMessage : intlText.fullScreenMessage}
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
            title={intlText.pasteLastUsedExpressionMessage}
            ariaLabel={intlText.pasteLastUsedExpressionMessage}
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
          title={intlText.infoMessage}
          ariaLabel={intlText.infoMessage}
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

  return isNl2fExpression ? renderNl2fExHeader : renderRegularHeader;
}
