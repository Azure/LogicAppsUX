import { getDurationString } from '../utils/utils';

export function calculateDuration(startTime: string, endTime: string | undefined): string {
  return endTime ? getDurationString(Date.parse(endTime) - Date.parse(startTime), /* abbreviated */ false) : getDurationString(NaN);
}
