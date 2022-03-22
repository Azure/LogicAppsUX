import type { JwtPayload } from 'jwt-decode';
import jwtDecode from 'jwt-decode';

export class AccessTokenHelper {
  private _accessToken: string | undefined;

  constructor(private _getAccessToken: () => Promise<string>, private _doNotAddBearer = false) {}

  getAccessToken = async (): Promise<string> => {
    if (!isTokenExpired(this._accessToken)) {
      return this._accessToken!;
    }

    const accessToken = await this._getAccessToken();
    this._accessToken = this._doNotAddBearer
      ? accessToken
      : accessToken && accessToken.startsWith('Bearer')
      ? accessToken
      : `Bearer ${accessToken}`;

    return this._accessToken;
  };
}

export function isTokenExpired(accessToken: string | undefined): boolean {
  if (!accessToken) {
    return true;
  }

  const tokenPayload = jwtDecode<JwtPayload>(accessToken);
  const expiry = tokenPayload.exp;

  if (expiry === undefined) return true;
  return new Date(expiry * 1000) <= new Date();
}
