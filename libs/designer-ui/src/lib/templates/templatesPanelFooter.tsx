import { Button, Divider, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, MenuButton } from '@fluentui/react-components';
import type { ReactNode } from 'react';

interface TemplateFooterButtonProps {
  type: 'navigation' | 'action';
  text: string | ReactNode;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  appearance?: 'primary' | 'subtle' | 'transparent';
  hide?: boolean;
  icon?: JSX.Element;
  className?: string;
  menuItems?: {
    text: string;
    onClick: () => void;
    disabled?: boolean;
  }[];
}

export interface TemplatePanelFooterProps {
  buttonContents?: TemplateFooterButtonProps[];
}

const templateFooterItemStyle = {
  marginLeft: '8px',
};

export const TemplatesPanelFooter = ({ buttonContents }: TemplatePanelFooterProps) => {
  const navigationButtons = buttonContents?.filter((button) => button.type === 'navigation');
  const actionButtons = buttonContents?.filter((button) => button.type === 'action');
  const showDivider = navigationButtons?.length && actionButtons?.length;
  return (
    <div className="msla-templates-panel-footer">
      {navigationButtons?.map((buttonContent, index) => (
        <FooterButton key={index} style={index < navigationButtons.length ? templateFooterItemStyle : {}} {...buttonContent} />
      ))}
      {showDivider ? (
        <Divider
          vertical={true}
          style={{
            display: 'inline-block',
            height: '100%',
            margin: '0 8px 0 18px',
            verticalAlign: 'sub',
          }}
        />
      ) : null}
      {actionButtons?.map((buttonContent, index) => (
        <FooterButton key={index} style={index < actionButtons.length ? templateFooterItemStyle : {}} {...buttonContent} />
      ))}
    </div>
  );
};

const FooterButton = ({
  key,
  style,
  text,
  onClick,
  disabled,
  appearance,
  hide,
  menuItems,
  icon,
  className,
}: TemplateFooterButtonProps & { key: number; style: any | undefined }) => {
  if (hide) {
    return null;
  }
  if (menuItems && menuItems.length) {
    return (
      <Menu key={key} positioning="below-end">
        <MenuTrigger disableButtonEnhancement>
          <MenuButton style={style} icon={icon} appearance={appearance} disabled={disabled}>
            {text}
          </MenuButton>
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
      key={key}
      icon={icon}
      className={className}
      style={style}
      appearance={appearance}
      onClick={onClick}
      disabled={disabled}
      data-testid={`template-footer-button-${key}`}
      data-automation-id={`template-footer-button-${key}`}
    >
      {text}
    </Button>
  );
};
