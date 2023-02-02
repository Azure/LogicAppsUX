export enum ContentType {
  Inputs,
  Outputs,
}

/**
 * The host service.
 */
export interface IHostService {
  fetchAndDisplayContent?(identifier: string, title: string, url: string, type: ContentType): Promise<void>;
}
