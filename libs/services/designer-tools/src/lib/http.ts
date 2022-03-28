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
    private _tokenHelper: AccessTokenHelper

    public static createInstance(options: HttpOptions): HttpClient {
        return new HttpClient(options);
    }

    constructor(options: HttpOptions) {
      this._tokenHelper = new AccessTokenHelper(options.getAccessToken);

        this._axios = Axios.create({
          baseURL: options.baseUrl,
        });

        this._locale = options.locale;
    }

    public async get<T>(path: string): Promise<T> {
      const token = await this._tokenHelper.getAccessToken();
      this._axios.defaults.headers.common['Authorization'] = token;
        const response =  await this._axios.get<T>(path);
        console.log(response.headers);
        return response.data;
    }


   }
