import { AssertionErrorCode, AssertionException } from '../../utils/src';

export interface UploadCustomCodeAppFilePayload {
  fileName: string;
  fileData: string;
}
export interface UploadCustomCodePayload {
  fileData: string;
  fileName: string;
  fileExtension: string;
}

export interface ICustomCodeService {
  uploadCustomCodeAppFile(customCode: UploadCustomCodeAppFilePayload): Promise<void>;
  uploadCustomCode(customCode: UploadCustomCodePayload): Promise<void>;
  deleteCustomCode(fileName: string): Promise<void>;
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
