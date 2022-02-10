import {
  css,
  DirectionalHint,
  getTheme,
  ICalloutProps,
  ITheme,
  registerOnThemeChangeCallback,
  removeOnThemeChangeCallback,
  TooltipHost,
} from '@fluentui/react';
import { useEffect, useState } from 'react';
import { Plus } from './images/plus';

export interface ActionButtonV2Props {
  buttonRef?: React.RefObject<HTMLButtonElement>;
  className?: string;
  disabled?: boolean;
  title: string;
  onClick?(e: React.MouseEvent<HTMLElement>): void;
}

const calloutProps: ICalloutProps = {
  directionalHint: DirectionalHint.topCenter,
};

export const ActionButtonV2: React.FC<ActionButtonV2Props> = ({ buttonRef, className, disabled = false, title, onClick }) => {
  const handleThemeChange = (theme: ITheme): void => {
    setIsInverted(theme.isInverted);
  };

  const [isInverted, setIsInverted] = useState(() => getTheme().isInverted);

  useEffect(() => {
    registerOnThemeChangeCallback(handleThemeChange);
    return () => {
      removeOnThemeChangeCallback(handleThemeChange);
    };
  }, []);

  return (
    <TooltipHost calloutProps={calloutProps} content={title}>
      <button aria-label={title} className={css('msla-action-button-v2', className)} disabled={disabled} ref={buttonRef} onClick={onClick}>
        <Plus fill={isInverted ? '#3AA0F3' : '#0078D4'} />
      </button>
    </TooltipHost>
  );
};
