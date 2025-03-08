import toTitleCase from 'to-title-case';
import constants from '../constants';

export const titleCase = (s: string) => toTitleCase(s);

export const isOpenApiSchemaVersion = (definition: any) => definition?.$schema?.includes('2023-01-31-preview');

export const getSKUDefaultHostOptions = (sku: string) => {
  switch (sku) {
    case constants.SKU.CONSUMPTION:
      return {
        recurrenceInterval: constants.RECURRENCE_OPTIONS.CONSUMPTION,
        maximumWaitingRuns: constants.MAXIMUM_WAITING_RUNS.CONSUMPTION,
      };
    case constants.SKU.STANDARD:
      return { recurrenceInterval: constants.RECURRENCE_OPTIONS.STANDARD, maximumWaitingRuns: constants.MAXIMUM_WAITING_RUNS.DEFAULT };
    default:
      return {};
  }
};
