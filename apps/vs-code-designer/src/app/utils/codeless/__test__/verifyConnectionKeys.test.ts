import { isKeyExpired } from '../connection';
import { JwtTokenHelper } from '@microsoft/vscode-extension-logic-apps';
import { describe, it, expect } from 'vitest';

describe('isKeyExpired', () => {
  it('should expose the isKeyExpired function'),
    () => {
      expect(isKeyExpired).toBeDefined();
    };
});

describe('isKeyExpired with JWTs', () => {
  const jwtTokenHelper: JwtTokenHelper = JwtTokenHelper.createInstance();
  // expires June 17 2024 17:56:44
  const testConnectionKey =
    'eyJhbGciOiJSzI1NiIsImtpZCI6IjU5NUZDMDdGQTI0RTEyQjdGRUIyMDU2M0FGNkJEMDQ5REU1ODdBMkQiLCJ4NXQiOiJXVl9BZjZKT0VyZi1zZ1ZqcjJ2UVNkNVllaTAiLCJ0eXAiOiJKV1QifQ.eyJ0cyI6IjcyZjk4OGJmLTg2ZjEtNDFhZi05MWFiLTJkN2NkMDExZGI0NyIsImNzIjoibG9naWMtYXBpcy1ub3J0aGNlbnRyYWx1cy9hcm0vYzU3MDBjZjlmYWNmNDMyNzlmODBmN2E5MTE4MDZlMjgiLCJ2IjoiLTkyMjMzNzIwMzY4NTQ3NzU4MDgiLCJlbnZpZCI6IjlkNTFkMWZmYzlmNzc1NzIiLCJhdWQiOiJodHRwczovLzlkNTFkMWZmYzlmNzc1NzIuMDAuY29tbW9uLmxvZ2ljLW5vcnRoY2VudHJhbHVzLmF6dXJlLWFwaWh1Yi5uZXQvYXBpbS9hcm0vYzU3MDBjZjlmYWNmNDMyNzlmODBmN2E5MTE4MDZlMjgiLCJydW50aW1ldXJsIjoiaHR0cHM6Ly85ZDUxZDFmZmM5Zjc3NTcyLjAwLmNvbW1vbi5sb2dpYy1ub3J0aGNlbnRyYWx1cy5henVyZS1hcGlodWIubmV0L2FwaW0vYXJtL2M1NzAwY2Y5ZmFjZjQzMjc5ZjgwZjdhOTExODA2ZTI4IiwibWFuYWdlbWVudCI6Imh0dHBzOi8vbWFuYWdlbWVudC5sb2dpYy1ub3J0aGNlbnRyYWx1cy5henVyZS1hcGlodWIubmV0LyIsIm5iZiI6MTcxODA0MjIwNCwiZXhwIjoxNzE4NjQ3MDA0LCJpYXQiOjE3MTgwNDIyMDQsImlzcyI6Imh0dHBzOi8vbG9naWMtYXBpcy1ub3J0aGNlbnRyYWx1cy5henVyZS1hcGltLm5ldC8ifQ.LTOKYJfBs2SNVwnOvk2HpHecW2oU_rDDwCpiwrr3l9oLfeTsQIM2yZW7XJav35YsbSOGgW2p9cP--u6skFuEEWwEM2oKulh-5PhJ3V_5Bh08w5UeulgrnD7bThkxvo92U5VhOFEg_-v6vpuwDWFAI2KKdiAed1LzpuTZELvYL-h1ijjO5Xnvss5iFHRJ8BEISGIlKTZmKJsvVCTYocPOj2KA8vEzkqI9L2nCUBrsKraNehND-b6MOz5ZiGJ4bd6zQbZRv904CPrwjGWa7fE0GPgr1HsIg-TjfoDDcM7G3S5VwPbYtzOlXVQCh7-PHtH4MuuhXv7fylRpVSVHnnptAQ';

  it('should return false with a JWT expiry later than the test date', () => {
    const testDate: number = Date.UTC(2024, 4); // May 1 2024 00:00:00
    expect(isKeyExpired(jwtTokenHelper, testDate, testConnectionKey, 0)).toBeFalsy();
  });

  it('should return true with a JWT expiry earlier than the test date', () => {
    const testDate: number = Date.UTC(2024, 6); // July 1 2024 00:00:00
    expect(isKeyExpired(jwtTokenHelper, testDate, testConnectionKey, 0)).toBeTruthy();
  });

  it('should return true with the test date within 3 hours before JWT expiry', () => {
    const testDate: number = Date.UTC(2024, 5, 17, 15); // June 17 2024 15:00:00
    expect(isKeyExpired(jwtTokenHelper, testDate, testConnectionKey, 3)).toBeTruthy();
  });

  it('should return false with the test date on the same day as JWT expiry but outside buffer', () => {
    const testDate: number = Date.UTC(2024, 5, 17, 2); // June 17 2024 2:00:00
    expect(isKeyExpired(jwtTokenHelper, testDate, testConnectionKey, 3)).toBeFalsy();
  });
});
