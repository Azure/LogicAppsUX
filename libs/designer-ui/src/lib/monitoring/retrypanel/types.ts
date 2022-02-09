export interface RetryHistory {
  clientRequestId: string;
  code: string;
  endTime?: string;
  error?: any;
  serviceRequestId?: string;
  startTime: string;
}
