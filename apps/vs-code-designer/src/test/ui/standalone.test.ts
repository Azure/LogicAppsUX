/// <reference types="mocha" />

import { expect } from 'chai';

describe('Simple Test Suite (No VS Code Required)', function () {
  this.timeout(5000);

  it('should run basic assertion', () => {
    expect(1 + 1).to.equal(2);
    console.log('✓ Basic math test passed');
  });

  it('should test string operations', () => {
    const testString = 'ExTester Demo';
    expect(testString).to.include('ExTester');
    expect(testString.length).to.be.greaterThan(5);
    console.log('✓ String operations test passed');
  });

  it('should test array operations', () => {
    const testArray = [1, 2, 3, 4, 5];
    expect(testArray).to.have.lengthOf(5);
    expect(testArray).to.include(3);
    console.log('✓ Array operations test passed');
  });

  it('should demonstrate async test', async () => {
    const asyncFunction = () => new Promise((resolve) => setTimeout(() => resolve('done'), 100));
    const result = await asyncFunction();
    expect(result).to.equal('done');
    console.log('✓ Async test passed');
  });
});
