/**
 * https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2015-08-01-preview/workflowdefinition.json#
 */
import type * as LogicAppsV2 from './logicAppsV2';

export interface ExpressionAction extends LogicAppsV2.Action {
  kind: string;
  inputs: AddSubtractTimeInputs | ConvertTimeZoneInputs | OffsetTimeInputs | CurrentTimeInputs;
}

export type AddSubtractTimeInputs = string | AddSubtractTimeInputsType;

export type ConvertTimeZoneInputs = string | ConvertTimeZoneInputsType;

export type OffsetTimeInputs = string | OffsetTimeInputsType;

export type CurrentTimeInputs = string | Record<string, unknown>;

export interface AddSubtractTimeInputsType {
  baseTime: string;
  interval: number | string;
  timeUnit: string;
}

export interface ConvertTimeZoneInputsType {
  baseTime: string;
  formatString: string;
  sourceTimeZone: string;
  destinationTimeZone: string;
}

export interface OffsetTimeInputsType {
  interval: number | string;
  timeUnit: string;
}
