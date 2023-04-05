import type { DynamicTreeExtension } from '@microsoft/parsers-logic-apps';

export interface PickerInfo {
  /**
   * @member {string} [errorMessage]
   */
  errorMessage?: string;

  /**
   * @member {boolean} [failed]
   */
  failed?: boolean;

  /**
   * @member {string[]} [fileFilters]
   */
  fileFilters?: string[];

  /**
   * @member {boolean} [isLoading]
   */
  isLoading?: boolean;

  /**
   * @member {PickerItemInfo[]} pickerItems
   */
  pickerItems: PickerItemInfo[];

  /**
   * @member {any} [pickerProperties]
   */
  pickerProperties?: any;

  /**
   * @member {PickerType} [pickerType]
   */
  pickerType: PickerType;

  /**
   * @member {PickerTitleInfo[]} titleSegments
   */
  titleSegments: PickerTitleInfo[];

  /**
   * @member {TreePicker} [treePicker]
   */
  dynamicTree?: DynamicTreeExtension;

  /**
   * @member {string} type
   */
  type: string;

  /**
   * @member {string} [valuePath]
   */
  valuePath?: string;

  /**
   * @member {ParameterChangeHandler} onFolderNavigated
   */
  onFolderNavigated: ParameterChangeHandler;

  /**
   * @member {ParameterChangeHandler} onShowPicker
   */
  onShowPicker: ParameterChangeHandler;

  /**
   * @member {ParameterChangeHandler} onTitleSelected
   */
  onTitleSelected: ParameterChangeHandler;
}

export interface PickerItemInfo {
  itemKey: string;
  /**
   * @member {any} [nextParams]
   * State required for open api dynamic invocation.
   */
  dynamicState?: any;
  /**
   * @member {string} [fullyQualifiedDisplayName]
   * @example /path/to/file.txt
   * The fully qualified path for tree picker item.
   */
  fullyQualifiedDisplayName?: string;
  type?: string;
  title?: string;
  value?: any;
  mediaType?: string;
}

export enum PickerType {
  NotSpecified,
  Invoke, // The picker dynamic values are gotten using rp invoke endpoint
  SwaggerConstructed, // The dynamic values are gotten directly by constructing the request against the service using swagger
}

export interface PickerTitleInfo {
  titleKey: string;
  isRoot?: boolean;
  title?: string;
  value?: any;
  dynamicState?: any;
}

export interface TreePickerParameter {
  parameterReference: string;
}

export interface TreePickerOperation {
  parameters: Record<string, TreePickerParameter>;
}

export type ParameterChangeHandler = (e: ParameterChangeEvent) => void;

export interface ParameterChangeEvent {
  parameterId: string;
  type: string;
  value?: any;
}
