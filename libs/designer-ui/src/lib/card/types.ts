export const MenuItemType = {
  Normal: 0,
  Divider: 1,
  Header: 2,
  Advanced: 3,
} as const;
export type MenuItemType = (typeof MenuItemType)[keyof typeof MenuItemType];

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

interface CommentChangeEvent {
  value: string;
}
