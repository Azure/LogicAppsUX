import { getDurationString } from '../utils';
import type { RunDisplayItem } from './types';
import type { Run, RunError } from '@microsoft/utils-logic-apps';
import { isObject } from '@microsoft/utils-logic-apps';

export function isRunError(value: any): value is RunError {
  return isObject(value) && isObject(value.error) && typeof value.error.code === 'string' && typeof value.error.message === 'string';
}

export function mapToRunItem({ id, name: identifier, properties }: Run): RunDisplayItem {
  const { endTime, startTime, status } = properties;
  const duration = endTime ? getDurationString(Date.parse(endTime) - Date.parse(startTime), /* abbreviated */ false) : '--';

  return {
    duration,
    id,
    identifier,
    startTime,
    status,
  };
}
