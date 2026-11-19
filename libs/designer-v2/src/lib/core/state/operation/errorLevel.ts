export const ErrorLevel = {
  Critical: 0,
  Connection: 1,
  DynamicInputs: 2,
  DynamicOutputs: 3,
  Default: 4,
} as const;

export type ErrorLevel = (typeof ErrorLevel)[keyof typeof ErrorLevel];
