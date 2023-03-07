import constants from '../constants';
import type { IButtonStyles } from '@fluentui/react';
import { IconButton } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
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
  closeTokenPicker?: () => void;
  setFullScreen: (fullScreen: boolean) => void;
}

export function TokenPickerHeader({ fullScreen, closeTokenPicker, setFullScreen }: TokenPickerHeaderProps) {
  const [editor] = useLexicalComposerContext();
  const intl = useIntl();

  const closeMessage = intl.formatMessage({
    defaultMessage: 'Close',
    description: 'Close token picker',
  });

  const infoMessage = intl.formatMessage({
    defaultMessage: 'Info',
    description: 'Info about token picker',
  });

  const fullScreenMessage = intl.formatMessage({
    defaultMessage: 'Full Screen',
    description: 'Full Screen token picker',
  });
  const fullScreenExitMessage = intl.formatMessage({
    defaultMessage: 'Exit Full Screen',
    description: 'Exit Full Screen token picker',
  });

  const handleCloseTokenPicker = () => {
    editor.focus();
    closeTokenPicker?.();
  };
  return (
    <div className="msla-token-picker-header">
      <div className="msla-token-picker-header-close">
        {closeTokenPicker ? (
          <IconButton
            iconProps={{ iconName: 'Cancel' }}
            title={closeMessage}
            ariaLabel={closeMessage}
            onClick={handleCloseTokenPicker}
            styles={buttonStyles}
          />
        ) : null}
      </div>
      <div className="msla-token-picker-header-expand">
        <IconButton
          iconProps={{ iconName: fullScreen ? 'BackToWindow' : 'FullScreen' }}
          title={fullScreen ? fullScreenExitMessage : fullScreenMessage}
          ariaLabel={fullScreen ? fullScreenExitMessage : fullScreenMessage}
          onClick={() => setFullScreen(!fullScreen)}
          styles={buttonStyles}
        />
      </div>
      <div className="msla-token-picker-header-info">
        <IconButton
          iconProps={{ iconName: 'Info' }}
          title={infoMessage}
          ariaLabel={infoMessage}
          onClick={() => console.log('info')}
          styles={buttonStyles}
        />
      </div>
    </div>
  );
}
