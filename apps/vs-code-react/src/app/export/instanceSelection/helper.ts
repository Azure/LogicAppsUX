import type { IIse, IRegion, ISubscription, IDropDownOption } from '../../../run-service';

/**
 * Parses the subscriptions list and converts it into an array of dropdown options.
 * @param {Array<ISubscription>} subscriptions - List pf subscriptions.
 * @returns {Array<IDropDownOption>} An array of dropdown options.
 */
export const parseSubscriptionsList = (subscriptions: Array<ISubscription>): Array<IDropDownOption> => {
  return subscriptions.map((subscription: ISubscription) => {
    return { key: subscription.subscriptionId, text: subscription.subscriptionName };
  });
};

/**
 * Parses the ISE list and converts it into an array of dropdown options.
 * @param {Array<IIse>} iseList - The array of ISE instances to be parsed.
 * @returns {Array<IDropDownOption>} An array of dropdown options.
 */
export const parseIseList = (iseList: Array<IIse>): Array<IDropDownOption> => {
  return iseList.map((iseInstance: IIse) => {
    return { key: `ise:${iseInstance.id}`, text: iseInstance.iseName, data: iseInstance.location };
  });
};

/**
 * Parses the regions list and converts it into an array of dropdown options.
 * @param {Array<IRegion>} regions - List pf subscriptions.
 * @returns {Array<IDropDownOption>} An array of dropdown options.
 */
export function parseRegionList(regions: Array<IRegion>): Array<IDropDownOption> {
  return regions.map((region: IRegion) => {
    return { key: `region:${region.name}`, text: `${region.displayName}`, data: region.name };
  });
}

/**
 * Returns the placeholder text for a dropdown based on the provided parameters.
 * @param {boolean} isLoading - Indicates whether the dropdown is currently loading.
 * @param {number} itemsLength - The number of items in the dropdown.
 * @param {string} defaultText - The default placeholder text when there are items in the dropdown.
 * @param {string} emptyText - The placeholder text when there are no items in the dropdown.
 * @param {string} loadingText - The placeholder text when the dropdown is loading.
 * @returns {string} The placeholder text for the dropdown.
 */
export const getDropdownPlaceholder = (
  isLoading: boolean,
  itemsLength: number,
  defaultText: string,
  emptyText: string,
  loadingText: string
): string => {
  if (isLoading) {
    return loadingText;
  }
  return itemsLength ? defaultText : emptyText;
};
