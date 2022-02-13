export interface FlyoutSelectedEventArgs {
  key: string;
}

export type FlyoutSelectedEventHandler = (e: FlyoutSelectedEventArgs) => void;
