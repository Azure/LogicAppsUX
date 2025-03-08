export const UserAction = {
  click: 'click',
  focus: 'focus',
  drag: 'drag',
  drop: 'drop',
} as const;
export type UserAction = (typeof UserAction)[keyof typeof UserAction];

export interface PageActionTelemetryData {
  controlId: string;
  action: UserAction;
  actionContext?: Record<string, any>;
}
