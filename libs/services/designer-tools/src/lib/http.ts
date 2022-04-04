import { AccessTokenHelper } from './common/accessTokenHelper';
import type { AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse } from 'axios';
import Axios from 'axios';

export interface HttpOptions {
  baseUrl: string;
  locale: string;
  getToken?: () => string;
}

export class HttpClient {
  private _axios: AxiosInstance;

  public static createInstance(options: HttpOptions): HttpClient {
    return new HttpClient(options);
  }

  constructor(options: HttpOptions) {
    const tokenHelper = new AccessTokenHelper();
    const token = (options.getToken && options.getToken()) ?? '';

    this._axios = Axios.create({
      baseURL: options.baseUrl,
      headers: {
        authorization: token,
      },
    });
    this._axios.defaults.headers.common['Authorization'] = token;
  }

  public async get<T>(path: string): Promise<T> {
    const response = await this._axios.get<T>(path);
    return response.data;
  }
}
