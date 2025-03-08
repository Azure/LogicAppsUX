export interface FilePickerBreadcrumb {
  key: string;
  onSelect?: () => void;
  text: string;
}

export const PickerItemType = {
  FOLDER: 'folder',
  FILE: 'file',
} as const;
export type PickerItemType = (typeof PickerItemType)[keyof typeof PickerItemType];
