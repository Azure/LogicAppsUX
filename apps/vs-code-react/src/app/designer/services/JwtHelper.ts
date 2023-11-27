export const JwtTokenConstants = {
  audience: 'aud',
  name: 'name',
  upn: 'upn',
  email: 'email',
  expiry: 'exp',
  tenantId: 'tid',
  objectId: 'oid',
  puid: 'puid',
};

interface IDecodedJwtToken {
  header: string;
  jwsPayload: string;
  jwsSig: string;
}

export class JwtTokenHelper {
  public static createInstance(): JwtTokenHelper {
    return new JwtTokenHelper();
  }

  public extractJwtTokenPayload(encodedIdToken: string): Record<string, any> {
    const { jwsPayload: base64IdToken } = this.decodeJwt(encodedIdToken);
    const base64Decoded = this.base64DecodeStringUrlSafe(base64IdToken);
    return JSON.parse(base64Decoded);
  }

  private decodeJwt(encodedJwtToken: string): IDecodedJwtToken {
    const parts = encodedJwtToken.split('.');
    if (parts.length !== 3) {
      throw new Error('The returned token is not parseable');
    }

    return {
      header: parts[0],
      jwsPayload: parts[1],
      jwsSig: parts[2],
    };
  }

  private base64DecodeStringUrlSafe(base64String: string): string {
    let tempString = base64String;
    // html5 should support atob function for decoding
    if (window.atob) {
      // window.atob function decodes base64 string
      // decodeURIComponent + escape function decodes UTF-8 string
      // escape function is being deprecated but is still supported by all browsers
      // https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#Solution_.231_.E2.80.93_escaping_the_string_before_encoding_it
      tempString = base64String.replace(/-/g, '+').replace(/_/g, '/');
      switch (tempString.length % 4) {
        case 0:
          break;
        case 2:
          tempString += '==';
          break;
        case 3:
          tempString += '=';
          break;
        default:
          throw new Error('Malformed base64url string!');
      }
      return decodeURIComponent(window['escape'](window.atob(tempString)));
    }

    throw new Error('atob not supported');
  }
}
