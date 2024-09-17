export interface DropdownMenuItem {
  ariaLabel?: string;
  icon?: string | JSX.Element;
  onClick: () => void;
  text: string;
  dataAutomationId?: string;
}
