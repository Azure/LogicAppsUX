export const MessageLevel = {
  Error: 0,
  Warning: 1,
} as const;
export type MessageLevel = (typeof MessageLevel)[keyof typeof MessageLevel];

export type NodeMessage = {
  content: string;

  // Optional details to render below the message
  onRenderDetails?: () => React.ReactNode;
};
