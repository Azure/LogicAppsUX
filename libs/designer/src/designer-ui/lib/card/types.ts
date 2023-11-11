export enum MenuItemType {
  Normal = 0,
  Divider = 1,
  Header = 2,
  Advanced = 3,
}

export interface CommentBoxProps {
  brandColor: string;
  comment: string;
  isDismissed: boolean;
  isEditing: boolean;
  isPanelModeEnabled?: boolean;
  styleWidth?: string;
  onCommentChanged?(e: CommentChangeEvent): void;
  onCommentCommitted?(): void;
  onCommentDismissed?(): void;
}

export interface MenuItemOption {
  disabled?: boolean;
  disabledReason?: string;
  iconName?: string;
  iconUri?: string;
  checked?: boolean;
  key: string;
  subMenuItems?: MenuItemOption[]; // Sub-menus are only supported for basic menu items by Fluent UI.
  subtitle?: SubtitleOption;
  title: string;
  type: MenuItemType;
  onClick?(e?: React.SyntheticEvent<HTMLElement>): void;
}

interface CommentChangeEvent {
  value: string;
}

interface SubtitleOption {
  disabled?: boolean;
  iconUri?: string;
  title: string;
}
