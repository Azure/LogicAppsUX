import { labelCase } from '../stringFunctions';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('lib/helpers/stringFunctions', () => {
  it('should replace _ with spaces', () => {
    expect(labelCase('Test_Test2')).toEqual('Test Test2');
  });

  it('should replace all _ with spaces', () => {
    expect(labelCase('Test_Test2_Test3_Test4')).toEqual('Test Test2 Test3 Test4');
  });
});
