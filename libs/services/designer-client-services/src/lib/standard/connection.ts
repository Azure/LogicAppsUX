/* eslint-disable @typescript-eslint/no-empty-function */
import type { Connector } from '../common/models/connector';
import type { HttpOptions} from '@microsoft-logic-apps/designer-tools';
import {HttpClient} from '@microsoft-logic-apps/designer-tools';

interface StandardConnectionServiceArgs {
  apiVersion: string;
  baseUrl: string;
  locale?: string;
}

export class StandardConnectionService {
  private _httpClient: HttpClient;
  private httpOptions: HttpOptions = {
    baseUrl: "",
    locale: "US",
    getAccessToken: this.tempGetToken
  }

  constructor(public readonly options: StandardConnectionServiceArgs) {
    this._httpClient = new HttpClient({...this.httpOptions, baseUrl: options.baseUrl});
  }

  tempGetToken(): Promise<string> { // Danielle for testing purposes
    return new Promise<string>((resolve, reject ) => resolve(
"Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6ImpTMVhvMU9XRGpfNTJ2YndHTmd2UU8yVnpNYyIsImtpZCI6ImpTMVhvMU9XRGpfNTJ2YndHTmd2UU8yVnpNYyJ9.eyJhdWQiOiJodHRwczovL21hbmFnZW1lbnQuY29yZS53aW5kb3dzLm5ldC8iLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC83MmY5ODhiZi04NmYxLTQxYWYtOTFhYi0yZDdjZDAxMWRiNDcvIiwiaWF0IjoxNjQ4NDk5MTI1LCJuYmYiOjE2NDg0OTkxMjUsImV4cCI6MTY0ODUwNDI1OSwiX2NsYWltX25hbWVzIjp7Imdyb3VwcyI6InNyYzEifSwiX2NsYWltX3NvdXJjZXMiOnsic3JjMSI6eyJlbmRwb2ludCI6Imh0dHBzOi8vZ3JhcGgud2luZG93cy5uZXQvNzJmOTg4YmYtODZmMS00MWFmLTkxYWItMmQ3Y2QwMTFkYjQ3L3VzZXJzLzAxMDdlMDRiLTVmNmItNDA1ZC1iOWI3LTUzZjQ4NWU0ZWIyMi9nZXRNZW1iZXJPYmplY3RzIn19LCJhY3IiOiIxIiwiYWlvIjoiQVZRQXEvOFRBQUFBQkpTVldQMnVaREM3dGx6MzYyTnViYlJaOXR3VHJDQW0rNFRSTW12WFRpRmtPTnU1a0d2bjVOUnJNM09FM2NpUHFicVpncWpTSEs2NFpDMXVpYTlwSnF6b1JnQmxUZHdscWprL044R2x1UlE9IiwiYW1yIjpbInJzYSIsIm1mYSJdLCJhcHBpZCI6ImM0NGI0MDgzLTNiYjAtNDljMS1iNDdkLTk3NGU1M2NiZGYzYyIsImFwcGlkYWNyIjoiMiIsImRldmljZWlkIjoiNzQ5YTgyOGItNzJjYS00NmIyLWI3MzQtOWFkN2UwOGE0Y2E2IiwiZmFtaWx5X25hbWUiOiJDb2didXJuIiwiZ2l2ZW5fbmFtZSI6IkRhbmllbGxlIiwiaXBhZGRyIjoiMTMxLjEwNy4xLjE0NiIsIm5hbWUiOiJEYW5pZWxsZSBDb2didXJuIiwib2lkIjoiMDEwN2UwNGItNWY2Yi00MDVkLWI5YjctNTNmNDg1ZTRlYjIyIiwib25wcmVtX3NpZCI6IlMtMS01LTIxLTIxMjc1MjExODQtMTYwNDAxMjkyMC0xODg3OTI3NTI3LTMxMTc4MzQwIiwicHVpZCI6IjEwMDM3RkZFQTk4MEFEREIiLCJyaCI6IjAuQVJvQXY0ajVjdkdHcjBHUnF5MTgwQkhiUjBaSWYza0F1dGRQdWtQYXdmajJNQk1hQUQ0LiIsInNjcCI6InVzZXJfaW1wZXJzb25hdGlvbiIsInN1YiI6InVaeV8xVkJjLUNqdWgzMGY2OG9lUmdZVlRJV01vaXB1UGJvWjVGZ0p5T0EiLCJ0aWQiOiI3MmY5ODhiZi04NmYxLTQxYWYtOTFhYi0yZDdjZDAxMWRiNDciLCJ1bmlxdWVfbmFtZSI6ImRhY29nYnVyQG1pY3Jvc29mdC5jb20iLCJ1cG4iOiJkYWNvZ2J1ckBtaWNyb3NvZnQuY29tIiwidXRpIjoiZVpaVVBMbzNUME9ZaFhtaGZaU1VBQSIsInZlciI6IjEuMCIsInhtc190Y2R0IjoxMjg5MjQxNTQ3fQ.byfDx-BYv6PtqS-ZKIYG0sHcHwkH9lb8g1EYRrXiqZvxrh31TI8MQBZjDgdR58Q3h-UOa2GdIqSQus6GJN6vsCi-r6HmawJh6xVrZ9xGLmhmfOB9rJgc-CzVM0e3RDsbNNIJ0w4FgcQ_EadLFDpVPtfVke-JvYg4vHuq9NzH-hXlPImIaAUTGpEvjNs01qlJDhvRWSBLFN1xkT0Qq-lTSuXCMigutxg3ESkY0fMyh2-M6CDOC38ueHvrsiMUylhMEHBDBCwKMTti6MfJLpB8sNaiD1MfDD9yRwr4-LNHW5CFziRxlTRIH6Xfd1twEM1aNGTwBEuVRiLLzIEgG50F_g"
      ));
  }

  dispose(): void {

  }

  async getConnector(connectorId: string): Promise<Connector> {
    // TODO(psamband): To be implemented
    const { apiVersion, baseUrl } = this.options;
    const url = `${baseUrl}/operationGroups/${connectorId.split('/').slice(-1)[0]}?api-version=${apiVersion}`;
    const response = await this._httpClient.get<Connector>(url);
    return response;
  }

  async getConnectors(): Promise<Connector[]> {
    return [];
  }
}
