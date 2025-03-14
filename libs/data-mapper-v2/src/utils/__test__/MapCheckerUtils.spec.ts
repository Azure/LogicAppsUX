import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { addFunction, minFunction, greaterThanFunction } from '../../__mocks__/FunctionMock';
import { collectErrorsForMapChecker, functionHasRequiredInputs } from '../MapChecker.Utils';
import { Connection, NodeConnection } from '../../models/Connection';
import { createNewEmptyConnection } from '../Connection.Utils';

describe('MapCheckerUtils', () => {
  describe('functionHasRequiredInputs', () => {
    it('should return true if function has required inputs', () => {
      const fn = minFunction;
      const nodeConnection: NodeConnection = {
        isDefined: true,
        isCustom: false,
        node: fn,
        reactFlowKey: '1',
      };
      const conn: Connection = {
        self: nodeConnection,
        inputs: [nodeConnection, nodeConnection],
        outputs: [],
      };
      const hasRequiredInputs = functionHasRequiredInputs(fn, conn);
      expect(hasRequiredInputs).toBe(true);
    });

    it('should return false if function is missing required inputs', () => {
      const fn = greaterThanFunction;
      const nodeConnection: NodeConnection = {
        isDefined: true,
        isCustom: false,
        node: fn,
        reactFlowKey: '1',
      };
      const conn: Connection = {
        self: nodeConnection,
        inputs: [nodeConnection, createNewEmptyConnection()],
        outputs: [],
      };
      const hasRequiredInputs = functionHasRequiredInputs(fn, conn);
      expect(hasRequiredInputs).toBe(false);
    });

    it('should return true for functions that have unlimited inputs', () => {
      const fn = addFunction;
      const nodeConnection: NodeConnection = {
        isDefined: true,
        isCustom: false,
        node: fn,
        reactFlowKey: '1',
      };
      const conn: Connection = {
        self: nodeConnection,
        inputs: [],
        outputs: [],
      };
      const hasRequiredInputs = functionHasRequiredInputs(fn, conn);
      expect(hasRequiredInputs).toBe(true);
    });
  });

  describe('collectErrorsForMapChecker', () => {
    const fn = minFunction; // min has a required input
    const nodeConnection: NodeConnection = {
      isDefined: true,
      isCustom: false,
      node: fn,
      reactFlowKey: '1',
    };
    const outputConnection: NodeConnection = {
      isDefined: true,
      isCustom: false,
      node: fn,
      reactFlowKey: '1',
    };
    it('should not show error when function has no outputs', () => {
      const functionConn: Connection = {
        self: nodeConnection,
        inputs: [createNewEmptyConnection(), createNewEmptyConnection()],
        outputs: [],
      };
      const errors = collectErrorsForMapChecker({ functionConn });
      expect(errors.length).toEqual(0);
    });

    it('should return error when function has outputs', () => {
      const functionConn: Connection = {
        self: nodeConnection,
        inputs: [createNewEmptyConnection(), createNewEmptyConnection()],
        outputs: [outputConnection],
      };
      const errors = collectErrorsForMapChecker({ functionConn });
      expect(errors.length).toEqual(1);
    });
  });
});
