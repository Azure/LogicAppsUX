import type { AddAssertionPayload, UpdateAssertionPayload, updateMockPayload, InitDefintionPayload, UnitTestState, updateMockResultPayload, DeleteAssertionsPayload, UpdateAssertioExpressionPayload } from './unitTestInterfaces';
export interface AddImplicitForeachPayload {
    nodeId: string;
    foreachNodeId: string;
    operation: any;
}
export declare const initialUnitTestState: UnitTestState;
export declare const addAssertion: import("@reduxjs/toolkit").ActionCreatorWithPayload<AddAssertionPayload, "unitTest/addAssertion">, deleteAssertion: import("@reduxjs/toolkit").ActionCreatorWithPayload<DeleteAssertionsPayload, "unitTest/deleteAssertion">, updateAssertion: import("@reduxjs/toolkit").ActionCreatorWithPayload<UpdateAssertionPayload, "unitTest/updateAssertion">, updateAssertionExpression: import("@reduxjs/toolkit").ActionCreatorWithPayload<UpdateAssertioExpressionPayload, "unitTest/updateAssertionExpression">, initUnitTestDefinition: import("@reduxjs/toolkit").ActionCreatorWithPayload<InitDefintionPayload | null, "unitTest/initUnitTestDefinition">, updateMockSuccess: import("@reduxjs/toolkit").ActionCreatorWithPayload<updateMockPayload, "unitTest/updateMockSuccess">, updateMockFailure: import("@reduxjs/toolkit").ActionCreatorWithPayload<updateMockPayload, "unitTest/updateMockFailure">, updateActionResultSuccess: import("@reduxjs/toolkit").ActionCreatorWithPayload<updateMockResultPayload, "unitTest/updateActionResultSuccess">, updateActionResultFailure: import("@reduxjs/toolkit").ActionCreatorWithPayload<updateMockResultPayload, "unitTest/updateActionResultFailure">;
declare const _default: import("@reduxjs/toolkit").Reducer<UnitTestState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
