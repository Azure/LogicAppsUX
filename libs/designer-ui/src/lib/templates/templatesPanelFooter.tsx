import {
  Button,
  Divider,
  Menu,
  type MenuButtonProps,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  SplitButton,
} from '@fluentui/react-components';
import type { ReactNode } from 'react';

interface TemplateFooterItemProps {
  type: 'button' | 'divider';
}

interface TemplateFooterButtonProps extends TemplateFooterItemProps {
  type: 'button';
  text: string | ReactNode;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  appreance?: 'primary' | 'subtle';
  menuItems?: {
    text: string;
    onClick: () => void;
    disabled?: boolean;
  }[];
}

interface DividerProps extends TemplateFooterItemProps {
  type: 'divider';
}

export interface TemplatePanelFooterProps {
  buttonContents?: (TemplateFooterButtonProps | DividerProps)[];

  primaryButtonText: string | ReactNode;
  primaryButtonOnClick: () => void | Promise<void>;
  primaryButtonDisabled?: boolean;
  showPrimaryButton?: boolean;

  secondaryButtonText: string;
  secondaryButtonOnClick: () => void;
  secondaryButtonDisabled?: boolean;

  thirdButtonText?: string;
  thirdButtonOnClick?: () => void;
  thirdButtonDisabled?: boolean;
}

const templateFooterItemStyle = {
  marginLeft: '8px',
};

export const TemplatesPanelFooter = ({ buttonContents }: TemplatePanelFooterProps) => {
  return (
    <div className="msla-templates-panel-footer">
      {buttonContents?.map((buttonContent, index) => {
        if (buttonContent?.type === 'button') {
          const { text, onClick, disabled, appreance, menuItems } = buttonContent;
          if (menuItems && menuItems.length) {
            return (
              <Menu key={index} positioning="below-end">
                <MenuTrigger disableButtonEnhancement>
                  {(triggerProps: MenuButtonProps) => (
                    <SplitButton
                      style={index < buttonContents.length ? templateFooterItemStyle : {}}
                      menuButton={triggerProps}
                      primaryActionButton={triggerProps}
                      appearance={appreance}
                    >
                      {text}
                    </SplitButton>
                  )}
                </MenuTrigger>

                <MenuPopover>
                  <MenuList>
                    {menuItems.map((item, index) => {
                      const { text, onClick, disabled } = item;
                      return (
                        <MenuItem
                          key={index}
                          onClick={onClick}
                          disabled={disabled}
                          data-testid={`template-footer-menu-item-${index}`}
                          data-automation-id={`template-footer-menu-item-${index}`}
                        >
                          {text}
                        </MenuItem>
                      );
                    })}
                  </MenuList>
                </MenuPopover>
              </Menu>
            );
          }
          return (
            <Button
              key={index}
              style={index < buttonContents.length ? templateFooterItemStyle : {}}
              appearance={appreance}
              onClick={onClick}
              disabled={disabled}
              data-testid={`template-footer-button-${index}`}
              data-automation-id={`template-footer-button-${index}`}
            >
              {text}
            </Button>
          );
        }
        if (buttonContent?.type === 'divider') {
          return (
            <Divider
              key={index}
              vertical={true}
              style={{
                ...(index < buttonContents.length ? templateFooterItemStyle : {}),
                display: 'inline-block',
                height: '100%',
                paddingLeft: '8px',
              }}
            />
          );
        }
        return null;
      })}

      {/* {showPrimaryButton ? (
        <Button
          appearance="primary"
          data-testid={'template-footer-primary-button'}
          data-automation-id={'template-footer-primary-button'}
          onClick={primaryButtonOnClick}
          disabled={primaryButtonDisabled}
        >
          {primaryButtonText}
        </Button>
      ) : null}

      <Button
        onClick={secondaryButtonOnClick}
        style={{
          marginLeft: showPrimaryButton ? '8px' : undefined,
        }}
        disabled={secondaryButtonDisabled}
      >
        {secondaryButtonText}
      </Button>

      {thirdButtonText ? (
        <Divider
          vertical={true}
          style={{
            display: 'inline-block',
            height: '100%',
            paddingLeft: '8px',
          }}
        />
      ) : null}

      {thirdButtonText ? (
        <Button appearance="subtle" disabled={thirdButtonDisabled} onClick={thirdButtonOnClick} style={{ marginLeft: '8px' }}>
          {thirdButtonText}
        </Button>
      ) : null} */}
    </div>
  );
};
