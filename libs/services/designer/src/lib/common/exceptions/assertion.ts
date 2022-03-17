import { BaseException } from './baseexception';

export const AssertionExceptionName = 'Core.AssertionException';

export enum AssertionErrorCode {
    CALLBACK_NOTREGISTERED = 'CallbackNotRegistered',
    CONNECTION_OPERATION_EXPECTED = 'ConnectionOperationExpected',
    DUPLICATE_PARAMETER_IDS = 'DuplicateParameterIds',
    DYNAMIC_INVOKE_CLIENT_SIDE_ERROR = 'DynamicInvokeClientSideError',
    EXPRESSION_IDENTIFIER_CANNOT_DESERIALIZE = 'ExpressionIdentifierCannotDeserialize',
    INVALID_CONDITION_TYPE = 'InvalidConditionType',
    INVALID_DYNAMICALLY_ADDED_PARAMETER = 'InvalidDynamicallyAddedParameter',
    INVALID_EXPRESSION_IN_PATH_VALUE_SEGMENT = 'InvalidExpressionInPathValueSegment',
    INVALID_EXPRESSION_IN_TOKEN_VALUE_SEGMENT = 'InvalidExpressionInTokenValueSegment',
    INVALID_MANIFEST = 'InvalidManifest',
    INVALID_NODE_PHASE = 'InvalidNodePhase',
    INVALID_NUMBER_OF_CHILD_GRAPHS = 'InvalidNumberOfChildGraphs',
    INVALID_NUMBER_OF_USER_IDENTITIES = 'InvalidNumberOfUserIdentities',
    INVALID_PARAMETER_DEPENDENCY = 'InvalidParameterDependency',
    INVALID_RECURRENCE_TYPE = 'InvalidRecurrenceType',
    INVALID_SCHEMA_TYPE = 'InvalidSchemaType',
    INVALID_SELECTION_IN_PARAMETER = 'InvalidSelectionInParameter',
    INVALID_SPLITON = 'InvalidSplitOn',
    INVALID_VALUE_SEGMENT_TYPE = 'InvalidValueSegmentType',
    NODE_CANNOT_BE_SERIALIZED_AS_CONNECTION_OPERATION = 'NodeCannotBeSerializedAsConnectionOperation',
    NODE_DOES_NOT_EXISTS = 'NodeDoesNotExist',
    NODE_NOT_IN_ACTION_STORE = 'NodeNotFoundInActionsStore',
    OPEN_API_OPERATION_CAN_NOT_FIND_DYNAMIC_PARAMETER_REFERENCE = 'OpenApiOperationCanNotFindDynamicParameterReference',
    OPEN_API_OPERATION_CAN_NOT_FIND_PROPERTY_FOR_ALIAS = 'OpenApiOperationCanNotFindPropertyForAlias',
    OPEN_API_OPERATION_CAN_NOT_REFERENCE_SWAGGER = 'OpenApiOperationCanNotReferenceSwagger',
    OPERATION_NOT_IMPLEMENTED = 'OperationNotImplemented',
    OPERATION_MANIFEST_MISSING = 'OperationManifestMissing',
    PARAMETER_UPDATE_GROUP_ID_OR_PARAMETERS_FOR_NODE_UNDEFINED = 'ParameterUpdateGroupIdOrParametersForNodeUndefined',
    UNDEFINED_CONNECTOR_OR_CONNECTOR_PROPERTIES = 'UndefinedConnectorOrConnectorProperties',
    PARAMETER_UPDATE_PARENT_PARAMETER_UNDEFINED = 'ParameterUpdateParentParameterUndefined',
    UNDEFINED_CONNECTOR_PROPERTIES_OR_SWAGGER = 'UndefinedConnectorPropertiesOrSwagger',
    UNMATCHING_TOKEN_COUNT = 'UNMATCHING_TOKEN_COUNT',
    UNSPECIFIED = 'Unspecified',
    UNSUPPORTED_AUTHENTICATION_TYPE = 'UnsupportedAuthenticationType',
    UNSUPPORTED_AUTHENTICATION_PROPERTY = 'UnsupportedAuthenticationProperty',
    UNSUPPORTED_MANAGED_IDENTITY_TYPE = 'UnsupportedManagedIdentityType',
    UNSUPPORTED_MANIFEST_CONNECTION_REFERENCE_FORMAT = 'UnsupportedManifestConnectionReferenceFormat',
    UNSUPPORTED_OAUTH_CREDENTIAL_TYPE = 'UnsupportedOAuthCredentialType',
    UNSUPPORTED_OPERATION_ID = 'UnsupportedOperationId',
    UNSUPPORTED_OPERATION_TYPE = 'UnsupportedOperationType',
    UNSUPPORTED_SERIALIZATION_FORMAT = 'UnsupportedSerializationFormat',
}

export class AssertionException extends BaseException {
    constructor(
        code: AssertionErrorCode,
        message: string,
        data?: Record<string, any> /* tslint:disable-line: no-any */,
        innerException?: any /* tslint:disable-line: no-any */
    ) {
        super(AssertionExceptionName, message, code, data, innerException);
    }
}
