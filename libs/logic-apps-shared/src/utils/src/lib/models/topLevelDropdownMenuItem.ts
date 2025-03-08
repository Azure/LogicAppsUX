import type { DropdownMenuItem } from './dropdownMenuItem';
import type { DropdownMenuOption } from './dropdownMenuOption';

export interface TopLevelDropdownMenuItem extends DropdownMenuItem {
  priority?: number;
  subMenuItems?: DropdownMenuOption[];
}
