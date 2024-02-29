import { AssertionErrorCode, AssertionException } from '@microsoft/utils-logic-apps';

export interface UploadCustomCode {
  fileData: string;
  fileName: string;
  fileExtension: string;
}
export interface ICustomCodeService {
  getCustomCodeFile(fileName: string): Promise<string>;
  uploadCustomCode(customCode: UploadCustomCode): Promise<void>;
}

let service: ICustomCodeService;

export const InitCustomCodeService = (customCodeService: ICustomCodeService): void => {
  service = customCodeService;
};

export const CustomCodeService = (): ICustomCodeService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Custom Code Service needs to be initialized before using');
  }

  return service;
};
