import { AccessTokenHelper } from './common/accessTokenHelper';
import type {AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse} from 'axios';
import Axios from 'axios'


export interface HttpOptions {
  baseUrl: string;
  getAccessToken(): Promise<string>;
  locale: string;
}
                                                           
export class HttpClient {
    private _axios: AxiosInstance;
    private _locale: string;

    public static createInstance(options: HttpOptions): HttpClient {
        return new HttpClient(options);
    }

    constructor(options: HttpOptions) {
      const accessToken = new AccessTokenHelper(options.getAccessToken);

        this._axios = Axios.create({
          baseURL: options.baseUrl,
          headers: {
            "Authorization": `Bearer ${accessToken})`
          }
        });

        this._axios.interceptors.request.use(
          config => {
            if (config.headers) {
              config.headers['Authorization'] = `Bearer ${accessToken})`}; 
              return config;
            },
            error => {
                return Promise.reject(error);
            }
        );

        this._locale = options.locale;
    }

    public async get<T>(path: string): Promise<T> {
        const response =  await this._axios.get<T>(path);
        console.log(response.headers);
        return response.data;
    }


   }

export interface ResponseData {
    status: number;
    contentLength?: number;
    serviceRequestId?: string;
    /* tslint:disable: no-any */
    responseBodyOnError?: any;
    data?: any;
    /* tslint:enable: no-any */
    hostName?: string;
    apiVersion?: string;
}


