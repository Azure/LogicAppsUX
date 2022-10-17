import constants from '../constants';
import type { ICalloutProps, IIconProps, IPivotStyles, ITooltipHostStyles, IButtonStyles, IStyle } from '@fluentui/react';
import { IconButton, TooltipHost, PivotItem, Pivot, DirectionalHint } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useIntl } from 'react-intl';

const pivotStyles: Partial<IPivotStyles> = {
  text: {
    '&:hover': {
      color: constants.PANEL_HIGHLIGHT_COLOR,
    },
    fontSize: '16px',
    padding: '10px',
  },
  root: {
    padding: '5px',
  },
};

export enum TokenPickerMode {
  TOKEN = 'token',
  EXPRESSION = 'expression',
}

const calloutProps: ICalloutProps = {
  directionalHint: DirectionalHint.topCenter,
};

const hostStyles: Partial<ITooltipHostStyles> = { root: { margin: '2px -18px auto auto' } };

const hideIcon: IIconProps = { iconName: 'DoubleChevronRight' };

const removeStyle: IStyle = {
  border: '0',
  color: 'rgb(0, 120, 212)',
  backgroundColor: 'transparent',
};
const buttonStyles: IButtonStyles = { root: removeStyle, rootHovered: removeStyle, rootPressed: removeStyle };

interface TokenPickerPivotProps {
  selectedKey: string;
  hideExpressions: boolean;
  selectKey: () => void;
  tokenPickerHide?: () => void;
}
export const TokenPickerPivot = ({ selectedKey, hideExpressions, selectKey, tokenPickerHide }: TokenPickerPivotProps): JSX.Element => {
  const intl = useIntl();
  const [editor] = useLexicalComposerContext();
  const tokenMode = intl.formatMessage({
    defaultMessage: 'Dynamic content',
    description: 'Token picker mode to insert dynamic content',
  });
  const expressionMode = intl.formatMessage({
    defaultMessage: 'Expression',
    description: 'Token picker mode to insert expressions',
  });

  const hideTokenPicker = intl.formatMessage({
    defaultMessage: 'Hide Dynamic Content',
    description: 'Hide Token Picker Button',
  });
  return (
    <div style={{ display: 'inherit' }}>
      <Pivot styles={pivotStyles} selectedKey={selectedKey} className="msla-panel-menu" onLinkClick={selectKey} linkSize="large">
        <PivotItem key={TokenPickerMode.TOKEN} itemKey={TokenPickerMode.TOKEN} headerText={tokenMode} />
        {hideExpressions ? null : (
          <PivotItem key={TokenPickerMode.TOKEN} itemKey={TokenPickerMode.EXPRESSION} headerText={expressionMode} />
        )}
      </Pivot>
      {tokenPickerHide ? (
        <TooltipHost calloutProps={calloutProps} content={hideTokenPicker} styles={hostStyles}>
          <IconButton
            styles={buttonStyles}
            iconProps={hideIcon}
            aria-label={hideTokenPicker}
            onClick={() => {
              tokenPickerHide();
              editor.focus();
            }}
          />
          <div className="msla-tokenpicker-beak" />
        </TooltipHost>
      ) : null}
    </div>
  );
};
