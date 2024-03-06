import type { AddCustomCodePayload, DeleteCustomCodePayload } from '../../core/state/operation/operationMetadataSlice';

export const CustomCodeOperation = {
  ADD: 'add',
  DELETE: 'delete',
} as const;
export type CustomCodeOperation = (typeof CustomCodeOperation)[keyof typeof CustomCodeOperation];

export type CustomCode =
  | {
      operation: 'add';
      operationProps: AddCustomCodePayload;
    }
  | {
      operation: 'delete';
      operationProps: DeleteCustomCodePayload;
    };
