import type { RootState } from '../../store';
import type { OutputMock, UnitTestState } from './unitTestInterfaces';
import { type AssertionDefinition } from '@microsoft/logic-apps-shared';
export declare const getUnitTestState: (state: RootState) => UnitTestState;
/**
 * Custom hook that returns an object containing mock results.
 * @returns {Object} An object with key-value pairs representing the mock results.
 */
export declare const useMockResults: () => Record<string, OutputMock>;
/**
 * Custom hook that returns the mock results for a specific operation.
 * @param {string} operationName - The name of the operation.
 * @returns The mock results for the specified operation, or undefined if not found.
 */
export declare const useMocksByOperation: (operationName: string) => OutputMock;
/**
 * Custom hook to check if mock is supported for a given node.
 * @param nodeId - The ID of the node.
 * @param isTrigger - Indicates whether the node is a trigger.
 * @returns A boolean indicating whether mock is supported for the node.
 */
export declare const useIsMockSupported: (nodeId: string, isTrigger: boolean) => boolean;
/**
 * Custom hook that returns the node type for a given node ID.
 * @param {string} nodeId The ID of the node.
 * @returns The node type.
 */
export declare const useNodeType: (nodeId: string) => string;
/**
 * Custom hook that returns the assertions from the unit test state.
 * @returns An object containing the assertions.
 */
export declare const useAssertions: () => Record<string, AssertionDefinition>;
/**
 * Custom hook that returns the validation errors for assertions.
 * @returns An object containing the validation errors for assertions.
 */
export declare const useAssertionsValidationErrors: () => Record<string, Record<string, string | undefined>>;
/**
 * Custom hook that returns the mocks errors for mocks.
 * @returns An object containing the validation errors for mocks.
 */
export declare const useMocksValidationErrors: () => Record<string, Record<string, string | undefined>>;
