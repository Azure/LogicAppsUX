import { isTokenExpired } from './accessTokenHelper';

describe('token helpers', () => {
  it('returns true for expired token', () => {
    // example jwt that is expired
    const accessToken =
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2NDc4ODQ5NjcsImV4cCI6MTY0Nzg4NTAwNSwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJSb2xlIjpbIk1hbmFnZXIiLCJQcm9qZWN0IEFkbWluaXN0cmF0b3IiXX0.AXrPP7yyg5hhnuo1U6fy8sZYG22VHoUofKtD9vuUfAQ';
    const isExpired = isTokenExpired(accessToken);
    expect(isExpired).toBeTruthy();
  });

  it('returns false for valid token', () => {
    // example jwt that is not expired
    const accessToken =
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2NDc4ODY2MzIsImV4cCI6MTgzNzI3NTQzMiwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJSb2xlIjpbIk1hbmFnZXIiLCJQcm9qZWN0IEFkbWluaXN0cmF0b3IiXX0.jtDw6LMwEMX89PDQ75eRUKB9uM3egB4v-iXoPbjwiLY';
    const isExpired = isTokenExpired(accessToken);
    expect(isExpired).toBeFalsy();
  });
});
