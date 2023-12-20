import type { AddAssertionPayload, AddMockResultPayload, InitDefintionPayload, UnitTestState } from './unitTestInterfaces';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface AddImplicitForeachPayload {
  nodeId: string;
  foreachNodeId: string;
  operation: any;
}

export const initialUnitTestState: UnitTestState = {
  mockResults: {},
  assertions: {},
};

// export const validateParameter = (
//   id: string,
//   data: { name?: string; type?: string; value?: string; defaultValue?: string },
//   keyToValidate: string,
//   required = true
// ): string | undefined => {
//   const intl = getIntl();

//   switch (keyToValidate?.toLowerCase()) {
//     case 'name':
//       const { name } = data;
//       if (!name) {
//         return intl.formatMessage({
//           defaultMessage: 'Must provide the assertion name.',
//           description: 'Error message when the assertion name is empty.',
//         });
//       }

//       const duplicateParameters = Object.keys(allDefinitions).filter(
//         (parameterId) => parameterId !== id && equals(allDefinitions[parameterId].name, name)
//       );

//       return duplicateParameters.length > 0
//         ? intl.formatMessage({
//             defaultMessage: 'Parameter name already exists.',
//             description: 'Error message when the workflow parameter name already exists.',
//           })
//         : undefined;
//       const valueToValidate = equals(keyToValidate, 'value') ? data.value : data.defaultValue;
//       const { type } = data;
//       if (valueToValidate === '' || valueToValidate === undefined) {
//         if (!required) return undefined;
//         return intl.formatMessage({
//           defaultMessage: 'Must provide value for parameter.',
//           description: 'Error message when the workflow parameter value is empty.',
//         });
//       }

//       const swaggerType = convertWorkflowParameterTypeToSwaggerType(type);
//       let error = validateType(swaggerType, /* parameterFormat */ '', valueToValidate);

//       if (error) return error;

//       switch (swaggerType) {
//         case Constants.SWAGGER.TYPE.ARRAY:
//           // eslint-disable-next-line no-case-declarations
//           let isInvalid = false;
//           try {
//             isInvalid = !Array.isArray(JSON.parse(valueToValidate));
//           } catch {
//             isInvalid = true;
//           }

//           error = isInvalid
//             ? intl.formatMessage({ defaultMessage: 'Enter a valid array.', description: 'Error validation message' })
//             : undefined;
//           break;

//         case Constants.SWAGGER.TYPE.OBJECT:
//         case Constants.SWAGGER.TYPE.BOOLEAN:
//           try {
//             JSON.parse(valueToValidate);
//           } catch {
//             error =
//               swaggerType === Constants.SWAGGER.TYPE.BOOLEAN
//                 ? intl.formatMessage({ defaultMessage: 'Enter a valid boolean.', description: 'Error validation message' })
//                 : intl.formatMessage({ defaultMessage: 'Enter a valid json.', description: 'Error validation message' });
//           }
//           break;

//         default:
//           break;
//       }
//       return error;

//     default:
//       return undefined;
//   }
// };

export const unitTestSlice = createSlice({
  name: 'unitTest',
  initialState: initialUnitTestState,
  reducers: {
    initUnitTestDefinition: (state: UnitTestState, action: PayloadAction<InitDefintionPayload | null>) => {
      if (!isNullOrUndefined(action.payload)) {
        const { mockResults } = action.payload;
        // state.assertions = assertions;
        state.mockResults = mockResults;
      }
    },
    addMockResult: (state: UnitTestState, action: PayloadAction<AddMockResultPayload>) => {
      const { operationName, mockResult } = action.payload;
      state.mockResults[operationName] = mockResult;
    },
    updateAssertions: (state: UnitTestState, action: PayloadAction<AddAssertionPayload>) => {
      const { assertions } = action.payload;
      state.assertions = assertions;
    },
  },
});

export const { updateAssertions, addMockResult, initUnitTestDefinition } = unitTestSlice.actions;

export default unitTestSlice.reducer;
