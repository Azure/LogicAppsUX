/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export type BindingSettingValue = string | boolean | number | undefined;

/**
 * Describes a template used for creating a binding
 */
export interface IBindingTemplate {
  type: string;
  direction: string;
  displayName: string;
  isHttpTrigger: boolean;
  isTimerTrigger: boolean;
  settings: IBindingSetting[];
}

/**
 * Describes a setting used when creating a binding (i.e. 'AuthorizationLevel' for an HttpTrigger or 'Schedule' for a TimerTrigger)
 */
export interface IBindingSetting {
  resourceType: ResourceType | undefined;
  valueType: ValueType | undefined;
  defaultValue: BindingSettingValue;
  required: boolean | undefined;
  enums: IEnumValue[];
  label: string;
  description?: string;
  name: string;
  validateSetting(value: string | undefined): string | undefined;
}

export const ResourceType = {
  DocumentDB: 'DocumentDB',
  Storage: 'Storage',
  EventHub: 'EventHub',
  ServiceBus: 'ServiceBus',
} as const;
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export const ValueType = {
  string: 'string',
  boolean: 'boolean',
  enum: 'enum',
  checkBoxList: 'checkBoxList',
  int: 'int',
} as const;
export type ValueType = (typeof ValueType)[keyof typeof ValueType];

export interface IEnumValue {
  value: string;
  displayName: string;
}
