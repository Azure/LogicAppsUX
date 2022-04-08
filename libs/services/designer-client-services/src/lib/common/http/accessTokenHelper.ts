import type { JwtPayload } from 'jwt-decode';
import jwtDecode from 'jwt-decode';

export class AccessTokenHelper {
  private _accessToken: string | undefined;
  private _getAccessToken: () => Promise<string>;

  constructor(private _doNotAddBearer = false) {
    this._getAccessToken = () => new Promise<string>((resolve, reject) => resolve(''));
  }

  getAccessToken = async (): Promise<string> => {
    if (this._accessToken && !isTokenExpired(this._accessToken)) return this._accessToken;

    this._accessToken = await this.getNewAccessToken();
    return this._accessToken;
  };

  tempGetAccessToken(): string {
    // Danielle for testing purposes
    return '';
  }

  private async getNewAccessToken(): Promise<string> {
    const accessToken = await this._getAccessToken();
    const newAccessToken = this._doNotAddBearer
      ? accessToken
      : accessToken && accessToken.startsWith('Bearer')
      ? accessToken
      : `Bearer ${accessToken}`;
    return newAccessToken;
  }
}

export function isTokenExpired(accessToken: string): boolean {
  const tokenPayload = jwtDecode<JwtPayload>(accessToken);
  const expiry = tokenPayload.exp;

  if (expiry === undefined) return true;
  return new Date(expiry * 1000) <= new Date();
}
