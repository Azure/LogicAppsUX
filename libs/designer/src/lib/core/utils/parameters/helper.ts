/* eslint-disable no-case-declarations  */
import constants from '../../../common/constants';
import type { ConnectionReference, WorkflowParameter } from '../../../common/models/workflow';
import type { NodeDataWithOperationMetadata } from '../../actions/bjsworkflow/operationdeserializer';
import type { Settings } from '../../actions/bjsworkflow/settings';
import { getConnectorWithSwagger } from '../../queries/connections';
import type {
  DependencyInfo,
  NodeDependencies,
  NodeInputs,
  NodeOperation,
  OutputInfo,
  ParameterGroup,
  UpdateParametersPayload,
} from '../../state/operation/operationMetadataSlice';
import {
  ErrorLevel,
  updateErrorDetails,
  updateActionMetadata,
  removeParameterValidationError,
  updateParameterValidation,
  DynamicLoadStatus,
  addDynamicInputs,
  clearDynamicInputs,
  updateNodeParameters,
} from '../../state/operation/operationMetadataSlice';
import type { VariableDeclaration } from '../../state/tokens/tokensSlice';
import type { NodesMetadata, Operations as Actions } from '../../state/workflow/workflowInterfaces';
import type { WorkflowParameterDefinition } from '../../state/workflowparameters/workflowparametersSlice';
import type { RootState } from '../../store';
import { getAllParentsForNode, getFirstParentOfType, getTriggerNodeId } from '../graph';
import { getParentArrayKey, isForeachActionNameForLoopsource, parseForeach } from '../loops';
import { isOneOf } from '../openapi/schema';
import { loadDynamicOutputsInNode } from '../outputs';
import { hasSecureOutputs } from '../setting';
import { processPathInputs } from '../swagger/inputsbuilder';
import { extractPathFromUri, getOperationIdFromDefinition } from '../swagger/operation';
import { convertWorkflowParameterTypeToSwaggerType } from '../tokens';
import { validateJSONParameter, validateStaticParameterInfo } from '../validation';
import { addCastToExpression, addFoldingCastToExpression } from './casting';
import { getDynamicInputsFromSchema, getDynamicSchema, getDynamicValues, getFolderItems } from './dynamicdata';
import { getRecurrenceParameters } from './recurrence';
import {
  createLiteralValueSegment,
  isExpressionToken,
  isFunctionValueSegment,
  isItemToken,
  isIterationIndexToken,
  isLiteralValueSegment,
  isOutputToken,
  isOutputTokenValueSegment,
  isParameterToken,
  isTokenValueSegment,
  isValueSegment,
  isVariableToken,
  ValueSegmentConvertor,
} from './segment';
import { OperationManifestService, WorkflowService } from '@microsoft/designer-client-services-logic-apps';
import type {
  AuthProps,
  ComboboxItem,
  DictionaryEditorItemProps,
  FloatingActionMenuOutputViewModel,
  GroupItemProps,
  OutputToken,
  ParameterInfo,
  RowItemProps,
  Token as SegmentToken,
  Token,
  ValueSegment,
} from '@microsoft/designer-ui';
import {
  removeQuotes,
  ArrayType,
  FloatingActionMenuKind,
  getOuterMostCommaIndex,
  RowDropdownOptions,
  GroupDropdownOptions,
  GroupType,
  AuthenticationType,
  ColumnMode,
  DynamicCallStatus,
  ValueSegmentType,
  TokenType,
  AuthenticationOAuthType,
} from '@microsoft/designer-ui';
import { getIntl } from '@microsoft/intl-logic-apps';
import type {
  DependentParameterInfo,
  DynamicParameters,
  Expression,
  ExpressionFunction,
  ExpressionLiteral,
  InputParameter,
  OutputParameter,
  ResolvedParameter,
  SchemaProcessorOptions,
  SchemaProperty,
  Segment,
  SwaggerParser,
} from '@microsoft/parsers-logic-apps';
import {
  isDynamicTreeExtension,
  isLegacyDynamicValuesTreeExtension,
  DeserializationType,
  PropertySerializationType,
  getKnownTitles,
  isLegacyDynamicValuesExtension,
  ParameterLocations,
  ExpressionType,
  ExtensionProperties,
  createEx,
  convertToStringLiteral,
  decodePropertySegment,
  DefaultKeyPrefix,
  encodePropertySegment,
  isAncestorKey,
  isTemplateExpression,
  OutputKeys,
  OutputSource,
  parseEx,
  SchemaProcessor,
  SegmentType,
  Visibility,
  PropertyName,
} from '@microsoft/parsers-logic-apps';
import type { Exception, OpenAPIV2, OperationManifest, RecurrenceSetting } from '@microsoft/utils-logic-apps';
import {
  createCopy,
  deleteObjectProperties,
  deleteObjectProperty,
  getObjectPropertyValue,
  safeSetObjectPropertyValue,
  isUndefinedOrEmptyString,
  aggregate,
  clone,
  endsWith,
  equals,
  first,
  format,
  getPropertyValue,
  guid,
  includes,
  isNullOrUndefined,
  isObject,
  isString,
  startsWith,
  unmap,
  UnsupportedException,
  ValidationErrorCode,
  ValidationException,
  nthLastIndexOf,
} from '@microsoft/utils-logic-apps';
import type { Dispatch } from '@reduxjs/toolkit';

// import { debounce } from 'lodash';

export const ParameterBrandColor = '#916F6F';
export const ParameterIcon =
  'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cGF0aCBkPSJtMCAwaDMydjMyaC0zMnoiIGZpbGw9IiM5MTZmNmYiLz4NCiA8ZyBmaWxsPSIjZmZmIj4NCiAgPHBhdGggZD0ibTE2LjAyMyAxMS41cTAuOTQ1MzEgMCAxLjc3MzQgMC4yODkwNiAwLjgyODEyIDAuMjg5MDYgMS40NDUzIDAuODM1OTQgMC42MTcxOSAwLjU0Njg4IDAuOTY4NzUgMS4zMjgxIDAuMzU5MzggMC43ODEyNSAwLjM1OTM4IDEuNzY1NiAwIDAuNTE1NjItMC4xNDA2MiAxLjA3ODEtMC4xMzI4MSAwLjU1NDY5LTAuNDIxODggMS4wMTU2LTAuMjgxMjUgMC40NTMxMi0wLjcyNjU2IDAuNzUtMC40Mzc1IDAuMjk2ODgtMS4wNDY5IDAuMjk2ODgtMC42NzE4OCAwLTAuOTY4NzUtMC4zNjcxOS0wLjI5Njg4LTAuMzY3MTktMC4zMDQ2OS0xLjAwNzhoLTAuMDMxMjVxLTAuMTc5NjkgMC42MTcxOS0wLjU4NTk0IDEtMC4zOTg0NCAwLjM3NS0xLjA3MDMgMC4zNzUtMC40NjA5NCAwLTAuNzk2ODgtMC4xNzk2OS0wLjMyODEyLTAuMTg3NS0wLjU0Njg4LTAuNDg0MzgtMC4yMTA5NC0wLjMwNDY5LTAuMzEyNS0wLjY4NzUtMC4xMDE1Ni0wLjM5MDYyLTAuMTAxNTYtMC44MDQ2OSAwLTAuNTQ2ODggMC4xNDA2Mi0xLjA5MzggMC4xNDg0NC0wLjU0Njg4IDAuNDQ1MzEtMC45NzY1NiAwLjI5Njg4LTAuNDI5NjkgMC43NS0wLjY5NTMxIDAuNDYwOTQtMC4yNzM0NCAxLjA4NTktMC4yNzM0NCAwLjE3OTY5IDAgMC4zNTkzOCAwLjA0Njg3IDAuMTg3NSAwLjA0Njg3IDAuMzUxNTYgMC4xNDA2MiAwLjE2NDA2IDAuMDkzNzUgMC4yODkwNiAwLjIzNDM4dDAuMTg3NSAwLjMyODEydi0wLjAzOTA1OHEwLjAxNTYzLTAuMTU2MjUgMC4wMjM0NC0wLjMxMjUgMC4wMTU2My0wLjE1NjI1IDAuMDMxMjUtMC4zMTI1aDAuNzI2NTZsLTAuMTg3NSAyLjIzNDRxLTAuMDIzNDQgMC4yNS0wLjA1NDY5IDAuNTA3ODEtMC4wMzEyNTEgMC4yNTc4MS0wLjAzMTI1MSAwLjUwNzgxIDAgMC4xNzE4OCAwLjAxNTYzIDAuMzgyODEgMC4wMjM0NCAwLjIwMzEyIDAuMDkzNzUgMC4zOTA2MiAwLjA3MDMxIDAuMTc5NjkgMC4yMDMxMiAwLjMwNDY5IDAuMTQwNjIgMC4xMTcxOSAwLjM3NSAwLjExNzE5IDAuMjgxMjUgMCAwLjUtMC4xMTcxOSAwLjIxODc1LTAuMTI1IDAuMzc1LTAuMzIwMzEgMC4xNjQwNi0wLjE5NTMxIDAuMjczNDQtMC40NDUzMSAwLjEwOTM4LTAuMjU3ODEgMC4xNzk2OS0wLjUyMzQ0IDAuMDcwMzEtMC4yNzM0NCAwLjA5Mzc1LTAuNTM5MDYgMC4wMzEyNS0wLjI2NTYyIDAuMDMxMjUtMC40ODQzOCAwLTAuODU5MzgtMC4yODEyNS0xLjUzMTJ0LTAuNzg5MDYtMS4xMzI4cS0wLjUtMC40NjA5NC0xLjIwMzEtMC43MDMxMi0wLjY5NTMxLTAuMjQyMTktMS41MjM0LTAuMjQyMTktMC44OTg0NCAwLTEuNjMyOCAwLjMzNTk0LTAuNzI2NTYgMC4zMzU5NC0xLjI1IDAuOTE0MDYtMC41MTU2MiAwLjU3MDMxLTAuNzk2ODggMS4zMzU5dC0wLjI4MTI1IDEuNjMyOHEwIDAuODk4NDQgMC4yNzM0NCAxLjYzMjggMC4yODEyNSAwLjcyNjU2IDAuNzk2ODggMS4yNDIydDEuMjQyMiAwLjc5Njg4cTAuNzM0MzggMC4yODEyNSAxLjYzMjggMC4yODEyNSAwLjYzMjgxIDAgMS4yNS0wLjEwMTU2IDAuNjI1LTAuMTAxNTYgMS4xOTUzLTAuMzc1djAuNzE4NzVxLTAuNTg1OTQgMC4yNS0xLjIyNjYgMC4zNDM3NS0wLjY0MDYzIDAuMDg1OTM4LTEuMjczNCAwLjA4NTkzOC0xLjAzOTEgMC0xLjg5ODQtMC4zMjAzMS0wLjg1OTM4LTAuMzI4MTItMS40ODQ0LTAuOTIxODgtMC42MTcxOS0wLjYwMTU2LTAuOTYwOTQtMS40NTMxLTAuMzQzNzUtMC44NTE1Ni0wLjM0Mzc1LTEuODk4NCAwLTEuMDU0NyAwLjM1MTU2LTEuOTUzMSAwLjM1MTU2LTAuODk4NDQgMC45ODQzOC0xLjU1NDcgMC42MzI4MS0wLjY1NjI1IDEuNTE1Ni0xLjAyMzQgMC44ODI4MS0wLjM3NSAxLjk1MzEtMC4zNzV6bS0wLjYwOTM3IDYuNjc5N3EwLjQ3NjU2IDAgMC43ODEyNS0wLjI2NTYyIDAuMzA0NjktMC4yNzM0NCAwLjQ3NjU2LTAuNjcxODggMC4xNzE4OC0wLjM5ODQ0IDAuMjM0MzgtMC44NTE1NiAwLjA3MDMxLTAuNDUzMTIgMC4wNzAzMS0wLjgyMDMxIDAtMC4yNjU2Mi0wLjA1NDY5LTAuNDkyMTktMC4wNTQ2OS0wLjIyNjU2LTAuMTc5NjktMC4zOTA2Mi0wLjExNzE5LTAuMTY0MDYtMC4zMjAzMS0wLjI1NzgxdC0wLjQ5MjE5LTAuMDkzNzVxLTAuNDUzMTIgMC0wLjc1NzgxIDAuMjM0MzgtMC4zMDQ2OSAwLjIzNDM4LTAuNDkyMTkgMC41ODU5NC0wLjE4NzUgMC4zNTE1Ni0wLjI3MzQ0IDAuNzczNDQtMC4wNzgxMyAwLjQxNDA2LTAuMDc4MTMgMC43ODEyNSAwIDAuMjU3ODEgMC4wNTQ2OSAwLjUyMzQ0IDAuMDU0NjkgMC4yNTc4MSAwLjE3OTY5IDAuNDY4NzUgMC4xMjUgMC4yMTA5NCAwLjMzNTk0IDAuMzQzNzUgMC4yMTA5NCAwLjEzMjgxIDAuNTE1NjIgMC4xMzI4MXptLTcuNDE0MS04LjE3OTdoM3YxaC0ydjEwaDJ2MWgtM3ptMTYgMHYxMmgtM3YtMWgydi0xMGgtMnYtMXoiIHN0cm9rZS13aWR0aD0iLjQiLz4NCiA8L2c+DQo8L3N2Zz4NCg==';

export const FxBrandColor = '#AD008C';
export const FxIcon =
  'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzNCAzNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cmVjdCB3aWR0aD0iMzQiIGhlaWdodD0iMzQiIGZpbGw9IiNhZDAwOGMiLz4NCiA8cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMTMuNDg3LDEzLjI0OGE3LjA1NCw3LjA1NCwwLDAsMSwxLjg0OS0zLjY5QTUuMyw1LjMsMCwwLDEsMTguNTkzLDcuOWMuOTg1LDAsMS40NjcuNTg1LDEuNDQ3LDEuMDY5YTEuNTUxLDEuNTUxLDAsMCwxLS43NDQsMS4xNDkuNDA2LjQwNiwwLDAsMS0uNTQzLS4wNjFjLS41NDMtLjY2NS0xLjAwNS0xLjA2OS0xLjM2Ny0xLjA2OS0uNC0uMDItLjc2NC4yODItMS40MDcsNC4yNTVoMi4zMzJsLS40MjIuODA3LTIuMDkuMTYxYy0uMzQyLDEuODM1LS42LDMuNjMtMS4xNDYsNS45MDgtLjc4NCwzLjMyNy0xLjY4OCw0LjY1OC0zLjEsNS44MjdBMy43NDYsMy43NDYsMCwwLDEsOS4zNDcsMjdDOC42ODMsMjcsOCwyNi41NTYsOCwyNi4wMzJhMS42OTIsMS42OTIsMCwwLDEsLjcyNC0xLjE0OWMuMTYxLS4xMjEuMjgxLS4xNDEuNDIyLS4wNGEyLjg3MywyLjg3MywwLDAsMCwxLjU2OC43MDYuNjc1LjY3NSwwLDAsMCwuNjYzLS41LDI3LjQyNywyNy40MjcsMCwwLDAsLjg0NC00LjE3NGMuNDYyLTIuNzYyLjc0NC00LjY1OCwxLjA4NS02LjY1NEgxMS43bC0uMS0uMi42ODMtLjc2NloiLz4NCiA8cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMTcuMzIxLDE4LjljLjgxMi0xLjE4MywxLjY1NC0xLjg3NCwyLjIzNi0xLjg3NC40OSwwLC43MzUuNTIyLDEuMDU3LDEuNDlsLjIzLjcyMmMxLjE2NC0xLjY3NSwxLjczMS0yLjIxMiwyLjQtMi4yMTJhLjc0Mi43NDIsMCwwLDEsLjc1MS44NDUuOTIyLjkyMiwwLDAsMS0uOC44NzYuNDE0LjQxNCwwLDAsMS0uMjkxLS4xNjkuNDc3LjQ3NywwLDAsMC0uMzY4LS4xODRjLS4xNTMsMC0uMzM3LjEwOC0uNjEzLjM4NGE4LjU0Nyw4LjU0NywwLDAsMC0uODczLDEuMDc1bC42MTMsMS45NjZjLjE4NC42My4zNjcuOTUyLjU2Ny45NTIuMTg0LDAsLjUwNi0uMjQ2LDEuMDQyLS44OTFsLjMyMi4zODRjLS45LDEuNDI5LTEuNzYxLDEuOTItMi4zNDMsMS45Mi0uNTIxLDAtLjg1OC0uNDMtMS4xOC0xLjQ5bC0uMzUyLTEuMTY4Yy0xLjE3OSwxLjkyLTEuNzQ2LDIuNjU4LTIuNTQzLDIuNjU4YS44MTUuODE1LDAsMCwxLS44MTItLjg3NS45LjksMCwwLDEsLjc2Ni0uOTIyLjQ5My40OTMsMCwwLDEsLjI5MS4xNTQuNTE0LjUxNCwwLDAsMCwuMzY4LjE2OWMuMzM3LDAsLjk1LS42NzYsMS43MTUtMS44NTlsLS40LTEuMzY3Yy0uMjc2LS45MDYtLjQxNC0xLjAxNC0uNTY3LTEuMDE0LS4xMzgsMC0uNDE0LjItLjg4OC44MTRaIi8+DQo8L3N2Zz4NCg==';

export const VariableBrandColor = '#770bd6';
export const VariableIcon =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzJweCIgaGVpZ2h0PSIzMnB4IiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAzMiAzMiIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjNzcwQkQ2Ii8+DQogPGcgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Ik02Ljc2MywxMy42ODV2LTMuMjA4QzYuNzYzLDguNzQ4LDcuNzYyLDgsMTAsOHYxLjA3Yy0xLDAtMiwwLjMyNS0yLDEuNDA3djMuMTg4ICAgIEM4LDE0LjgzNiw2LjUxMiwxNiw1LjUxMiwxNkM2LjUxMiwxNiw4LDE3LjE2NCw4LDE4LjMzNVYyMS41YzAsMS4wODIsMSwxLjQyOSwyLDEuNDI5VjI0Yy0yLjIzOCwwLTMuMjM4LTAuNzcyLTMuMjM4LTIuNXYtMy4xNjUgICAgYzAtMS4xNDktMC44OTMtMS41MjktMS43NjMtMS41ODV2LTEuNUM1Ljg3LDE1LjE5NCw2Ljc2MywxNC44MzQsNi43NjMsMTMuNjg1eiIvPg0KICA8cGF0aCBkPSJtMjUuMjM4IDEzLjY4NXYtMy4yMDhjMC0xLjcyOS0xLTIuNDc3LTMuMjM4LTIuNDc3djEuMDdjMSAwIDIgMC4zMjUgMiAxLjQwN3YzLjE4OGMwIDEuMTcxIDEuNDg4IDIuMzM1IDIuNDg4IDIuMzM1LTEgMC0yLjQ4OCAxLjE2NC0yLjQ4OCAyLjMzNXYzLjE2NWMwIDEuMDgyLTEgMS40MjktMiAxLjQyOXYxLjA3MWMyLjIzOCAwIDMuMjM4LTAuNzcyIDMuMjM4LTIuNXYtMy4xNjVjMC0xLjE0OSAwLjg5My0xLjUyOSAxLjc2Mi0xLjU4NXYtMS41Yy0wLjg3LTAuMDU2LTEuNzYyLTAuNDE2LTEuNzYyLTEuNTY1eiIvPg0KICA8cGF0aCBkPSJtMTUuODE1IDE2LjUxMmwtMC4yNDItMC42NDFjLTAuMTc3LTAuNDUzLTAuMjczLTAuNjk4LTAuMjg5LTAuNzM0bC0wLjM3NS0wLjgzNmMtMC4yNjYtMC41OTktMC41MjEtMC44OTgtMC43NjYtMC44OTgtMC4zNyAwLTAuNjYyIDAuMzQ3LTAuODc1IDEuMDM5LTAuMTU2LTAuMDU3LTAuMjM0LTAuMTQxLTAuMjM0LTAuMjUgMC0wLjMyMyAwLjE4OC0wLjY5MiAwLjU2Mi0xLjEwOSAwLjM3NS0wLjQxNyAwLjcxLTAuNjI1IDEuMDA3LTAuNjI1IDAuNTgzIDAgMS4xODYgMC44MzkgMS44MTEgMi41MTZsMC4xNjEgMC40MTQgMC4xOC0wLjI4OWMxLjEwOC0xLjc2IDIuMDQ0LTIuNjQxIDIuODA0LTIuNjQxIDAuMTk4IDAgMC40MyAwLjA1OCAwLjY5NSAwLjE3MmwtMC45NDYgMC45OTJjLTAuMTI1LTAuMDM2LTAuMjE0LTAuMDU1LTAuMjY2LTAuMDU1LTAuNTczIDAtMS4yNTYgMC42NTktMi4wNDggMS45NzdsLTAuMjI3IDAuMzc5IDAuMTc5IDAuNDhjMC42ODQgMS44OTEgMS4yNDkgMi44MzYgMS42OTQgMi44MzYgMC40MDggMCAwLjcyLTAuMjkyIDAuOTM1LTAuODc1IDAuMTQ2IDAuMDk0IDAuMjE5IDAuMTkgMC4yMTkgMC4yODkgMCAwLjI2MS0wLjIwOCAwLjU3My0wLjYyNSAwLjkzOHMtMC43NzYgMC41NDctMS4wNzggMC41NDdjLTAuNjA0IDAtMS4yMjEtMC44NTItMS44NTEtMi41NTVsLTAuMjE5LTAuNTc4LTAuMjI3IDAuMzk4Yy0xLjA2MiAxLjgyMy0yLjA3OCAyLjczNC0zLjA0NyAyLjczNC0wLjM2NSAwLTAuNjc1LTAuMDkxLTAuOTMtMC4yNzFsMC45MDYtMC44ODVjMC4xNTYgMC4xNTYgMC4zMzggMC4yMzQgMC41NDcgMC4yMzQgMC41ODggMCAxLjI1LTAuNTk2IDEuOTg0LTEuNzg2bDAuNDA2LTAuNjU4IDAuMTU1LTAuMjU5eiIvPg0KICA8ZWxsaXBzZSB0cmFuc2Zvcm09Im1hdHJpeCguMDUzNiAtLjk5ODYgLjk5ODYgLjA1MzYgNS40OTI1IDMyLjI0NSkiIGN4PSIxOS43NTciIGN5PSIxMy4yMjUiIHJ4PSIuNzc4IiByeT0iLjc3OCIvPg0KICA8ZWxsaXBzZSB0cmFuc2Zvcm09Im1hdHJpeCguMDUzNiAtLjk5ODYgLjk5ODYgLjA1MzYgLTcuNTgzOSAzMC42MjkpIiBjeD0iMTIuMzY2IiBjeT0iMTkuMzE1IiByeD0iLjc3OCIgcnk9Ii43NzgiLz4NCiA8L2c+DQo8L3N2Zz4NCg==';

export const ItemBrandColor = '#486991';
export const ItemIcon =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGQ9Im0wIDBoMzJ2MzJoLTMyeiIgZmlsbD0iIzQ4Njk5MSIvPg0KIDxwYXRoIGQ9Ik0xMSAyMGg3LjJsMSAxaC05LjJ2LTguM2wtMS4zIDEuMy0uNy0uNyAyLjUtMi41IDIuNSAyLjUtLjcuNy0xLjMtMS4zem0xMi4zLTJsLjcuNy0yLjUgMi41LTIuNS0yLjUuNy0uNyAxLjMgMS4zdi03LjNoLTcuMmwtMS0xaDkuMnY4LjN6IiBmaWxsPSIjZmZmIi8+DQo8L3N2Zz4NCg==';

export const httpWebhookBrandColor = '#709727';
export const httpWebhookIcon =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGZpbGw9IiM3MDk3MjciIGQ9Im0wIDBoMzJ2MzJoLTMyeiIvPg0KIDxnIGZpbGw9IiNmZmYiPg0KICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMTEuODE3IDIxLjIwNmMtLjM2NyAwLS42NjEtLjE0Ny0uNjYxLS41ODdsLS4wNzMtMS43NjJjLS4wNzMtMS4xMDEtLjE0Ny0yLjIwMi0xLjI0OC0yLjkzNi42NjEtLjQ0IDEuMTAxLTEuMTAxIDEuMTc0LTEuODM1bC4xNDctMi4yMDJjMC0xLjAyOC4yMi0xLjMyMSAxLjEwMS0xLjE3NGguMDczYy4wNzMtLjA3My4yMi0uMTQ3LjIyLS4yMnYtMS4yNDhoLS44MDdjLTEuMzIxIDAtMi4wNTUuNzM0LTIuMTI5IDIuMDU1LS4wNzMuNzM0LS4wNzMgMS41NDItLjA3MyAyLjI3NiAwIDEuMTAxLS4zNjcgMS4zOTUtMS4zMjEgMS42MTUtLjA3MyAwLS4yMi4yMi0uMjIuMjk0djEuMDI4YzAgLjI5NC4wNzMuMzY3LjM2Ny4zNjcuNTg3IDAgLjg4MS4yMiAxLjAyOC44MDcuMDczLjI5NC4xNDcuNjYxLjE0Ny45NTRsLjA3MyAyLjIwMmMuMDczLjczNC4yOTQgMS4zOTUgMS4wMjggMS42ODguNTg3LjI5NCAxLjI0OC4yOTQgMS45ODIuMjJ2LS42NjFjLS4wNzMtLjgwNy0uMDczLS44ODEtLjgwNy0uODgxeiIvPg0KICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMjMuNjM1IDE1LjExM2MtLjQ0IDAtLjgwNy0uMjItLjk1NC0uNjYxbC0uMjItMS4xMDFjLS4wNzMtLjczNC0uMDczLTEuMzk1LS4wNzMtMi4xMjktLjA3My0xLjI0OC0uODA3LTEuOTA5LTEuOTgyLTEuOTgyLS45NTQtLjA3My0uOTU0LS4wNzMtLjk1NC44ODF2LjA3M2MwIC41MTQgMCAuNTE0LjUxNC41MTQuNjYxIDAgLjg4MS4yMi44ODEuODgxIDAgLjczNCAwIDEuMzk1LjA3MyAyLjEyOS4wNzMuODA3LjI5NCAxLjYxNSAxLjAyOCAyLjEyOWwuMjIuMTQ3Yy0uNzM0LjQ0LTEuMTAxIDEuMTAxLTEuMTc0IDEuOTA5LS4wNzMuNzM0LS4xNDcgMS40NjgtLjE0NyAyLjEyOSAwIDEuMDI4LS4yMiAxLjMyMS0xLjE3NCAxLjI0OC0uMDczIDAtLjI5NC4xNDctLjI5NC4yMnYxLjI0OGgxLjAyOGMxLjAyOC0uMDczIDEuNjE1LS41ODcgMS44MzUtMS42MTUuMTQ3LS41ODcuMDczLTEuMjQ4LjE0Ny0xLjgzNSAwLS40NCAwLS44ODEuMDczLTEuMzIxLjA3My0uNzM0LjQ0LTEuMTAxIDEuMTc0LTEuMTAxLjIyIDAgLjI5NC0uMDczLjI5NC0uMjk0di0uOTU0Yy4xNDctLjQ0LjA3My0uNTg3LS4yOTQtLjUxNHoiLz4NCiAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTEyLjc3MSAxNS4wNGMtLjUxNCAwLS45NTQuNDQtLjk1NC45NTRzLjQ0Ljg4MS45NTQuODgxLjk1NC0uMzY3Ljk1NC0uOTU0YzAtLjUxNC0uNDQtLjg4MS0uOTU0LS44ODF6Ii8+DQogIDxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0xNi4wMDEgMTUuMDRjLS41MTQgMC0uOTU0LjM2Ny0uOTU0Ljg4MSAwIC41ODcuMzY3Ljk1NC44ODEuOTU0cy45NTQtLjM2Ny45NTQtLjg4MWMuMDczLS41ODctLjI5NC0uOTU0LS44ODEtLjk1NHoiLz4NCiAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTIwLjE4NSAxNS45MmMwLS41MTQtLjQ0LS44ODEtLjk1NC0uODgxcy0uOTU0LjQ0LS45NTQuODgxYzAgLjUxNC40NC45NTQuOTU0Ljk1NHMuOTU0LS40NC45NTQtLjk1NHoiLz4NCiA8L2c+DQo8L3N2Zz4NCg==';

export const ParameterGroupKeys = {
  DEFAULT: 'default',
  RECURRENCE: 'recurrence',
};

export interface RepetitionContext {
  splitOn?: string;
  repetitionReferences: RepetitionReference[];
}

export interface RepetitionReference {
  actionName: string;
  actionType: string;
  repetitionValue: any; // NOTE: the expression for foreach, and its type could be string or array.
  repetitionStep?: string; // NOTE: the output original step
  repetitionPath?: string; // NOTE: the full output path for repetition value if it coming from output
}

export function getParametersSortedByVisibility(parameters: ParameterInfo[]): ParameterInfo[] {
  // Sorted by ( Required, Important, Advanced, Other )
  return parameters.sort((a, b) => {
    if (a.required && !b.required) return -1;
    if (!a.required && b.required) return 1;

    const aVisibility = getVisibility(a);
    const bVisibility = getVisibility(b);
    if (aVisibility === bVisibility) return 0;
    if (aVisibility === Visibility.Important) return -1;
    if (bVisibility === Visibility.Important) return 1;
    if (aVisibility === Visibility.Advanced) return -1;
    if (bVisibility === Visibility.Advanced) return 1;
    return 0;
  });
}

export function addRecurrenceParametersInGroup(
  parameterGroups: Record<string, ParameterGroup>,
  recurrence: RecurrenceSetting | undefined,
  definition: any
): void {
  if (!recurrence) {
    return;
  }

  const recurrenceParameters = getRecurrenceParameters(recurrence, definition);

  if (recurrenceParameters.length) {
    const intl = getIntl();
    if (recurrence.useLegacyParameterGroup) {
      // eslint-disable-next-line no-param-reassign
      parameterGroups[ParameterGroupKeys.DEFAULT].parameters = recurrenceParameters;
    } else {
      // eslint-disable-next-line no-param-reassign
      parameterGroups[ParameterGroupKeys.RECURRENCE] = {
        id: ParameterGroupKeys.RECURRENCE,
        description: intl.formatMessage({
          defaultMessage: 'How often do you want to check for items?',
          description: 'Recurrence parameter group title',
        }),
        parameters: recurrenceParameters,
      };
    }
  }
}

export const getDependentParameters = (
  inputs: NodeInputs,
  parameters: Record<string, any> | DynamicParameters
): Record<string, { isValid: boolean }> => {
  return Object.keys(parameters).reduce((result: Record<string, { isValid: boolean }>, key: string) => {
    const parameter = parameters[key];
    if (!parameter) return result;
    const operationInput = getParameterFromName(inputs, parameter?.parameter ?? parameter?.parameterReference ?? 'undefined');
    if (operationInput) {
      return {
        ...result,
        [operationInput.id]: { isValid: parameterValidForDynamicCall(operationInput) },
      };
    }

    return result;
  }, {});
};

/**
 * Converts to parameter info map.
 * @arg {InputParameter[]} inputParameters - The input parameters.
 * @arg {any} [stepDefinition] - The step definition.
 */
export function toParameterInfoMap(inputParameters: InputParameter[], stepDefinition?: any): ParameterInfo[] {
  const metadata = stepDefinition && stepDefinition.metadata;
  const result: ParameterInfo[] = [];
  for (const inputParameter of inputParameters) {
    if (!inputParameter.dynamicSchema) {
      const parameter = createParameterInfo(inputParameter, metadata);
      result.push(parameter);
    }
  }

  return result;
}

/**
 * Gets the parameter info object for UI elements from the resolved parameters from schema, swagger, definition, etc.
 * @arg {ResolvedParameter} parameter - An object with metadata about a Swagger input parameter.
 * @arg {Record<string, string>} [metadata] - A hash mapping dynamic value lookup values to their display strings.
 * @arg {boolean} [shouldIgnoreDefaultValue=false] - True if should not populate with default value of dynamic parameter.
 * @return {ParameterInfo} - An object with the view model for an input parameter field.
 */
export function createParameterInfo(
  parameter: ResolvedParameter,
  metadata?: Record<string, string>,
  shouldIgnoreDefaultValue = false
): ParameterInfo {
  const value = loadParameterValue(parameter);
  const { editor, editorOptions, editorViewModel, schema } = getParameterEditorProps(parameter, value, shouldIgnoreDefaultValue, metadata);
  const { alias, dependencies, encode, format, isDynamic, isUnknown, serialization, deserialization } = parameter;
  const info = {
    alias,
    dependencies,
    encode,
    format,
    in: parameter.in,
    isDynamic: !!isDynamic,
    isUnknown,
    serialization,
    deserialization,
  };

  const parameterInfo: ParameterInfo = {
    alternativeKey: parameter.alternativeKey,
    id: guid(),
    dynamicData: parameter.dynamicValues ? { status: DynamicCallStatus.NOTSTARTED } : undefined,
    editor,
    editorOptions,
    editorViewModel,
    info,
    hideInUI: shouldHideInUI(parameter),
    conditionalVisibility: shouldSoftHide(parameter) ? hasValue(parameter) : undefined,
    label: parameter.title || parameter.summary || parameter.name,
    parameterKey: parameter.key,
    parameterName: parameter.name,
    placeholder: parameter.description,
    preservedValue: getPreservedValue(parameter),
    required: !!parameter.required,
    schema,
    showErrors: false,
    showTokens: parameter?.schema?.['x-ms-editor'] !== 'string',
    suppressCasting: parameter.suppressCasting,
    type: parameter.type,
    value,
    visibility: getVisibility(parameter),
  };

  return parameterInfo;
}

function getVisibility(parameter: any) {
  // Riley - There's a typo in the response data, putting this here in case it gets fixed
  return parameter?.schema?.['x-ms-visiblity'] ?? parameter?.schema?.['x-ms-visibility'] ?? parameter?.visibility;
}

function shouldHideInUI(parameter: ResolvedParameter): boolean {
  const visibility = getVisibility(parameter);
  return parameter?.hideInUI || parameter?.schema?.hideInUI || equals(visibility, 'hideInUI') || equals(visibility, Visibility.Internal);
}

function shouldSoftHide(parameter: ResolvedParameter): boolean {
  return !parameter.required && !equals(getVisibility(parameter), constants.VISIBILITY.IMPORTANT);
}

function hasValue(parameter: ResolvedParameter): boolean {
  return parameter?.value !== undefined;
}

export function getParameterEditorProps(
  parameter: InputParameter,
  parameterValue: ValueSegment[],
  _shouldIgnoreDefaultValue: boolean,
  nodeMetadata?: Record<string, any>
): ParameterEditorProps {
  const { dynamicValues, type, itemSchema, visibility, value, enum: schemaEnum, format } = parameter;
  let { editor, editorOptions, schema } = parameter;
  let editorViewModel;
  if (!editor) {
    if (format === constants.EDITOR.HTML) {
      editor = constants.EDITOR.HTML;
    } else if (type === constants.SWAGGER.TYPE.ARRAY && !!itemSchema && !equals(visibility, Visibility.Internal)) {
      editor = constants.EDITOR.ARRAY;
      editorViewModel = { ...toArrayViewModelSchema(itemSchema), uncastedValue: parameterValue };
      schema = { ...schema, ...{ 'x-ms-editor': editor } };
    } else if (
      (schemaEnum || schema?.enum || (schemaEnum && schema?.[ExtensionProperties.CustomEnum])) &&
      !equals(visibility, Visibility.Internal)
    ) {
      editor = constants.EDITOR.COMBOBOX;
      schema = { ...schema, ...{ 'x-ms-editor': editor } };

      let schemaEnumOptions: ComboboxItem[];
      if (schema[ExtensionProperties.CustomEnum]) {
        schemaEnumOptions = schema[ExtensionProperties.CustomEnum];
      } else if (schemaEnum) {
        schemaEnumOptions = schemaEnum.map((enumItem) => {
          return {
            ...enumItem,
            value: enumItem.value?.toString(),
            key: enumItem.displayName,
          };
        });
      } else {
        schemaEnumOptions = schema.enum.map(
          (val: string): ComboboxItem => ({
            displayName: val,
            key: val,
            value: val,
          })
        );
      }

      editorOptions = {
        ...editorOptions,
        options: schemaEnumOptions,
      };
    } else {
      editorOptions = undefined;
    }
  } else if (editor === constants.EDITOR.DICTIONARY) {
    editorViewModel = toDictionaryViewModel(value);
  } else if (editor === constants.EDITOR.TABLE) {
    editorViewModel = toTableViewModel(value, editorOptions);
  } else if (editor === constants.EDITOR.AUTHENTICATION) {
    editorViewModel = toAuthenticationViewModel(value);
    editorOptions = { ...editorOptions, identity: WorkflowService().getAppIdentity?.() };
  } else if (editor === constants.EDITOR.CONDITION) {
    editorViewModel = editorOptions?.isOldFormat
      ? toSimpleQueryBuilderViewModel(value)
      : editorOptions?.isHybridEditor
      ? toHybridConditionViewModel(value)
      : toConditionViewModel(value);
  } else if (dynamicValues && isLegacyDynamicValuesExtension(dynamicValues) && dynamicValues.extension.builtInOperation) {
    editor = undefined;
  } else if (editor === constants.EDITOR.FILEPICKER && dynamicValues) {
    const pickerType =
      (isLegacyDynamicValuesTreeExtension(dynamicValues) && dynamicValues.extension.parameters['isFolder']) ||
      (isDynamicTreeExtension(dynamicValues) && dynamicValues.extension.settings.canSelectParentNodes)
        ? constants.FILEPICKER_TYPE.FOLDER
        : constants.FILEPICKER_TYPE.FILE;
    const fileFilters = isLegacyDynamicValuesTreeExtension(dynamicValues) ? dynamicValues.extension.parameters['fileFilter'] : undefined;
    editorOptions = { pickerType, fileFilters, items: undefined };

    let displayValue: string | undefined;
    if (parameterValue.length === 1 && isLiteralValueSegment(parameterValue[0])) {
      displayValue = nodeMetadata?.[parameterValue[0].value];
    }
    editorViewModel = { displayValue, selectedItem: undefined };
  } else if (editor === constants.EDITOR.RECURRENCE) {
    if (parameterValue.some(isTokenValueSegment)) {
      editor = undefined;
    }
  } else if (editor === constants.EDITOR.FLOATINGACTIONMENU && editorOptions?.menuKind === FloatingActionMenuKind.outputs) {
    editorViewModel = toFloatingActionMenuOutputsViewModel(value);
  }

  return { editor, editorOptions, editorViewModel, schema };
}

// Helper Functions for Creating Editor View Models
const containsExpression = (operand: string): boolean => {
  return operand.includes('(') && operand.includes(')');
};

const convertStringToInputParameter = (
  value: string,
  removeQuotesFromExpression?: boolean,
  trimExpression?: boolean,
  convertIfContainsExpression?: boolean
): InputParameter => {
  if (typeof value !== 'string') {
    return {
      key: guid(),
      name: value,
      type: typeof value,
      hideInUI: false,
      value: value,
    };
  }
  const hasExpression = containsExpression(value);
  let newValue = value;
  if (trimExpression) {
    newValue = newValue.trim();
  }
  if (removeQuotesFromExpression) {
    newValue = removeQuotes(newValue);
  }
  if (hasExpression && convertIfContainsExpression && !newValue.startsWith('@')) {
    newValue = `@${newValue}`;
  }
  return {
    key: guid(),
    name: newValue,
    type: 'any',
    hideInUI: false,
    value: newValue,
    suppressCasting: true,
  };
};

export const toArrayViewModelSchema = (schema: any): { arrayType: ArrayType; itemSchema: any; uncastedValue: undefined } => {
  const itemSchema = parseArrayItemSchema(schema);
  const arrayType = schema?.type === constants.SWAGGER.TYPE.OBJECT && schema.properties ? ArrayType.COMPLEX : ArrayType.SIMPLE;
  return { arrayType, itemSchema, uncastedValue: undefined };
};

// Create Array Editor View Model Schema
const parseArrayItemSchema = (itemSchema: any, itemPath = itemSchema?.title?.toLowerCase() ?? ''): any => {
  // convert array schema to object schema
  if (Array.isArray(itemSchema)) {
    return itemSchema.map((item) => parseArrayItemSchema(item, itemPath));
  }
  // parse the initial item schema
  else if (!isNullOrUndefined(itemSchema) && typeof itemSchema === constants.SWAGGER.TYPE.OBJECT) {
    // updated item schema
    const result: { [key: string]: any } = { key: itemPath };
    Object.keys(itemSchema).forEach((key) => {
      const value = itemSchema[key];
      // some parameters don't have a title, so we use the key instead
      const newKey = key === 'x-ms-summary' ? 'title' : key;
      const newPath = itemPath ? `${itemPath}.${key}` : key;
      result[newKey] = parseArrayItemSchema(value, newPath);
    });
    return result;
  }
  return itemSchema;
};

// Create SimpleQueryBuilder Editor View Model
const toSimpleQueryBuilderViewModel = (
  input: any
): { isOldFormat: boolean; itemValue: ValueSegment[] | undefined; isRowFormat: boolean } => {
  const advancedModeResult = { isOldFormat: true, isRowFormat: false, itemValue: undefined };
  let operand1: ValueSegment, operand2: ValueSegment, operationLiteral: ValueSegment;
  // default value
  if (!input || input.length === 0) {
    return { isOldFormat: true, isRowFormat: true, itemValue: [{ id: guid(), type: ValueSegmentType.LITERAL, value: "@equals('','')" }] };
  }

  if (!input.includes('@') || !input.includes(',')) {
    return advancedModeResult;
  }

  let stringValue = input;

  try {
    let operator: string = stringValue.substring(stringValue.indexOf('@') + 1, stringValue.indexOf('('));
    const negatory = operator === 'not';
    let endingLiteral: ValueSegment;
    if (negatory) {
      stringValue = stringValue.replace('@not(', '@');
      const baseOperator = stringValue.substring(stringValue.indexOf('@') + 1, stringValue.indexOf('('));
      operator = 'not' + baseOperator;
      operationLiteral = { id: guid(), type: ValueSegmentType.LITERAL, value: `@not(${baseOperator}(` };
      endingLiteral = { id: guid(), type: ValueSegmentType.LITERAL, value: `))` };
    } else {
      operationLiteral = { id: guid(), type: ValueSegmentType.LITERAL, value: `@${operator}(` };
      endingLiteral = { id: guid(), type: ValueSegmentType.LITERAL, value: ')' };
    }

    // if operator is not of the dropdownlist, it cannot be converted into row format
    if (!Object.values(RowDropdownOptions).includes(operator as RowDropdownOptions)) {
      return advancedModeResult;
    }
    const operandSubstring = stringValue.substring(stringValue.indexOf('(') + 1, nthLastIndexOf(stringValue, ')', negatory ? 2 : 1));
    const operand1String = removeQuotes(operandSubstring.substring(0, getOuterMostCommaIndex(operandSubstring)).trim());
    const operand2String = removeQuotes(operandSubstring.substring(getOuterMostCommaIndex(operandSubstring) + 1).trim());
    operand1 = loadParameterValue(convertStringToInputParameter(operand1String, true, true, true))[0];
    operand2 = loadParameterValue(convertStringToInputParameter(operand2String, true, true, true))[0];
    const separatorLiteral: ValueSegment = { id: guid(), type: ValueSegmentType.LITERAL, value: `,` };
    return {
      isOldFormat: true,
      isRowFormat: true,
      itemValue: [operationLiteral, operand1, separatorLiteral, operand2, endingLiteral],
    };
  } catch {
    return advancedModeResult;
  }
};

export const canConvertToComplexCondition = (input: any): boolean => {
  if (!input) {
    return false;
  }
  let inputKeys = Object.keys(input);
  if (inputKeys.length !== 1) {
    return false;
  }
  let dropdownVal = inputKeys[0];
  if (dropdownVal === 'not') {
    inputKeys = Object.keys(input?.['not']);
    if (inputKeys.length !== 1) {
      return false;
    }
    dropdownVal = inputKeys[0];
  }
  return Object.values<string>(RowDropdownOptions).includes(dropdownVal);
};

// Create HybridQueryBuilder Editor View Model
export const toHybridConditionViewModel = (input: any): { items: GroupItemProps } => {
  let modifiedInput = input;
  // V1 designer does not add the "And" conditional when only one expression is entered
  // Add the the "And" conditional if condition expression does not follow complex condition syntax,
  // but the current condition is still valid
  if (!getConditionalSelectedOption(input) && canConvertToComplexCondition(input)) {
    modifiedInput = {
      and: [input],
    };
  }
  const getConditionOption = getConditionalSelectedOption(modifiedInput);
  const items: GroupItemProps = {
    type: GroupType.GROUP,
    condition: getConditionOption,
    items: recurseConditionalItems(modifiedInput, getConditionOption),
  };
  return { items };
};

// Create QueryBuilder Editor View Model
export const toConditionViewModel = (input: any): { items: GroupItemProps } => {
  const getConditionOption = getConditionalSelectedOption(input);
  const items: GroupItemProps = {
    type: GroupType.GROUP,
    condition: getConditionOption,
    items: recurseConditionalItems(input, getConditionOption),
  };
  return { items };
};

const getConditionalSelectedOption = (input: any): GroupDropdownOptions | undefined => {
  if (input?.['and']) {
    return GroupDropdownOptions.AND;
  } else if (input?.['or']) {
    return GroupDropdownOptions.OR;
  }
  return undefined;
};

function recurseConditionalItems(input: any, selectedOption?: GroupDropdownOptions): (RowItemProps | GroupItemProps)[] {
  const output: (RowItemProps | GroupItemProps)[] = [];
  if (selectedOption) {
    const items = input[selectedOption];
    items.forEach((item: any) => {
      const condition = getConditionalSelectedOption(item);
      if (!condition) {
        let not = '';
        let dropdownVal = '';
        if (item?.['not']) {
          not = 'not';
          dropdownVal = Object.keys(item?.[not])[0];
        } else {
          dropdownVal = Object.keys(item)[0];
        }
        output.push({
          type: GroupType.ROW,
          operator: not + dropdownVal,
          operand1: loadParameterValue(
            convertStringToInputParameter(not ? item[not][dropdownVal][0] : item[dropdownVal][0], true, true, true)
          ),
          operand2: loadParameterValue(
            convertStringToInputParameter(not ? item[not][dropdownVal][1] : item[dropdownVal][1], true, true, true)
          ),
        });
      } else {
        output.push({ type: GroupType.GROUP, condition: condition, items: recurseConditionalItems(item, condition) });
      }
    });
  }
  return output;
}

// Create Dictionary Editor View Model
function toDictionaryViewModel(value: any): { items: DictionaryEditorItemProps[] | undefined } {
  let items: DictionaryEditorItemProps[] | undefined = [];
  const valueToParse = value !== null ? value ?? {} : value;
  const canParseObject = valueToParse !== null && isObject(valueToParse);

  if (canParseObject) {
    const keys = Object.keys(valueToParse);
    for (const itemKey of keys) {
      items.push({
        id: guid(),
        key: loadParameterValue(convertStringToInputParameter(itemKey)),
        value: loadParameterValue(convertStringToInputParameter(valueToParse[itemKey])),
      });
    }

    if (!keys.length) {
      items.push({ key: [createLiteralValueSegment('')], value: [createLiteralValueSegment('')], id: guid() });
    }
  } else {
    items = undefined;
  }

  return { items };
}

// Create Table Editor View Model
function toTableViewModel(value: any, editorOptions: any): { items: DictionaryEditorItemProps[]; columnMode: ColumnMode } {
  const placeholderItem = { key: [createLiteralValueSegment('')], value: [createLiteralValueSegment('')], id: guid() };
  if (Array.isArray(value)) {
    const keys = editorOptions.columns.keys;
    const items: DictionaryEditorItemProps[] = [];
    for (const item of value) {
      items.push({
        id: guid(),
        key: loadParameterValue(convertStringToInputParameter(item[keys[0]])),
        value: loadParameterValue(convertStringToInputParameter(item[keys[1]])),
      });
    }

    return { items: !value.length ? [placeholderItem] : items, columnMode: ColumnMode.Custom };
  }

  return { items: [placeholderItem], columnMode: ColumnMode.Automatic };
}

// Create Authentication Editor View Model
function toAuthenticationViewModel(value: any): { type: AuthenticationType; authenticationValue: AuthProps } {
  const emptyValue = { type: AuthenticationType.NONE, authenticationValue: {} };

  if (value && isObject(value)) {
    switch (value.type) {
      case AuthenticationType.BASIC:
        return {
          type: value.type,
          authenticationValue: {
            basic: {
              basicUsername: loadParameterValue(convertStringToInputParameter(value.username)),
              basicPassword: loadParameterValue(convertStringToInputParameter(value.password)),
            },
          },
        };
      case AuthenticationType.CERTIFICATE:
        return {
          type: value.type,
          authenticationValue: {
            clientCertificate: {
              clientCertificatePfx: loadParameterValue(convertStringToInputParameter(value.pfx)),
              clientCertificatePassword: loadParameterValue(convertStringToInputParameter(value.password)),
            },
          },
        };

      case AuthenticationType.OAUTH:
        return {
          type: value.type,
          authenticationValue: {
            aadOAuth: {
              oauthTenant: loadParameterValue(convertStringToInputParameter(value.tenant)),
              oauthAudience: loadParameterValue(convertStringToInputParameter(value.audience)),
              oauthAuthority: loadParameterValue(convertStringToInputParameter(value.authority)),
              oauthClientId: loadParameterValue(convertStringToInputParameter(value.clientId)),
              oauthType: loadOauthType(value),
              oauthTypeSecret: loadParameterValue(convertStringToInputParameter(value.secret)),
              oauthTypeCertificatePfx: loadParameterValue(convertStringToInputParameter(value.pfx)),
              oauthTypeCertificatePassword: loadParameterValue(convertStringToInputParameter(value.password)),
            },
          },
        };

      case AuthenticationType.RAW:
        return {
          type: value.type,
          authenticationValue: {
            raw: {
              rawValue: loadParameterValue(convertStringToInputParameter(value.value)),
            },
          },
        };

      case AuthenticationType.MSI:
        return {
          type: value.type,
          authenticationValue: {
            msi: {
              msiAudience: loadParameterValue(convertStringToInputParameter(value.audience)),
              msiIdentity: value.identity,
            },
          },
        };

      default:
        throw new Error(`Cannot fetch authentication editor details. Invalid authentication type '${value.type}'`);
    }
  }

  return emptyValue;
}

const loadOauthType = (value: any): AuthenticationOAuthType => {
  return value.pfx ? AuthenticationOAuthType.CERTIFICATE : AuthenticationOAuthType.SECRET;
};

// Create FloatingActionMenuOutputs Editor View Model
function toFloatingActionMenuOutputsViewModel(value: any) {
  const clonedValue = clone(value);

  const outputValueSegmentsMap: Record<string, ValueSegment[]> = {};
  const outputValueMap = clonedValue?.additionalProperties?.outputValueMap;
  if (outputValueMap) {
    Object.entries(outputValueMap).forEach(([key, outputValue]) => {
      outputValueSegmentsMap[key] = loadParameterValue(convertStringToInputParameter(outputValue as string));
    });

    // So editor does not need to worry about keeping this in sync with outputValueSegmentsMap
    delete clonedValue.additionalProperties.outputValueMap;
  }

  return {
    schema: clonedValue,
    outputValueSegmentsMap,
  };
}

interface ParameterEditorProps {
  editor?: string;
  editorOptions?: Record<string, any>;
  editorViewModel?: any;
  schema: any;
}

export function shouldIncludeSelfForRepetitionReference(manifest: OperationManifest, parameterName?: string): boolean {
  if (manifest?.properties.repetition?.self) {
    return !parameterName || !(manifest.properties.repetition.self.parametersToExclude ?? []).includes(parameterName);
  }

  return false;
}

export function loadParameterValue(parameter: InputParameter): ValueSegment[] {
  const valueObject = parameter.isNotificationUrl ? `@${constants.HTTP_WEBHOOK_LIST_CALLBACK_URL_NAME}` : parameter.value;

  let valueSegments = convertToValueSegments(valueObject, !parameter.suppressCasting /* shouldUncast */);

  valueSegments = compressSegments(valueSegments);

  for (const segment of valueSegments) {
    ensureExpressionValue(segment);
  }

  return valueSegments;
}

export function compressSegments(segments: ValueSegment[], addInsertAnchorIfNeeded = false): ValueSegment[] {
  const result: ValueSegment[] = [];

  if (!segments || !segments.length) {
    if (addInsertAnchorIfNeeded) {
      result.push(createLiteralValueSegment(''));
    }

    return result;
  }

  let current = segments[0];

  for (let i = 1; i < segments.length; i++) {
    if (isLiteralValueSegment(current) && isLiteralValueSegment(segments[i])) {
      current.value += segments[i].value;
    } else {
      result.push(current);

      // We create empty literals around tokens, so that value insertion is possible
      if (isTokenValueSegment(segments[i]) && !isLiteralValueSegment(current)) {
        result.push(createLiteralValueSegment(''));
      }

      current = segments[i];
    }
  }

  result.push(current);
  return result;
}

export function convertToTokenExpression(value: any): string {
  if (isNullOrUndefined(value)) {
    return '';
  } else if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  } else {
    return value.toString();
  }
}

export function convertToValueSegments(value: any, shouldUncast: boolean): ValueSegment[] {
  try {
    const convertor = new ValueSegmentConvertor({
      shouldUncast,
      rawModeEnabled: true,
    });
    return convertor.convertToValueSegments(value);
  } catch {
    return [createLiteralValueSegment(typeof value === 'string' ? value : JSON.stringify(value, null, 2))];
  }
}

export function getAllInputParameters(nodeInputs: NodeInputs): ParameterInfo[] {
  const { parameterGroups } = nodeInputs;
  return aggregate(Object.keys(parameterGroups).map((groupKey) => parameterGroups[groupKey].parameters));
}

interface Dependency extends DependentParameterInfo {
  actualValue: any;
}

export function shouldUseParameterInGroup(parameter: ParameterInfo, allParameters: ParameterInfo[]): boolean {
  const {
    info: { dependencies },
  } = parameter;

  if (dependencies && equals(dependencies.type, 'visibility')) {
    const dependentParameters = dependencies.parameters.reduce((result: Dependency[], dependentParameter: DependentParameterInfo) => {
      const parameterInfo = allParameters.find((param) => param.parameterName === dependentParameter.name);
      if (parameterInfo) {
        return [...result, { ...dependentParameter, actualValue: parameterValueWithoutCasting(parameterInfo) }];
      }

      return result;
    }, []);

    return dependentParameters.every((dependentParameter) => {
      const { actualValue, values, excludeValues } = dependentParameter;
      const isArray = Array.isArray(actualValue);
      const includesValue = (value: any) => (isArray ? actualValue.includes(value) : actualValue === value);
      if (values) return values.some(includesValue);
      if (excludeValues) return !excludeValues.some(includesValue);
      return false; // Should always have one or the other
    });
  }

  return true;
}

export function ensureExpressionValue(valueSegment: ValueSegment, calculateValue = false): void {
  if (isTokenValueSegment(valueSegment)) {
    // eslint-disable-next-line no-param-reassign
    valueSegment.value = getTokenExpressionValue(valueSegment.token as SegmentToken, calculateValue ? undefined : valueSegment.value);
  }
}

export function getExpressionValueForOutputToken(token: OutputToken, nodeType: string): string | undefined {
  const {
    key,
    name,
    outputInfo: { type: tokenType, actionName, required, arrayDetails, functionArguments },
  } = token;
  let method: string;
  switch (tokenType) {
    case TokenType.PARAMETER:
    case TokenType.VARIABLE:
      return getTokenValueFromToken(tokenType, functionArguments as string[]);

    case TokenType.ITERATIONINDEX:
      return `iterationIndexes(${convertToStringLiteral(actionName as string)})`;

    case TokenType.ITEM:
      if (nodeType.toLowerCase() === constants.NODE.TYPE.FOREACH && key === constants.FOREACH_CURRENT_ITEM_KEY) {
        return `items(${convertToStringLiteral(actionName as string)})`;
      } else {
        let propertyPath: string;
        if (
          !name ||
          equals(name, OutputKeys.Queries) ||
          equals(name, OutputKeys.Headers) ||
          equals(name, OutputKeys.Body) ||
          endsWith(name, OutputKeys.Item) ||
          equals(name, OutputKeys.Outputs) ||
          equals(name, OutputKeys.StatusCode) ||
          equals(name, OutputKeys.Name) ||
          equals(name, OutputKeys.Properties) ||
          equals(name, OutputKeys.PathParameters)
        ) {
          propertyPath = '';
        } else {
          propertyPath = convertPathToBracketsFormat(name, !required);
        }
        return `items(${convertToStringLiteral(actionName as string)})${propertyPath}`;
      }

    default:
      method = arrayDetails ? constants.ITEM : getTokenExpressionMethodFromKey(key, actionName);

      return generateExpressionFromKey(method, key, actionName, !!arrayDetails, !!required);
  }
}

export function getTokenExpressionMethodFromKey(key: string, actionName: string | undefined): string {
  const segments = parseEx(key);
  if (segments.length >= 2 && segments[0].value === OutputSource.Body && segments[1].value === '$') {
    return actionName ? `${OutputSource.Body}(${convertToStringLiteral(actionName)})` : constants.TRIGGER_BODY_OUTPUT;
  } else {
    return actionName ? `${constants.OUTPUTS}(${convertToStringLiteral(actionName)})` : constants.TRIGGER_OUTPUTS_OUTPUT;
  }
}

// NOTE: For example, if tokenKey is outputs.$.foo.[*].bar, which means
// the root outputs is an object, and the object has a property foo which is an array.
// Every item in the array has a bar property, and the expression would something like item()?['bar'].
export function generateExpressionFromKey(
  method: string,
  tokenKey: string,
  actionName: string | undefined,
  isInsideArray: boolean,
  required: boolean,
  overrideMethod = true
): string {
  const segments = parseEx(tokenKey);
  segments.shift();
  segments.shift();
  const result = [];
  // NOTE: Use @body for tokens that come from the body path like outputs.$.Body.weather
  let rootMethod = method;
  if (overrideMethod && !isInsideArray && segments[0]?.value?.toString()?.toLowerCase() === OutputSource.Body) {
    segments.shift();
    rootMethod = actionName ? `${OutputSource.Body}(${convertToStringLiteral(actionName)})` : constants.TRIGGER_BODY_OUTPUT;
  }

  while (segments.length) {
    const segment = segments.pop() as Segment;
    if (segment.type === SegmentType.Index) {
      break;
    } else {
      const propertyName = segment.value as string;
      result.push(required ? `[${convertToStringLiteral(propertyName)}]` : `?[${convertToStringLiteral(propertyName)}]`);
    }
  }

  result.push(rootMethod);
  return result.reverse().join('');
}

export function getTokenValueFromToken(tokenType: TokenType, functionArguments: string[]): string | undefined {
  return tokenType === TokenType.PARAMETER
    ? `parameters(${convertToStringLiteral(functionArguments[0])})`
    : tokenType === TokenType.VARIABLE
    ? `variables(${convertToStringLiteral(functionArguments[0])})`
    : undefined;
}

export function getTokenExpressionValue(token: SegmentToken, currentValue?: string): string {
  const { name, arrayDetails, actionName } = token;

  if (isExpressionToken(token) || isParameterToken(token) || isVariableToken(token) || isIterationIndexToken(token)) {
    return currentValue as string;
  } else if (isItemToken(token)) {
    if (currentValue) {
      return currentValue as string;
    } else if (arrayDetails?.loopSource) {
      return `items(${convertToStringLiteral(arrayDetails.loopSource)})`;
    } else if (actionName) {
      return `items(${convertToStringLiteral(actionName)})`;
    } else {
      return `${constants.ITEM}`;
    }
  } else if (isOutputToken(token)) {
    if (currentValue) {
      return currentValue as string;
    } else {
      if (name && equals(name, constants.HTTP_WEBHOOK_LIST_CALLBACK_URL_NAME)) {
        return name;
      } else {
        return getNonOpenApiTokenExpressionValue(token);
      }
    }
  }

  return currentValue as string;
}

function getNonOpenApiTokenExpressionValue(token: SegmentToken): string {
  const { actionName, name, source, required, key, arrayDetails } = token;
  const optional = !isNullOrUndefined(required) && !required;
  let propertyPath: string;

  if (
    !name ||
    equals(name, OutputKeys.Queries) ||
    equals(name, OutputKeys.Headers) ||
    equals(name, OutputKeys.Body) ||
    endsWith(name, OutputKeys.Item) ||
    equals(name, OutputKeys.Outputs) ||
    equals(name, OutputKeys.StatusCode) ||
    equals(name, OutputKeys.Name) ||
    equals(name, OutputKeys.Properties) ||
    equals(name, OutputKeys.PathParameters)
  ) {
    propertyPath = '';
  } else {
    propertyPath = convertPathToBracketsFormat(name, optional);
  }

  // NOTE: If the token is inside array, instead of serialize to the wrong definition, we serialize to item() for now.
  // TODO: Need to have a full story for showing/hiding tokens that represent item().
  if (arrayDetails) {
    if (arrayDetails.loopSource) {
      return `items(${convertToStringLiteral(arrayDetails.loopSource)})${propertyPath}`;
    } else {
      return `${constants.ITEM}${propertyPath}`;
    }
  }

  let expressionValue: string;
  const propertyInQueries = !!source && equals(source, OutputSource.Queries);
  const propertyInHeaders = !!source && equals(source, OutputSource.Headers);
  const propertyInOutputs = !!source && equals(source, OutputSource.Outputs);
  const propertyInStatusCode = !!source && equals(source, OutputSource.StatusCode);

  if (!actionName) {
    if (propertyInQueries) {
      expressionValue = `${constants.TRIGGER_QUERIES_OUTPUT}${propertyPath}`;
    } else if (propertyInHeaders) {
      expressionValue = `${constants.TRIGGER_HEADERS_OUTPUT}${propertyPath}`;
    } else if (propertyInStatusCode) {
      expressionValue = `${constants.TRIGGER_OUTPUTS_OUTPUT}['${constants.OUTPUT_LOCATIONS.STATUS_CODE}']`;
    } else if (propertyInOutputs) {
      if (equals(name, OutputKeys.PathParameters) || includes(key, OutputKeys.PathParameters)) {
        expressionValue = `${constants.TRIGGER_OUTPUTS_OUTPUT}['${constants.OUTPUT_LOCATIONS.RELATIVE_PATH_PARAMETERS}']${propertyPath}`;
      } else {
        expressionValue = `${constants.TRIGGER_OUTPUTS_OUTPUT}${propertyPath}`;
      }
    } else {
      expressionValue = `${constants.TRIGGER_BODY_OUTPUT}${propertyPath}`;
    }
  } else {
    // Note: We escape the characters in step name to convert it to string literal for generating the expression.
    const stepName = convertToStringLiteral(actionName);
    if (propertyInQueries) {
      expressionValue = `${constants.OUTPUTS}(${stepName})['${constants.OUTPUT_LOCATIONS.QUERIES}']${propertyPath}`;
    } else if (propertyInHeaders) {
      expressionValue = `${constants.OUTPUTS}(${stepName})['${constants.OUTPUT_LOCATIONS.HEADERS}']${propertyPath}`;
    } else if (propertyInStatusCode) {
      expressionValue = `${constants.OUTPUTS}(${stepName})['${constants.OUTPUT_LOCATIONS.STATUS_CODE}']`;
    } else if (propertyInOutputs) {
      expressionValue = `${constants.OUTPUTS}(${stepName})${propertyPath}`;
    } else {
      expressionValue = `${constants.OUTPUT_LOCATIONS.BODY}(${stepName})${propertyPath}`;
    }
  }

  return expressionValue;
}

export function convertPathToBracketsFormat(path: string, optional: boolean): string {
  const pathSegments = path.split('.');

  const value = pathSegments
    .map((pathSegment) => {
      const propertyStartsWithOptional = startsWith(pathSegment, '?');
      const pathSegmentValue = propertyStartsWithOptional ? pathSegment.substr(1) : pathSegment;
      const optionalQuestionMark = optional ? '?' : '';
      return `${optionalQuestionMark}[${convertToStringLiteral(decodePropertySegment(pathSegmentValue))}]`;
    })
    .join('');

  return optional && !startsWith(value, '?') ? `?${value}` : value;
}

function getPreservedValue(parameter: InputParameter): any {
  return shouldUseCsvValue(parameter) && Array.isArray(parameter.value)
    ? parameter.value.join(constants.RECURRENCE_TITLE_JOIN_SEPARATOR)
    : parameter.value;
}

function shouldUseCsvValue(parameter: InputParameter): boolean {
  return !!parameter.editorOptions && !!parameter.editorOptions.csvValue;
}

export function loadParameterValuesFromDefault(inputParameters: Record<string, InputParameter>): void {
  for (const indexKey of Object.keys(inputParameters)) {
    const inputParameter = inputParameters[indexKey];
    if (inputParameter.default !== undefined) {
      inputParameter.value = inputParameter.default;
    }
  }
}

export function loadParameterValuesArrayFromDefault(inputParameters: InputParameter[]): void {
  for (const inputParameter of inputParameters) if (inputParameter.default !== undefined) inputParameter.value = inputParameter.default;
}

export function updateParameterWithValues(
  parameterKey: string,
  parameterValue: any,
  parameterLocation: string,
  availableInputParameters: InputParameter[],
  createInvisibleParameter = true,
  useDefault = true
): InputParameter[] {
  const parameters: InputParameter[] = [];
  let inputParameter = first((parameter) => parameter.key === parameterKey, availableInputParameters);

  const clonedParameterValue =
    typeof parameterValue === 'object' && !Array.isArray(parameterValue) ? clone(parameterValue) : parameterValue;

  if (isNullOrUndefined(clonedParameterValue) && useDefault) {
    // assign the default value to input parameter
    parameters.push(...availableInputParameters.map((parameter) => transformInputParameter(parameter, parameter.default)));
  } else {
    if (Array.isArray(clonedParameterValue) && clonedParameterValue.length !== 1 && inputParameter) {
      // if inputParameter type is array, and the value is also array, but it contains more than one item
      // just assign the array value to input directly
      parameters.push(transformInputParameter(inputParameter, clonedParameterValue, /* invisible */ false));
    } else {
      const keySegments = parseEx(parameterKey);
      const descendantInputParameters = availableInputParameters.filter((item) => isAncestorKey(item.key, parameterKey));

      if (descendantInputParameters.length > 0) {
        if (isNullOrUndefined(clonedParameterValue)) {
          parameters.push(
            ...descendantInputParameters.map((parameter) => transformInputParameter(parameter, /* parameterValue */ undefined))
          );
        } else {
          const valueExpandable =
            isObject(clonedParameterValue) || (Array.isArray(clonedParameterValue) && clonedParameterValue.length === 1);
          if (valueExpandable) {
            const dynamicSchemaKeyPrefixes: string[] = [];
            for (const descendantInputParameter of descendantInputParameters) {
              const extraSegments = getExtraSegments(descendantInputParameter.key, parameterKey);
              if (descendantInputParameter.alias) {
                reduceRedundantSegments(extraSegments);
                if (descendantInputParameter.dynamicSchema) {
                  dynamicSchemaKeyPrefixes.push(`${descendantInputParameter.alias}/`);
                }
              }
              const descendantValue = getPropertyValueWithSpecifiedPathSegments(clonedParameterValue, extraSegments);
              let alternativeParameterKeyExtraSegment: Segment[] | null = null;

              if (descendantInputParameter.alternativeKey) {
                alternativeParameterKeyExtraSegment = getExtraSegments(descendantInputParameter.alternativeKey, parameterKey);
                const alternativeParameterKeyDescendantValue = getPropertyValueWithSpecifiedPathSegments(
                  clonedParameterValue,
                  alternativeParameterKeyExtraSegment
                );
                if (alternativeParameterKeyDescendantValue !== descendantValue) {
                  throw new ValidationException(
                    ValidationErrorCode.UNSPECIFIED,
                    format(
                      "The value '{0}' in '{1}' section and value '{2}' in '{3}' section should match.",
                      descendantValue,
                      descendantInputParameter.key.replace('$.', ''),
                      alternativeParameterKeyDescendantValue,
                      descendantInputParameter.alternativeKey.replace('$.', '')
                    )
                  );
                }
              }

              parameters.push(transformInputParameter(descendantInputParameter, descendantValue, /* invisible */ false));
              deletePropertyValueWithSpecifiedPathSegment(clonedParameterValue, extraSegments);
              if (alternativeParameterKeyExtraSegment) {
                deletePropertyValueWithSpecifiedPathSegment(clonedParameterValue, alternativeParameterKeyExtraSegment);
              }
            }

            // for the rest properties, create corresponding invisible parameter to preserve the value when serialize
            if (createInvisibleParameter) {
              for (const restPropertyName of Object.keys(clonedParameterValue)) {
                if (dynamicSchemaKeyPrefixes.some((prefix) => restPropertyName.startsWith(prefix))) {
                  continue;
                }
                const propertyValue = clonedParameterValue[restPropertyName];
                if (propertyValue !== undefined) {
                  const childKeySegments = [...keySegments, { value: restPropertyName, type: SegmentType.Property }];
                  const restInputParameter: ResolvedParameter = {
                    key: createEx(childKeySegments) as string,
                    name: restPropertyName,
                    type: constants.SWAGGER.TYPE.ANY,
                    in: parameterLocation,
                    required: false,
                    isUnknown: true,
                  };

                  parameters.push(transformInputParameter(restInputParameter, propertyValue, /* invisible */ false));
                }
              }
            }
          } else {
            // NOTE: the value is not expandable, we should create a raw input for the specified parameterKey
            // if the input parameter is not exist, then create the corresponding input parameter with specified key
            if (inputParameter) {
              parameters.push(transformInputParameter(inputParameter, clonedParameterValue, /* invisible */ false));
            } else {
              const segments = parseEx(parameterKey);
              const lastSegment = segments[segments.length - 1];
              const required = descendantInputParameters.some((item) => item.required);
              let name: string = lastSegment.value as string;
              let summary = name;

              if (lastSegment.value === '$' && lastSegment.type === SegmentType.Property) {
                name = parameterLocation;
                summary = 'Raw inputs';
              }

              inputParameter = {
                key: parameterKey,
                name,
                type: constants.SWAGGER.TYPE.OBJECT,
                summary,
                in: parameterLocation,
                required,
              };

              parameters.push(transformInputParameter(inputParameter, clonedParameterValue, /* invisible */ false));
            }
          }
        }
      } else {
        let invisible = false;
        if (!inputParameter && createInvisibleParameter) {
          invisible = true;
        }

        if (inputParameter) {
          parameters.push(transformInputParameter(inputParameter, clonedParameterValue, invisible));
        } else {
          const segments = parseEx(parameterKey);
          const lastSegment = segments[segments.length - 1];
          if (
            lastSegment.value === '$' &&
            lastSegment.type === SegmentType.Property &&
            typeof clonedParameterValue === constants.SWAGGER.TYPE.OBJECT &&
            Object.keys(clonedParameterValue).length > 0
          ) {
            // expand the object
            for (const propertyName of Object.keys(clonedParameterValue)) {
              const childInputParameter = {
                key: createEx([...segments, { type: SegmentType.Property, value: propertyName }]) as string,
                name: propertyName,
                type: constants.SWAGGER.TYPE.ANY,
                in: parameterLocation,
                required: false,
              };

              parameters.push(transformInputParameter(childInputParameter, clonedParameterValue[propertyName], invisible));
            }
          } else {
            inputParameter = {
              key: parameterKey,
              name: lastSegment.value as string,
              type: constants.SWAGGER.TYPE.ANY,
              in: parameterLocation,
              required: false,
            };

            parameters.push(transformInputParameter(inputParameter, clonedParameterValue, invisible));
          }
        }
      }
    }
  }

  return parameters;
}

function getPropertyValueWithSpecifiedPathSegments(value: any, segments: Segment[], caseSensitive = false): any {
  if (segments.length === 0) {
    return value;
  }

  if (typeof value !== 'object' && !Array.isArray(value)) {
    return undefined;
  }

  const cloneSegments = [...segments];
  const firstSegment = cloneSegments.shift();
  const propertyName = getAndEscapeSegment(firstSegment as Segment);

  let propertyValue: any;
  if (typeof propertyName === 'string') {
    propertyValue = caseSensitive ? value[propertyName] : getPropertyValue(value, propertyName);
  } else {
    propertyValue = value[propertyName];
  }
  return getPropertyValueWithSpecifiedPathSegments(propertyValue, cloneSegments, caseSensitive);
}

function deletePropertyValueWithSpecifiedPathSegment(value: any, segments: Segment[], caseSensitive = false) {
  let reachEnd = true;
  const cloneSegments = [...segments];
  while (cloneSegments.length > 0) {
    const deleteValue = getPropertyValueWithSpecifiedPathSegments(value, cloneSegments, caseSensitive);
    if (deleteValue === undefined) {
      break;
    }

    const lastSegment = cloneSegments.pop();
    const parentValue = getPropertyValueWithSpecifiedPathSegments(value, cloneSegments, caseSensitive);
    let propertyName = getAndEscapeSegment(lastSegment as Segment);
    if (!caseSensitive && typeof parentValue === 'object' && typeof propertyName === 'string') {
      for (const key of Object.keys(parentValue)) {
        if (equals(key, propertyName)) {
          propertyName = key;
          break;
        }
      }
    }

    if (reachEnd) {
      reachEnd = false;
      delete parentValue[propertyName];
    } else {
      let ableDelete = true;
      if (typeof deleteValue === 'object' && Object.keys(deleteValue).some((key) => deleteValue[key] !== undefined)) {
        ableDelete = false;
      } else if (Array.isArray(deleteValue) && deleteValue.some((item) => item !== undefined)) {
        ableDelete = false;
      }

      if (ableDelete) {
        delete parentValue[propertyName];
      }
    }
  }
}

export function getAndEscapeSegment(segment: Segment): string | number {
  // NOTE: for property segment, return the property name as key; for index segment, return the index value or 0
  switch (segment.type) {
    case SegmentType.Property:
      return tryConvertStringToExpression(decodePropertySegment(segment.value as string));
    case SegmentType.Index:
      return segment.value || 0;
    default:
      return segment.value as string | number;
  }
}

/**
 * Converts the value to a string that will be evaluated to the original value at runtime.
 * @arg {string} value - The value that the returned string will be evaluated to.
 * @return {string}
 */
export function tryConvertStringToExpression(value: string): string {
  if (isTemplateExpression(value)) {
    if (value.charAt(0) === '@') {
      return `@${value}`;
    } else {
      return value.replace(/@{/g, '@@{');
    }
  } else {
    return value;
  }
}

function getExtraSegments(key: string, ancestorKey: string): Segment[] {
  let childSegments: Segment[] = [];
  let startIndex = 0;

  if (key && ancestorKey) {
    childSegments = parseEx(key);
    const ancestorSegments = parseEx(ancestorKey);
    let ancestorStartIndex = 0;
    if (ancestorSegments.length < childSegments.length) {
      for (startIndex = 0; startIndex < childSegments.length; startIndex++) {
        const childSegment = childSegments[startIndex];
        const ancestorSegment = ancestorSegments[ancestorStartIndex];
        if (childSegment.type === SegmentType.Property && childSegment.value === ancestorSegment.value) {
          ancestorStartIndex++;
        }
        if (ancestorStartIndex === ancestorSegments.length) {
          startIndex++;
          break;
        }
      }
    }
  }

  return childSegments.slice(startIndex);
}

function reduceRedundantSegments(segments: Segment[]): void {
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const nextSegment = segments[i + 1];

    // Both segments must be properties and have string values to be reduced.
    if (
      segment.type !== SegmentType.Property ||
      nextSegment.type !== SegmentType.Property ||
      !isString(segment.value) ||
      !isString(nextSegment.value)
    ) {
      continue;
    }

    // Reduce the segments down to one if the next segment starts with the current segment.
    // Example: ['emailMessage', 'emailMessage/To'] should be reduced to ['emailMessage/To'].
    if (nextSegment.value.startsWith(`${segment.value}/`)) {
      segments.splice(i, 1);
      i--;
    }
  }
}

export function transformInputParameter(inputParameter: InputParameter, parameterValue: any, invisible = false): InputParameter {
  return { ...inputParameter, hideInUI: invisible, value: parameterValue };
}

/**
 * Check whether the specified value is compatiable with provided schema
 * @arg {any} value - The specified value.
 * @arg {any} schema - The provided schema. If isArray is true, it is the array's item schema, otherwise, it's the object schema
 * @arg {boolean} isArray - The flag to check for an array value.
 * @arg {boolean} shallowArrayCheck - The flag to indicate whether the checking is shallow check only or dive into property or nested item.
 * @return {boolean} - Return true if the value match the schema, otherwise return false.
 */
export function isArrayOrObjectValueCompatibleWithSchema(value: any, schema: any, isArray: boolean, shallowArrayCheck = false): boolean {
  if (isNullOrUndefined(schema)) {
    return false;
  } else if (isNullOrUndefined(value)) {
    return true;
  }

  if (isArray) {
    if (shallowArrayCheck) {
      return Array.isArray(value);
    } else if (!Array.isArray(value)) {
      return false;
    }
  } else if (typeof value !== 'object') {
    return false;
  } else if (!isArray && !Array.isArray(value) && schema.type === constants.SWAGGER.TYPE.OBJECT && schema.properties === undefined) {
    // NOTE: for schema.additionalProperties as boolean value case, it just ignore the checking and return true.
    if (schema.additionalProperties && schema.additionalProperties.type) {
      return Object.keys(value).every(
        (key) =>
          (typeof value[key] === 'string' && isTemplateExpression(value[key])) ||
          (schema.additionalProperties.type !== 'object' && typeof value[key] === schema.additionalProperties.type) ||
          (schema.additionalProperties.type === 'object' && isObject(value[key])) ||
          (schema.additionalProperties.type === 'array' && Array.isArray(value[key]))
      );
    }

    return true;
  }

  const schemaProcessorOptions: SchemaProcessorOptions = {
    isInputSchema: true,
    expandArrayOutputs: true,
    expandArrayOutputsDepth: constants.MAX_EXPAND_ARRAY_DEPTH,
    excludeAdvanced: false,
    excludeInternal: false,
  };

  let inputs: SchemaProperty[];
  const schemaWithEscapedProperties = { ...schema };

  if (schema.type === constants.SWAGGER.TYPE.ARRAY) {
    if (schema.itemSchema && schema.itemSchema.properties) {
      schemaWithEscapedProperties.itemSchema = {
        ...schemaWithEscapedProperties.itemSchema,
        properties: escapeSchemaProperties(schema.itemSchema.properties),
      };
    }
  } else if (schema.type === constants.SWAGGER.TYPE.OBJECT && schema.properties) {
    schemaWithEscapedProperties.properties = { ...escapeSchemaProperties(schema.properties) };
  }

  try {
    inputs = new SchemaProcessor(schemaProcessorOptions).getSchemaProperties(schemaWithEscapedProperties);
  } catch {
    return false;
  }

  if (isArray) {
    // NOTE: for simple primitive array, check whether the value type is same as the designated type or string type (expression)
    if ((value as any[]).every((item) => typeof item !== 'object')) {
      return inputs.length === 1 && (value as any[]).every((item) => typeof item === inputs[0].type || isTemplateExpression(item));
    }
  }

  const copyValue = isArray ? [...value] : value;
  let isCompatible = true;
  let itemValue = isArray ? copyValue.shift() : copyValue;
  const inputKeys = inputs.map((input) => input.name);
  let itemInput: SchemaProperty | undefined;
  const rootItemKey = createEx([
    { type: SegmentType.Property, value: DefaultKeyPrefix },
    { type: SegmentType.Index, value: undefined },
  ]);
  if (schema.type === constants.SWAGGER.TYPE.ARRAY) {
    itemInput = first((item) => item.key === rootItemKey, inputs);
  }

  while (itemValue && isCompatible) {
    // if itemValue is referring to primitive array
    if (
      itemInput &&
      itemInput.type !== constants.SWAGGER.TYPE.ARRAY &&
      itemInput.type !== constants.SWAGGER.TYPE.OBJECT &&
      !shallowArrayCheck
    ) {
      isCompatible =
        Array.isArray(itemValue) && (itemValue as any[]).every((item) => typeof item === itemInput?.type || typeof item === 'string');
    } else {
      const valueKeys = Object.keys(itemValue).map((key) => encodePropertySegment(key));
      if (valueKeys.length > inputKeys.length) {
        isCompatible = false;
        break;
      }

      for (const valueKey of valueKeys) {
        const propertyValue = itemValue[valueKey];
        const propertySchema =
          schema.type === constants.SWAGGER.TYPE.ARRAY ? schema.items : schema['properties'] && schema['properties'][valueKey];
        // NOTE: if the property value is array or object, check the value/schema compatibility recursively
        if (Array.isArray(propertyValue) && !shallowArrayCheck) {
          if (
            !isArrayOrObjectValueCompatibleWithSchema(
              propertyValue,
              propertySchema && propertySchema.items,
              /* isArray */ true,
              shallowArrayCheck
            )
          ) {
            isCompatible = false;
            break;
          }
          continue;
        } else if (isObject(propertyValue)) {
          if (!isArrayOrObjectValueCompatibleWithSchema(propertyValue, propertySchema, /* isArray */ false, shallowArrayCheck)) {
            isCompatible = false;
            break;
          }
          continue;
        } else if (inputKeys.indexOf(valueKey) < 0) {
          isCompatible = false;
          break;
        }
      }
    }

    itemValue = isArray ? copyValue.shift() : undefined;
  }

  return isCompatible;
}

export async function updateParameterAndDependencies(
  nodeId: string,
  groupId: string,
  parameterId: string,
  properties: Partial<ParameterInfo>,
  isTrigger: boolean,
  operationInfo: NodeOperation,
  connectionReference: ConnectionReference,
  nodeInputs: NodeInputs,
  dependencies: NodeDependencies,
  variables: VariableDeclaration[],
  settings: Settings,
  dispatch: Dispatch,
  rootState: RootState,
  operationDefinition?: any
): Promise<void> {
  const parameter = nodeInputs.parameterGroups[groupId].parameters.find((param) => param.id === parameterId) ?? {};
  const updatedParameter = { ...parameter, ...properties } as ParameterInfo;
  updatedParameter.validationErrors = validateParameter(updatedParameter, updatedParameter.value);
  const propertiesWithValidations = { ...properties, validationErrors: updatedParameter.validationErrors };

  const parametersToUpdate = [
    {
      groupId,
      parameterId,
      propertiesToUpdate: propertiesWithValidations,
    },
  ];
  const payload: UpdateParametersPayload = {
    isUserAction: true,
    nodeId,
    parameters: parametersToUpdate,
  };

  const dependenciesToUpdate = getDependenciesToUpdate(dependencies, parameterId, updatedParameter);
  if (dependenciesToUpdate) {
    payload.dependencies = dependenciesToUpdate;

    const inputDependencies = dependenciesToUpdate.inputs;
    for (const key of Object.keys(inputDependencies)) {
      if (inputDependencies[key].dependencyType === 'ListValues' && inputDependencies[key].dependentParameters[parameterId]) {
        const dependentParameter = nodeInputs.parameterGroups[groupId].parameters.find(
          (param) => param.parameterKey === key
        ) as ParameterInfo;
        payload.parameters.push({
          groupId,
          parameterId: dependentParameter.id,
          propertiesToUpdate: {
            dynamicData: { status: DynamicCallStatus.NOTSTARTED },
            editorOptions: { options: [] },
          },
        });
      }
    }
  }

  dispatch(updateNodeParameters(payload));

  updateNodeMetadataOnParameterUpdate(nodeId, updatedParameter, dispatch);

  if (operationInfo?.type?.toLowerCase() === 'until') {
    validateUntilAction(dispatch, nodeId, groupId, parameterId, nodeInputs.parameterGroups[groupId].parameters, properties);
  }

  if (dependenciesToUpdate) {
    loadDynamicData(
      nodeId,
      isTrigger,
      operationInfo,
      connectionReference,
      dependenciesToUpdate,
      updateNodeInputsWithParameter(nodeInputs, parameterId, groupId, properties),
      settings,
      variables,
      dispatch,
      rootState,
      operationDefinition
    );
  }
}

function updateNodeMetadataOnParameterUpdate(nodeId: string, parameter: ParameterInfo, dispatch: Dispatch): void {
  // Updating action metadata when file picker parameters have different display values than parameter value.
  const { editor, editorViewModel, value } = parameter;
  if (editor === constants.EDITOR.FILEPICKER && value.length === 1 && isLiteralValueSegment(value[0])) {
    if (!!editorViewModel.displayValue && !equals(editorViewModel.displayValue, value[0].value)) {
      dispatch(updateActionMetadata({ id: nodeId, actionMetadata: { [value[0].value]: editorViewModel.displayValue } }));
    }
  }
}

function getDependenciesToUpdate(
  dependencies: NodeDependencies,
  parameterId: string,
  updatedParameter: ParameterInfo
): NodeDependencies | undefined {
  let dependenciesToUpdate: NodeDependencies | undefined;

  // TODO - Add a method to properly validate parameter's value with its type.
  const hasParameterValue = parameterHasValue(updatedParameter);
  const isParameterValidForDynamicCall = parameterValidForDynamicCall(updatedParameter);

  for (const inputKey of Object.keys(dependencies.inputs)) {
    if (dependencies.inputs[inputKey].dependentParameters[parameterId]) {
      if (!dependenciesToUpdate) {
        dependenciesToUpdate = { inputs: {}, outputs: {} };
      }

      dependenciesToUpdate.inputs[inputKey] = clone(dependencies.inputs[inputKey]);
      dependenciesToUpdate.inputs[inputKey].dependentParameters[parameterId].isValid =
        dependencies.inputs[inputKey].dependencyType === 'StaticSchema' ? hasParameterValue : isParameterValidForDynamicCall;
    }
  }

  for (const outputKey of Object.keys(dependencies.outputs)) {
    if (dependencies.outputs[outputKey].dependentParameters[parameterId]) {
      if (!dependenciesToUpdate) {
        dependenciesToUpdate = { inputs: {}, outputs: {} };
      }

      dependenciesToUpdate.outputs[outputKey] = clone(dependencies.outputs[outputKey]);
      dependenciesToUpdate.outputs[outputKey].dependentParameters[parameterId].isValid =
        dependencies.outputs[outputKey].dependencyType === 'StaticSchema' ? hasParameterValue : isParameterValidForDynamicCall;
    }
  }

  return dependenciesToUpdate;
}

export async function updateDynamicDataInNode(
  nodeId: string,
  isTrigger: boolean,
  operationInfo: NodeOperation,
  connectionReference: ConnectionReference | undefined,
  dependencies: NodeDependencies,
  nodeInputs: NodeInputs,
  settings: Settings,
  variables: VariableDeclaration[],
  dispatch: Dispatch,
  getState: () => RootState,
  operationDefinition?: any
): Promise<void> {
  await loadDynamicData(
    nodeId,
    isTrigger,
    operationInfo,
    connectionReference,
    dependencies,
    nodeInputs,
    settings,
    variables,
    dispatch,
    getState(),
    operationDefinition
  );

  const { operations, workflowParameters } = getState();
  for (const parameterKey of Object.keys(operations.dependencies[nodeId]?.inputs ?? {})) {
    const dependencyInfo = operations.dependencies[nodeId].inputs[parameterKey];
    if (dependencyInfo.dependencyType === 'ListValues') {
      const details = getGroupAndParameterFromParameterKey(operations.inputParameters[nodeId] ?? {}, parameterKey);
      if (details) {
        loadDynamicValuesForParameter(
          nodeId,
          details.groupId,
          details.parameter.id,
          operationInfo,
          connectionReference,
          operations.inputParameters[nodeId],
          operations.dependencies[nodeId],
          false /* showErrorWhenNotReady */,
          dispatch,
          /* idReplacements */ undefined,
          workflowParameters.definitions
        );
      }
    }
  }
}

async function loadDynamicData(
  nodeId: string,
  isTrigger: boolean,
  operationInfo: NodeOperation,
  connectionReference: ConnectionReference | undefined,
  dependencies: NodeDependencies,
  nodeInputs: NodeInputs,
  settings: Settings,
  variables: VariableDeclaration[],
  dispatch: Dispatch,
  rootState: RootState,
  operationDefinition?: any
): Promise<void> {
  if (Object.keys(dependencies?.outputs ?? {}).length) {
    loadDynamicOutputsInNode(
      nodeId,
      isTrigger,
      operationInfo,
      connectionReference,
      dependencies.outputs,
      nodeInputs,
      settings,
      rootState.workflowParameters.definitions,
      dispatch
    );
  }

  if (Object.keys(dependencies?.inputs ?? {}).length) {
    await loadDynamicContentForInputsInNode(
      nodeId,
      dependencies.inputs,
      operationInfo,
      connectionReference,
      nodeInputs,
      variables,
      dispatch,
      rootState,
      operationDefinition
    );
  }
}

async function loadDynamicContentForInputsInNode(
  nodeId: string,
  inputDependencies: Record<string, DependencyInfo>,
  operationInfo: NodeOperation,
  connectionReference: ConnectionReference | undefined,
  allInputs: NodeInputs,
  variables: VariableDeclaration[],
  dispatch: Dispatch,
  rootState: RootState,
  operationDefinition?: any
): Promise<void> {
  for (const inputKey of Object.keys(inputDependencies)) {
    const info = inputDependencies[inputKey];
    if (info.dependencyType === 'ApiSchema') {
      dispatch(clearDynamicInputs(nodeId));

      if (isDynamicDataReadyToLoad(info)) {
        try {
          const inputSchema = await tryGetInputDynamicSchema(
            nodeId,
            operationInfo,
            info,
            allInputs,
            variables,
            connectionReference,
            rootState.workflowParameters.definitions,
            dispatch
          );
          const allInputParameters = getAllInputParameters(allInputs);

          // In the case of retry policy, it is treated as an input
          // avoid pushing a parameter for it as it is already being
          // handled in the settings store.
          // NOTE: this could be expanded to more settings that are treated as inputs.
          const newOperationDefinition = operationDefinition ? clone(operationDefinition) : operationDefinition;
          if (newOperationDefinition?.inputs?.[PropertyName.RETRYPOLICY]) {
            delete newOperationDefinition.inputs.retryPolicy;
          }

          const allInputKeys = allInputParameters.map((param) => param.parameterKey);
          const schemaInputs = inputSchema
            ? await getDynamicInputsFromSchema(
                inputSchema,
                info.parameter as InputParameter,
                operationInfo,
                allInputKeys,
                newOperationDefinition
              )
            : [];
          const inputParameters = schemaInputs.map((input) => ({
            ...createParameterInfo(input),
            schema: input,
          })) as ParameterInfo[];

          updateTokenMetadataInParameters(nodeId, inputParameters, rootState);

          let swagger: SwaggerParser | undefined = undefined;
          if (!OperationManifestService().isSupported(operationInfo.type, operationInfo.kind)) {
            const { parsedSwagger } = await getConnectorWithSwagger(operationInfo.connectorId);
            swagger = parsedSwagger;
          }

          dispatch(
            addDynamicInputs({ nodeId, groupId: ParameterGroupKeys.DEFAULT, inputs: inputParameters, newInputs: schemaInputs, swagger })
          );
        } catch (error: any) {
          const message = error.message ?? (error.content.message as string);
          const errorMessage = getIntl().formatMessage(
            {
              defaultMessage: `Failed to retrieve dynamic inputs. Error details: ''{message}''`,
              description: 'Error message to show when loading dynamic inputs failed',
            },
            { message }
          );

          dispatch(
            updateErrorDetails({
              id: nodeId,
              errorInfo: { level: ErrorLevel.DynamicInputs, message: errorMessage, error, code: error.code },
            })
          );
        }
      }
    }
  }
}

export async function loadDynamicTreeItemsForParameter(
  nodeId: string,
  groupId: string,
  parameterId: string,
  selectedValue: any | undefined,
  operationInfo: NodeOperation,
  connectionReference: ConnectionReference | undefined,
  nodeInputs: NodeInputs,
  dependencies: NodeDependencies,
  showErrorWhenNotReady: boolean,
  dispatch: Dispatch,
  idReplacements: Record<string, string> = {},
  workflowParameters: Record<string, WorkflowParameterDefinition>
): Promise<void> {
  const groupParameters = nodeInputs.parameterGroups[groupId].parameters;
  const parameter = groupParameters.find((parameter) => parameter.id === parameterId) as ParameterInfo;
  if (!parameter) {
    return;
  }

  const originalEditorOptions = parameter.editorOptions as any;
  const dependencyInfo = dependencies.inputs[parameter.parameterKey];
  if (dependencyInfo) {
    if (isDynamicDataReadyToLoad(dependencyInfo)) {
      dispatch(
        updateNodeParameters({
          nodeId,
          parameters: [
            {
              parameterId,
              groupId,
              propertiesToUpdate: {
                dynamicData: { status: DynamicCallStatus.STARTED },
                editorOptions: { ...originalEditorOptions, items: [] },
              },
            },
          ],
        })
      );

      try {
        const treeItems = await getFolderItems(
          selectedValue,
          dependencyInfo,
          nodeInputs,
          operationInfo,
          connectionReference,
          idReplacements,
          workflowParameters
        );

        dispatch(
          updateNodeParameters({
            nodeId,
            parameters: [
              {
                parameterId,
                groupId,
                propertiesToUpdate: {
                  dynamicData: { status: DynamicCallStatus.SUCCEEDED },
                  editorOptions: { ...originalEditorOptions, items: treeItems },
                },
              },
            ],
          })
        );
      } catch (error) {
        dispatch(
          updateNodeParameters({
            nodeId,
            parameters: [
              {
                parameterId,
                groupId,
                propertiesToUpdate: { dynamicData: { status: DynamicCallStatus.FAILED, error: error as Exception } },
              },
            ],
          })
        );
      }
    } else if (showErrorWhenNotReady) {
      showErrorWhenDependenciesNotReady(nodeId, groupId, parameterId, dependencyInfo, groupParameters, /* isTreeCall */ true, dispatch);
    }
  }
}

export async function loadDynamicValuesForParameter(
  nodeId: string,
  groupId: string,
  parameterId: string,
  operationInfo: NodeOperation,
  connectionReference: ConnectionReference | undefined,
  nodeInputs: NodeInputs,
  dependencies: NodeDependencies,
  showErrorWhenNotReady: boolean,
  dispatch: Dispatch,
  idReplacements: Record<string, string> = {},
  workflowParameters: Record<string, WorkflowParameterDefinition>
): Promise<void> {
  const groupParameters = nodeInputs.parameterGroups[groupId].parameters;
  const parameter = groupParameters.find((parameter) => parameter.id === parameterId) as ParameterInfo;
  if (!parameter) {
    return;
  }

  const dependencyInfo = dependencies.inputs[parameter.parameterKey];
  if (dependencyInfo) {
    if (isDynamicDataReadyToLoad(dependencyInfo)) {
      dispatch(
        updateNodeParameters({
          nodeId,
          parameters: [
            {
              parameterId,
              groupId,
              propertiesToUpdate: { dynamicData: { status: DynamicCallStatus.STARTED }, editorOptions: { options: [] } },
            },
          ],
        })
      );

      try {
        const dynamicValues = await getDynamicValues(
          dependencyInfo,
          nodeInputs,
          operationInfo,
          connectionReference,
          idReplacements,
          workflowParameters
        );

        // Sort Dynamic Values alphabetically ASC
        dynamicValues.sort((currentItem, nextItem) => currentItem.displayName.localeCompare(nextItem.displayName));

        dispatch(
          updateNodeParameters({
            nodeId,
            parameters: [
              {
                parameterId,
                groupId,
                propertiesToUpdate: { dynamicData: { status: DynamicCallStatus.SUCCEEDED }, editorOptions: { options: dynamicValues } },
              },
            ],
          })
        );
      } catch (error: any) {
        dispatch(
          updateNodeParameters({
            nodeId,
            parameters: [
              {
                parameterId,
                groupId,
                propertiesToUpdate: { dynamicData: { status: DynamicCallStatus.FAILED, error: { ...error, message: error.message } } },
              },
            ],
          })
        );
      }
    } else if (showErrorWhenNotReady) {
      showErrorWhenDependenciesNotReady(nodeId, groupId, parameterId, dependencyInfo, groupParameters, /* isTreeCall */ false, dispatch);
    }
  }
}

export function shouldLoadDynamicInputs(nodeInputs: NodeInputs): boolean {
  return nodeInputs.dynamicLoadStatus === DynamicLoadStatus.FAILED || nodeInputs.dynamicLoadStatus === DynamicLoadStatus.NOTSTARTED;
}

export function isDynamicDataReadyToLoad({ dependentParameters }: DependencyInfo): boolean {
  return Object.keys(dependentParameters).every((key) => dependentParameters[key].isValid);
}

async function tryGetInputDynamicSchema(
  nodeId: string,
  operationInfo: NodeOperation,
  dependencyInfo: DependencyInfo,
  allInputs: NodeInputs,
  variables: VariableDeclaration[],
  connectionReference: ConnectionReference | undefined,
  workflowParameters: Record<string, WorkflowParameterDefinition>,
  dispatch: Dispatch
): Promise<OpenAPIV2.SchemaObject | null> {
  try {
    const schema = await getDynamicSchema(
      dependencyInfo,
      allInputs,
      operationInfo,
      connectionReference,
      variables,
      /* idReplacements */ undefined,
      workflowParameters
    );
    return schema;
  } catch (error: any) {
    if (!dependencyInfo.parameter?.required && !(dependencyInfo.parameter as InputParameter).value) {
      throw error;
    }

    const message = error.message as string;
    const errorMessage = getIntl().formatMessage(
      {
        defaultMessage: `Failed to retrieve dynamic inputs. Error details: ''{message}''`,
        description: 'Error message to show when loading dynamic inputs failed',
      },
      { message }
    );

    dispatch(
      updateErrorDetails({
        id: nodeId,
        errorInfo: { level: ErrorLevel.DynamicInputs, message: errorMessage, error, code: error.code },
      })
    );

    // For required parameters empty schema would help user to construct the inputs instead of runtime failures.
    return {};
  }
}

function showErrorWhenDependenciesNotReady(
  nodeId: string,
  groupId: string,
  parameterId: string,
  dependencyInfo: DependencyInfo,
  groupParameters: ParameterInfo[],
  isTreeCall: boolean,
  dispatch: Dispatch
): void {
  const intl = getIntl();
  const invalidParameterNames = Object.keys(dependencyInfo.dependentParameters)
    .filter((key) => !dependencyInfo.dependentParameters[key].isValid)
    .map((id) => groupParameters.find((param) => param.id === id)?.parameterName);

  dispatch(
    updateNodeParameters({
      nodeId,
      parameters: [
        {
          parameterId,
          groupId,
          propertiesToUpdate: {
            dynamicData: {
              error: {
                name: isTreeCall ? 'DynamicTreeFailed' : 'DynamicListFailed',
                message: intl.formatMessage(
                  {
                    defaultMessage: 'Required parameters {parameters} not set or invalid',
                    description: 'Error message to show when required parameters are not set or invalid',
                  },
                  { parameters: `${invalidParameterNames.join(' , ')}` }
                ),
              },
              status: DynamicCallStatus.FAILED,
            },
          },
        },
      ],
    })
  );
}

function getStringifiedValueFromEditorViewModel(parameter: ParameterInfo, isDefinitionValue: boolean): string | undefined {
  const { editor, editorOptions, editorViewModel } = parameter;
  switch (editor?.toLowerCase()) {
    case constants.EDITOR.TABLE:
      if (editorViewModel?.columnMode === ColumnMode.Custom && editorOptions?.columns) {
        const { keys, types } = editorOptions.columns;
        const value: any = [];
        const commonProperties = { supressCasting: parameter.suppressCasting, info: parameter.info };

        // We do not parse here, since the type is string for table columns [assumed currently may change later]
        for (const item of editorViewModel.items) {
          const keyValue = parameterValueToString({ type: types[0], value: item.key, ...commonProperties } as any, isDefinitionValue);
          const valueValue = parameterValueToString({ type: types[1], value: item.value, ...commonProperties } as any, isDefinitionValue);

          if (keyValue || valueValue) {
            value.push({ [keys[0]]: keyValue, [keys[1]]: valueValue });
          }
        }

        return JSON.stringify(value);
      }
      return undefined;
    case constants.EDITOR.CONDITION:
      return editorOptions?.isOldFormat
        ? iterateSimpleQueryBuilderEditor(editorViewModel.itemValue, editorViewModel.isRowFormat)
        : JSON.stringify(recurseSerializeCondition(parameter, editorViewModel.items, isDefinitionValue));
    case constants.EDITOR.FLOATINGACTIONMENU:
      if (!editorViewModel || editorOptions?.menuKind !== FloatingActionMenuKind.outputs) {
        return undefined;
      }

      return getStringifiedValueFromFloatingActionMenuOutputsViewModel(parameter, editorViewModel);
    default:
      return undefined;
  }
}

const getStringifiedValueFromFloatingActionMenuOutputsViewModel = (
  parameter: ParameterInfo,
  editorViewModel: FloatingActionMenuOutputViewModel
): string | undefined => {
  const value: typeof editorViewModel.schema & { additionalProperties?: { outputValueMap?: Record<string, unknown> } } = clone(
    editorViewModel.schema
  );
  const schemaProperties: typeof editorViewModel.schema.properties = {};
  const outputValueMap: Record<string, unknown> = {};

  // commonProperties is inspired from behavior for Table Editor and Condition Editor.
  // This may need to change if for example we need proper parameter.info.format value per added parameter (instead of re-using parameter.info).
  const commonProperties = { supressCasting: parameter.suppressCasting, info: parameter.info };
  Object.entries(value.properties).forEach(([key, config]) => {
    if (!config?.['x-ms-dynamically-added']) {
      schemaProperties[key] = config;
      return;
    }

    if (config.title) {
      const keyFromTitle = config.title.toLowerCase().replace(' ', '_');
      schemaProperties[keyFromTitle] = config;

      const valueSegments = editorViewModel.outputValueSegmentsMap?.[key];
      if (valueSegments?.length) {
        outputValueMap[keyFromTitle] =
          // We want to transform (for example) "1" to 1, "false" to false, if the dynamically added parameter type is not 'String'
          parameterValueWithoutCasting({ type: config.type, value: valueSegments, ...commonProperties } as any);
      }
    }
  });

  value.properties = schemaProperties;
  (value.additionalProperties ??= {}).outputValueMap = outputValueMap;
  return JSON.stringify(value);
};

const iterateSimpleQueryBuilderEditor = (itemValue: ValueSegment[], isRowFormat: boolean): string | undefined => {
  // if it is in advanced mode, we use loadParameterValue to get the value
  if (!isRowFormat) {
    return undefined;
  }
  // otherwise we iterate through row items and concatenate the values
  let stringValue = '';
  itemValue.forEach((segment) => {
    stringValue += segment.value;
  });
  return stringValue;
};

export const recurseSerializeCondition = (
  parameter: ParameterInfo,
  editorViewModel: any,
  isDefinitionValue: boolean,
  errors?: string[]
): any => {
  const returnVal: any = {};
  const commonProperties = { supressCasting: parameter.suppressCasting, info: parameter.info };
  if (editorViewModel.type === GroupType.ROW) {
    let not = false;
    let { operator } = editorViewModel;
    const { operand1, operand2 } = editorViewModel;
    if (operator.slice(0, 3) === 'not') {
      operator = operator.slice(3);
      not = true;
    }
    if (!operator) {
      operator = RowDropdownOptions.EQUALS;
    }

    const operand1String = parameterValueToString({ type: 'any', value: operand1, ...commonProperties } as any, isDefinitionValue);
    const operand2String = parameterValueToString({ type: 'any', value: operand2, ...commonProperties } as any, isDefinitionValue);
    if (errors && errors.length === 0 && (operand1String || operand2String)) {
      if (!operand1String) {
        errors.push(
          getIntl().formatMessage({
            defaultMessage: 'Enter a valid condition statement.',
            description: 'Error validation message for invalid condition statement',
          })
        );
      }
    }
    const JSONOperand1 = getJSONValueFromString(operand1String, 'any') ?? '';
    const JSONOperand2 = getJSONValueFromString(operand2String, 'any') ?? '';
    if (not) {
      returnVal.not = {};
      returnVal['not'][operator] = [JSONOperand1, JSONOperand2];
    } else {
      returnVal[operator] = [JSONOperand1, JSONOperand2];
    }
  } else {
    let { condition, items } = editorViewModel;
    if (!condition) {
      condition = GroupDropdownOptions.AND;
    }
    if (items.length === 0) {
      items = [
        {
          type: GroupType.ROW,
          operator: RowDropdownOptions.EQUALS,
          operand1: [{ id: guid(), type: ValueSegmentType.LITERAL, value: '' }],
          operand2: [{ id: guid(), type: ValueSegmentType.LITERAL, value: '' }],
        },
      ];
    }
    returnVal[condition] = items.map((item: any) => {
      return recurseSerializeCondition(parameter, item, isDefinitionValue, errors);
    });
  }
  return returnVal;
};

function updateNodeInputsWithParameter(
  nodeInputs: NodeInputs,
  parameterId: string,
  groupId: string,
  properties: Partial<ParameterInfo>
): NodeInputs {
  const inputs = clone(nodeInputs);
  const parameterGroup = inputs.parameterGroups[groupId];
  const index = parameterGroup.parameters.findIndex((parameter) => parameter.id === parameterId);
  if (index > -1) {
    parameterGroup.parameters[index] = { ...parameterGroup.parameters[index], ...properties };
  }

  return inputs;
}

export function getParameterFromName(nodeInputs: NodeInputs, parameterName: string): ParameterInfo | undefined {
  for (const groupId of Object.keys(nodeInputs.parameterGroups)) {
    const parameterGroup = nodeInputs.parameterGroups[groupId];
    const parameter = parameterGroup.parameters.find((parameter) => parameter.parameterName === parameterName);
    if (parameter) {
      return parameter;
    }
  }

  return undefined;
}

export function getParameterFromId(nodeInputs: NodeInputs, parameterId: string): ParameterInfo | undefined {
  for (const groupId of Object.keys(nodeInputs.parameterGroups)) {
    const parameterGroup = nodeInputs.parameterGroups[groupId];
    const parameter = parameterGroup.parameters.find((parameter) => parameter.id === parameterId);
    if (parameter) {
      return parameter;
    }
  }

  return undefined;
}

export function parameterHasValue(parameter: ParameterInfo): boolean {
  const value = parameter.value;

  if (!isUndefinedOrEmptyString(parameter.preservedValue)) {
    return true;
  }

  return !!value && !!value.length && value.some((segment) => !!segment.value);
}

export function parameterValidForDynamicCall(parameter: ParameterInfo): boolean {
  return !parameter.required || parameterHasValue(parameter);
}

export function getGroupAndParameterFromParameterKey(
  nodeInputs: NodeInputs,
  parameterKey: string
): { groupId: string; parameter: ParameterInfo } | undefined {
  for (const groupId of Object.keys(nodeInputs.parameterGroups)) {
    const parameter = nodeInputs.parameterGroups[groupId].parameters.find((param) => param.parameterKey === parameterKey);
    if (parameter) {
      return { groupId, parameter };
    }
  }

  return undefined;
}

export function getInputsValueFromDefinitionForManifest(
  inputsLocation: string[],
  manifest: OperationManifest,
  customSwagger: SwaggerParser | undefined,
  stepDefinition: any,
  allInputs: InputParameter[]
): any {
  let inputsValue = stepDefinition;

  for (const property of inputsLocation) {
    // NOTE: Currently this only supports single item array. Might need to be updated when multiple array support operations are added.
    // None right now in any connectors.
    inputsValue = property === '[*]' ? inputsValue[0] : getPropertyValue(inputsValue, property);
  }

  inputsValue = swapInputsValueIfNeeded(inputsValue, manifest);

  return updateInputsValueForSpecialCases(inputsValue, allInputs, customSwagger);
}

function swapInputsValueIfNeeded(inputsValue: any, manifest: OperationManifest) {
  const swapMap = manifest.properties.inputsLocationSwapMap;
  if (!swapMap?.length) {
    return inputsValue;
  }

  let finalValue = clone(inputsValue);
  let propertiesToRetain: string[] = [];
  for (const { source, target } of swapMap) {
    const propertyValue = getObjectPropertyValue(finalValue, target);
    deleteObjectProperty(finalValue, target);

    // Don't want to use clone on a non-object
    if (typeof propertyValue !== 'object') {
      finalValue = safeSetObjectPropertyValue(finalValue, source, propertyValue);
      continue;
    }

    const value = clone(propertyValue);
    if (!target.length) {
      propertiesToRetain = Object.keys(manifest.properties.inputs.properties);
      deleteObjectProperties(
        value,
        propertiesToRetain.map((key: string) => [key])
      );

      for (const key of Object.keys(finalValue)) {
        if (!propertiesToRetain.includes(key)) {
          deleteObjectProperty(finalValue, [key]);
        }
      }
    }

    finalValue = !source.length ? { ...finalValue, ...value } : safeSetObjectPropertyValue(finalValue, source, value);
  }
  return finalValue;
}

/**
 * This method updates the inputs value when there are special cases for serialization like propertyName
 * serialization or special cases for deserialiation like reading values from inputs for non serializable parameter.
 * Example: Batch trigger
 */
function updateInputsValueForSpecialCases(inputsValue: any, allInputs: InputParameter[], customSwagger?: SwaggerParser) {
  if (!inputsValue || typeof inputsValue !== 'object') {
    return inputsValue;
  }

  const propertyNameParameters = allInputs.filter((input) => !!input.serialization?.property);
  const finalValue = createCopy(inputsValue);

  for (const propertyParameter of propertyNameParameters) {
    const { name, serialization } = propertyParameter;
    if (serialization?.property) {
      const parameterReference = serialization.property.parameterReference as string;

      switch (serialization?.property?.type?.toLowerCase()) {
        case PropertySerializationType.ParentObject:
          const parentPropertyName = parameterReference.substring(0, parameterReference.lastIndexOf('.'));
          const parentPropertySegments = parentPropertyName.split('.');
          const objectValue = getObjectPropertyValue(finalValue, parentPropertySegments);

          // NOTE: Currently this only handles only one variable property name in the object
          const keys = Object.keys(objectValue ?? {});
          if (keys.length !== 1) {
            continue;
          }

          const propertyName = keys[0];

          safeSetObjectPropertyValue(finalValue, parentPropertySegments, {
            [serialization.property.name as string]: {
              ...objectValue[propertyName],
              [name.substring(name.lastIndexOf('.') + 1)]: propertyName,
            },
          });
          break;

        case PropertySerializationType.PathTemplate:
          const parameterLocation = propertyParameter.name.split('.');
          const pathParametersLocation = parameterReference.split('.');
          const uriValue = getObjectPropertyValue(finalValue, parameterLocation);

          if (!uriValue) {
            continue;
          }

          const pathParameters = processPathInputs(uriValue, propertyParameter.default);
          safeSetObjectPropertyValue(finalValue, pathParametersLocation, pathParameters);
          safeSetObjectPropertyValue(finalValue, parameterLocation, propertyParameter.default);
          break;

        default:
          break;
      }
    }
  }

  // NOTE: Deserialization should be processed only after parameters serialization property is processed.
  const parametersWithDeserialization = allInputs.filter((input) => !!input.deserialization);
  for (const parameter of parametersWithDeserialization) {
    const { name, deserialization } = parameter;
    if (deserialization?.parameterReference) {
      const { type, parameterReference, options } = deserialization;
      const propertySegments = parameterReference.split('.');

      switch (type) {
        case DeserializationType.ParentObjectProperties:
          const objectValue = getObjectPropertyValue(finalValue, propertySegments);

          if (isNullOrUndefined(objectValue)) {
            continue;
          }

          const value = Object.keys(objectValue ?? {});
          objectValue[name.split('.').at(-1) as string] = value;
          safeSetObjectPropertyValue(finalValue, propertySegments, objectValue);
          break;

        case DeserializationType.SwaggerOperationId:
          const method = getObjectPropertyValue(finalValue, options?.swaggerOperation.methodPath as string[]);
          const uri = options?.swaggerOperation.uriPath ? getObjectPropertyValue(finalValue, options?.swaggerOperation.uriPath) : undefined;
          const templatePath = options?.swaggerOperation.templatePath
            ? getObjectPropertyValue(finalValue, options?.swaggerOperation.templatePath)
            : undefined;

          if (!method && !uri && !templatePath) {
            continue;
          }

          const operationId = getOperationIdFromDefinition(
            {
              method,
              path: uri
                ? extractPathFromUri(uri, customSwagger?.api.basePath as string)
                : templatePath?.replace(customSwagger?.api.basePath, ''),
            },
            customSwagger as SwaggerParser
          );
          safeSetObjectPropertyValue(finalValue, propertySegments, operationId);
          break;

        default:
          break;
      }
    }
  }

  return finalValue;
}

export function escapeSchemaProperties(schemaProperties: Record<string, any>): Record<string, any> {
  const escapedSchemaProperties: Record<string, any> = {};

  for (const propertyName of Object.keys(schemaProperties)) {
    const escapedPropertyName = tryConvertStringToExpression(propertyName);
    escapedSchemaProperties[escapedPropertyName] = schemaProperties[propertyName];
  }

  return escapedSchemaProperties;
}

export function getNormalizedName(name: string): string {
  if (!name) {
    return name;
  }

  // Replace occurrences of ?[ from the name.
  let normalizedName = name.replace(/\?\[/g, '');

  // Replace occurrences of ?. from the name.
  normalizedName = normalizedName.replace(/\?\./g, '');

  // Replace occurrences of [ ] ' . from the name.
  // eslint-disable-next-line no-useless-escape
  normalizedName = normalizedName.replace(/[\['\]\.]/g, '');

  return normalizedName || name;
}

export function getRepetitionReference(repetitionContext: RepetitionContext, actionName?: string): RepetitionReference | undefined {
  if (actionName) {
    return first((item) => equals(item.actionName, actionName), repetitionContext.repetitionReferences);
  } else {
    return getClosestRepetitionReference(repetitionContext);
  }
}

function getClosestRepetitionReference(repetitionContext: RepetitionContext): RepetitionReference | undefined {
  if (repetitionContext && repetitionContext.repetitionReferences && repetitionContext.repetitionReferences.length) {
    return repetitionContext.repetitionReferences[0];
  }

  return undefined;
}

export function updateTokenMetadataInParameters(nodeId: string, parameters: ParameterInfo[], rootState: RootState): void {
  const {
    workflow: { operations, nodesMetadata },
    operations: { operationMetadata, outputParameters, settings },
    workflowParameters: { definitions },
  } = rootState;
  const triggerNodeId = getTriggerNodeId(rootState.workflow);

  const actionNodes = Object.keys(operations)
    .filter((nodeId) => nodeId !== triggerNodeId)
    .reduce((actionNodes: Record<string, string>, id: string) => ({ ...actionNodes, [id]: id }), {});
  const nodesData = Object.keys(operations).reduce(
    (data: Record<string, Partial<NodeDataWithOperationMetadata>>, id: string) => ({
      ...data,
      [id]: {
        settings: settings[id],
        nodeOutputs: outputParameters[id],
        operationMetadata: operationMetadata[id],
      },
    }),
    {}
  );

  const repetitionContext = rootState.operations.repetitionInfos[nodeId];
  for (const parameter of parameters) {
    const segments = parameter.value;

    if (segments && segments.length) {
      parameter.value = segments.map((segment) => {
        if (isTokenValueSegment(segment)) {
          return updateTokenMetadata(
            segment,
            repetitionContext,
            actionNodes,
            triggerNodeId,
            nodesData,
            operations,
            definitions,
            nodesMetadata,
            parameter.type
          );
        }

        return segment;
      });
    }
    const viewModel = parameter.editorViewModel;
    if (viewModel) {
      flattenAndUpdateViewModel(
        repetitionContext,
        viewModel,
        actionNodes,
        triggerNodeId,
        nodesData,
        operations,
        definitions,
        nodesMetadata,
        parameter.type
      );
    }
  }
}

export const flattenAndUpdateViewModel = (
  repetitionContext: RepetitionContext,
  items: any,
  actionNodes: Record<string, string>,
  triggerNodeId: string,
  nodes: Record<string, Partial<NodeDataWithOperationMetadata>>,
  operations: Actions,
  workflowParameters: Record<string, WorkflowParameter | WorkflowParameterDefinition>,
  nodesMetadata: NodesMetadata,
  parameterType?: string
) => {
  if (!items) return;
  // check if on bottom-most level (array of valueSegments)
  if (Array.isArray(items) && items.every((item) => isValueSegment(item))) {
    return items.map((keyItem: ValueSegment) => {
      if (!isTokenValueSegment(keyItem)) return keyItem;
      const valueSegmentToUpdate = updateTokenMetadata(
        keyItem,
        repetitionContext,
        actionNodes,
        triggerNodeId,
        nodes,
        operations,
        workflowParameters,
        nodesMetadata,
        parameterType
      );
      if (valueSegmentToUpdate) return valueSegmentToUpdate;
      return keyItem;
    }) as ValueSegment[];
  }

  const replacedItems: any = {};
  Object.entries(items).forEach(([itemKey, itemValue]) => {
    if (typeof itemValue === 'object') {
      replacedItems[itemKey] = flattenAndUpdateViewModel(
        repetitionContext,
        itemValue,
        actionNodes,
        triggerNodeId,
        nodes,
        operations,
        workflowParameters,
        nodesMetadata,
        parameterType
      );
    } else {
      replacedItems[itemKey] = itemValue;
    }
  });
  // Keep Array Format and preserve the order of the elements
  return Array.isArray(items)
    ? Object.keys(replacedItems)
        .map(Number)
        .sort((a, b) => a - b)
        .map((key) => replacedItems[key])
    : replacedItems;
};

export function updateTokenMetadata(
  valueSegment: ValueSegment,
  repetitionContext: RepetitionContext,
  actionNodes: Record<string, string>,
  triggerNodeId: string,
  nodes: Record<string, Partial<NodeDataWithOperationMetadata>>,
  operations: Actions,
  workflowParameters: Record<string, WorkflowParameter | WorkflowParameterDefinition>,
  nodesMetadata: NodesMetadata,
  parameterType?: string,
  parameterNodeId?: string
): ValueSegment {
  const token = valueSegment.token as SegmentToken;
  switch (token?.tokenType) {
    case TokenType.VARIABLE:
      token.brandColor = VariableBrandColor;
      token.icon = VariableIcon;
      return valueSegment;
    case TokenType.PARAMETER:
      token.brandColor = ParameterBrandColor;
      token.icon = ParameterIcon;
      token.type = convertWorkflowParameterTypeToSwaggerType(workflowParameters[token.title]?.type);
      return valueSegment;

    case TokenType.FX:
      token.brandColor = FxBrandColor;
      token.icon = FxIcon;
      token.title = getExpressionTokenTitle(token.expression as Expression);
      return valueSegment;

    case TokenType.ITERATIONINDEX:
      // TODO - Need implementation for until
      break;
    default:
      break;
  }

  if (token.arrayDetails && repetitionContext) {
    const repetitionReference = getRepetitionReference(repetitionContext, token.arrayDetails.loopSource);
    const repetitionValue = repetitionReference?.repetitionValue;
    if (repetitionValue) {
      const { step, path, fullPath } = parseForeach(repetitionValue, repetitionContext);
      token.arrayDetails = {
        ...token.arrayDetails,
        parentArrayKey: fullPath,
        parentArrayName: path,
      };
      token.actionName = step;
    }

    if (!token.arrayDetails.loopSource && equals(repetitionReference?.actionType, constants.NODE.TYPE.FOREACH)) {
      token.arrayDetails.loopSource = repetitionReference?.actionName;
    }
  }

  const { actionName, arrayDetails, name } = token;
  const tokenNodeId = actionName ? getPropertyValue(actionNodes, actionName) : triggerNodeId;
  const { settings, nodeOutputs, operationMetadata } = nodes[tokenNodeId] ?? {};
  const tokenNodeOperation = operations[tokenNodeId];
  const nodeType = tokenNodeOperation?.type;
  const isSecure = hasSecureOutputs(nodeType, settings ?? {});
  const nodeOutputInfo = getOutputByTokenInfo(unmap(nodeOutputs?.outputs), valueSegment.token as SegmentToken, parameterType);
  const brandColor = token.tokenType === TokenType.ITEM ? ItemBrandColor : operationMetadata?.brandColor;
  const iconUri = token.tokenType === TokenType.ITEM ? ItemIcon : operationMetadata?.iconUri;

  let outputInsideForeach = false;
  if (parameterNodeId) {
    const nodeParents = getAllParentsForNode(parameterNodeId, nodesMetadata);
    const parentForeachNodeId = getFirstParentOfType(tokenNodeId, constants.NODE.TYPE.FOREACH, nodesMetadata, operations);
    outputInsideForeach = !!parentForeachNodeId && nodeParents.indexOf(parentForeachNodeId) === -1;
  }

  const parentArrayKey = token.arrayDetails?.parentArrayKey;
  const parentArrayKeyForParentArray = parentArrayKey ? getParentArrayKey(parentArrayKey) : undefined;
  const parentArrayOutput = getOutputByTokenInfo(
    unmap(nodeOutputs?.outputs),
    {
      actionName,
      name: getNormalizedName(token.arrayDetails?.parentArrayName ?? ''),
      key: token.arrayDetails?.parentArrayKey,
      source: token.source,
      arrayDetails: parentArrayKeyForParentArray ?? undefined,
    } as SegmentToken,
    constants.SWAGGER.TYPE.ARRAY
  );

  // If we do not get any nodeOutputInfo, we need to check if it is a body parameter or not
  if (!nodeOutputInfo) {
    if (!name) {
      token.title = getKnownTitles(OutputKeys.Body);
    } else if (token.tokenType === TokenType.ITEM) {
      // TODO: Remove this and other parts in this method when the Feature flag (foreach tokens) is removed.
      token.title = 'Current item';
      token.type = constants.SWAGGER.TYPE.ANY;
    } else {
      token.title = getTitleFromTokenName(name, arrayDetails?.parentArrayName ?? '', parentArrayOutput?.title);
    }
  } else {
    if (!nodeOutputInfo.title && name) {
      token.title = getTitleFromTokenName(name, nodeOutputInfo.parentArray as string);
    } else {
      token.title = nodeOutputInfo.title;
    }

    token.key = nodeOutputInfo.key;
    token.type = nodeOutputInfo.type;
    token.format = nodeOutputInfo.format;
    token.name = nodeOutputInfo.name;
    token.schema = nodeOutputInfo.schema;
    token.description = nodeOutputInfo.description;
    token.source = nodeOutputInfo.source;
    token.required = token.required !== undefined ? token.required : nodeOutputInfo.required;

    if (arrayDetails || outputInsideForeach) {
      token.arrayDetails = {
        ...token.arrayDetails,
        parentArrayName: nodeOutputInfo.parentArray,
        itemSchema: nodeOutputInfo.itemSchema,
      };
    }

    if (token.arrayDetails && !!nodeOutputInfo.parentArray && !token.arrayDetails.loopSource) {
      const parentArrayKey = getParentArrayKey(nodeOutputInfo.key);
      token.arrayDetails.parentArrayKey = parentArrayKey;
      if (
        parameterNodeId &&
        parentArrayKey &&
        isForeachActionNameForLoopsource(parameterNodeId, parentArrayKey, nodes, operations, nodesMetadata)
      ) {
        token.arrayDetails.loopSource = actionName;
      }
    }
  }

  token.icon = iconUri;
  token.brandColor = brandColor;
  token.isSecure = isSecure;

  return valueSegment;
}

export function getExpressionTokenTitle(expression: Expression): string {
  switch (expression.type) {
    case ExpressionType.NullLiteral:
    case ExpressionType.BooleanLiteral:
    case ExpressionType.NumberLiteral:
    case ExpressionType.StringLiteral:
      return (expression as ExpressionLiteral).value;
    case ExpressionType.Function:
      // eslint-disable-next-line no-case-declarations
      const functionExpression = expression as ExpressionFunction;
      return `${functionExpression.name}(${functionExpression.arguments.length > 0 ? '...' : ''})`;
    default:
      throw new UnsupportedException(`Unsupported expression type ${expression.type}.`);
  }
}

function getOutputByTokenInfo(
  nodeOutputs: OutputInfo[],
  tokenInfo: SegmentToken,
  type = constants.SWAGGER.TYPE.ANY
): OutputInfo | undefined {
  const { name, arrayDetails } = tokenInfo;

  if (!name) {
    return undefined;
  }

  const supportedTypes: string[] = getPropertyValue(constants.TOKENS, type);
  const allOutputs = supportedTypes.map((supportedType) => getOutputsByType(nodeOutputs, supportedType));
  const outputs = aggregate(allOutputs);

  if (!outputs) {
    return undefined;
  }

  const normalizedTokenName = decodePropertySegment(getNormalizedTokenName(name));
  for (const output of outputs) {
    const bothNotInArray = !arrayDetails && !output.isInsideArray;
    const sameArray = isOutputInSameArray(tokenInfo, output);
    const sameName = decodePropertySegment(getNormalizedTokenName(output.name)) === normalizedTokenName;
    // Optional outputs end up getting ? added to their name. This should be stripped out on alias comparison.
    if (sameName && (sameArray || bothNotInArray)) {
      return output;
    }

    if (isOutputToken(tokenInfo)) {
      if (output.key === tokenInfo.key) {
        return output;
      }
    }
  }

  return undefined;
}

function isOutputInSameArray(token: SegmentToken, output: OutputInfo): boolean {
  const { source, arrayDetails } = token;
  if (arrayDetails?.parentArrayName && output.parentArray && output.source !== source) {
    const tokenArray =
      source === OutputSource.Body && output.source === OutputSource.Outputs
        ? arrayDetails.parentArrayName === OutputKeys.Body
          ? 'body'
          : `body.${arrayDetails.parentArrayName}`
        : arrayDetails.parentArrayName;
    const outputArray =
      output.source === OutputSource.Body && source === OutputSource.Outputs
        ? output.parentArray === OutputKeys.Body
          ? 'body'
          : `body.${output.parentArray}`
        : output.parentArray;

    return equals(getNormalizedName(tokenArray), getNormalizedName(outputArray));
  } else {
    return equals(getNormalizedName(arrayDetails?.parentArrayName || ''), getNormalizedName(output.parentArray || ''));
  }
}

function getOutputsByType(allOutputs: OutputInfo[], type = constants.SWAGGER.TYPE.ANY): OutputInfo[] {
  if (type === constants.SWAGGER.TYPE.ANY || type === constants.SWAGGER.TYPE.OBJECT) {
    return allOutputs;
  }

  return allOutputs.filter((output) => {
    return !Array.isArray(output.type) && equals(type, output.type);
  });
}

export function getTitleFromTokenName(tokenName: string, parentArray: string, parentArrayTitle?: string): string {
  if (equals(tokenName, OutputKeys.Body)) {
    return getKnownTitles(OutputKeys.Body);
  } else if (equals(tokenName, OutputKeys.Headers)) {
    return getKnownTitles(OutputKeys.Headers);
  } else if (
    equals(tokenName, OutputKeys.Item) ||
    (!!parentArray && equals(tokenName, `${getNormalizedName(parentArray)}-${OutputKeys.Item}`))
  ) {
    let parentArrayDisplayName = parentArrayTitle;

    if (!parentArrayDisplayName) {
      const parentArrayName = parentArray && parentArray.match(/'(.*?)'/g);
      parentArrayDisplayName = parentArrayName ? parentArrayName.map((property) => property.replace(/'/g, '')).join('.') : undefined;
    }

    const itemToken = getKnownTitles(OutputKeys.Item);
    return parentArrayDisplayName ? format(`{0} - ${itemToken}`, parentArrayDisplayName) : itemToken;
  } else if (equals(tokenName, OutputKeys.Outputs)) {
    return getKnownTitles(OutputKeys.Outputs);
  } else if (equals(tokenName, OutputKeys.StatusCode)) {
    return getKnownTitles(OutputKeys.StatusCode);
  } else if (equals(tokenName, OutputKeys.Queries)) {
    return getKnownTitles(OutputKeys.Queries);
  } else {
    // Remove all the '?' from token name.
    const tokenNameWithoutOptionalOperator = tokenName.replace(/\?/g, '');
    return tokenNameWithoutOptionalOperator
      .split('.')
      .map((segment) => decodePropertySegment(segment))
      .join('.');
  }
}

export function getNormalizedTokenName(tokenName: string): string {
  if (!tokenName) {
    return tokenName;
  }

  // Replace occurences of ? from the tokenName.
  return tokenName.replace(/\?/g, '');
}

export function getRepetitionValue(manifest: OperationManifest, nodeInputs: ParameterInfo[]): any {
  const loopParameter = manifest.properties.repetition?.loopParameter;

  if (loopParameter) {
    const parameter = nodeInputs.find((input) => input.parameterName === loopParameter);
    return parameter ? parameter.value : undefined;
  }

  return undefined;
}

export function getInterpolatedExpression(expression: string, parameterType: string, parameterFormat: string): string {
  if (isUndefinedOrEmptyString(expression)) {
    return expression;
  } else if (parameterType === constants.SWAGGER.TYPE.STRING && parameterFormat !== constants.SWAGGER.FORMAT.BINARY) {
    return `@{${expression}}`;
  } else {
    return `@${expression}`;
  }
}

export function parameterValueToString(
  parameterInfo: ParameterInfo,
  isDefinitionValue: boolean,
  idReplacements?: Record<string, string>
): string | undefined {
  const { value: remappedValue, didRemap } = idReplacements
    ? remapValueSegmentsWithNewIds(parameterInfo.value, idReplacements)
    : { value: parameterInfo.value, didRemap: false };
  const remappedParameterInfo = idReplacements ? { ...parameterInfo, value: remappedValue } : parameterInfo;

  if (didRemap) delete remappedParameterInfo.preservedValue;

  const preservedValue = remappedParameterInfo.preservedValue;
  if (preservedValue !== undefined && isDefinitionValue) {
    switch (typeof preservedValue) {
      case 'string':
        return preservedValue;
      default:
        return JSON.stringify(preservedValue);
    }
  }

  const valueFromEditor = getStringifiedValueFromEditorViewModel(remappedParameterInfo, isDefinitionValue);
  if (valueFromEditor !== undefined) {
    return valueFromEditor;
  }

  const parameter = { ...remappedParameterInfo };
  const isPathParameter = parameter.info.in === ParameterLocations.Path;
  const value = parameter.value.filter((segment) => segment.value !== '');

  if (!value || !value.length) {
    if (isPathParameter && isDefinitionValue) {
      if (parameter.required) {
        return encodePathValueWithFunction("''", parameter.info.encode);
      } else {
        return '';
      }
    } else {
      return parameter.required ? '' : undefined;
    }
  }

  const parameterType = getInferredParameterType(value, parameter.type);
  const parameterFormat = parameter.info.format ?? '';
  const parameterSuppressesCasting = !!remappedParameterInfo.suppressCasting;

  const shouldCast = requiresCast(parameterType, parameterFormat, value, parameterSuppressesCasting);
  if (!isPathParameter && shouldCast) {
    return castParameterValueToString(value, parameterFormat, parameterType);
  }

  if (parameterType === constants.SWAGGER.TYPE.OBJECT || parameterType === constants.SWAGGER.TYPE.ARRAY || isOneOf(parameter.schema)) {
    return parameterValueToJSONString(value, /* applyCasting */ !parameterSuppressesCasting);
  }

  const segmentsAfterCasting = remappedParameterInfo.suppressCasting
    ? value
    : castTokenSegmentsInValue(value, parameterType, parameterFormat);

  // Note: Path parameter values are always enclosed inside encodeComponent function if specified.
  if (isPathParameter && isDefinitionValue) {
    const segmentValues = segmentsAfterCasting.map((segment) => {
      if (!isTokenValueSegment(segment)) {
        return convertToStringLiteral(segment.value);
      } else {
        return segment.value;
      }
    });

    return encodePathValueWithFunction(fold(segmentValues, parameter.type) ?? '', parameter.info.encode);
  }

  const shouldInterpolate = value.length > 1;
  return segmentsAfterCasting
    .map((segment) => {
      let expressionValue = segment.value;
      if (isTokenValueSegment(segment)) {
        if (shouldInterpolate) {
          expressionValue = parameterType === constants.SWAGGER.TYPE.STRING ? `@{${expressionValue}}` : `@${expressionValue}`;
        } else {
          if (!isUndefinedOrEmptyString(expressionValue)) {
            // Note: Token segment should be auto casted using interpolation if token type is
            // non string and referred in a string parameter.
            expressionValue =
              !remappedParameterInfo.suppressCasting && parameterType === 'string' && segment.token?.type !== 'string'
                ? `@{${expressionValue}}`
                : `@${expressionValue}`;
          }
        }
      }

      return expressionValue;
    })
    .join('');
}

export function parameterValueToJSONString(parameterValue: ValueSegment[], applyCasting = true, forValidation = false): string {
  let shouldInterpolate = false,
    parameterValueString = '',
    numberOfDoubleQuotes = 0;
  const rawStringFormat = parameterValueToStringWithoutCasting(parameterValue, forValidation);
  const updatedParameterValue: ValueSegment[] = parameterValue.map((expression) => ({ ...expression }));

  // We return the raw stringified form, if value is not a valid json
  if (!isValidJSONObjectFormat(rawStringFormat) && !isValidJSONArrayFormat(rawStringFormat)) {
    return rawStringFormat;
  }

  for (let i = 0; i < updatedParameterValue.length; i++) {
    const expression = updatedParameterValue[i];
    let tokenExpression: string = expression.value;

    if (isTokenValueSegment(expression)) {
      // Note: Stringify the token expression to escape double quotes and other characters which must be escaped in JSON.
      if (shouldInterpolate) {
        if (applyCasting) {
          tokenExpression = addCastToExpression(
            expression.token?.format ?? '',
            '',
            tokenExpression,
            expression.token?.type,
            constants.SWAGGER.TYPE.STRING
          );
        }

        const stringifiedTokenExpression = JSON.stringify(tokenExpression).slice(1, -1);
        tokenExpression = `@{${stringifiedTokenExpression}}`;
      } else {
        // Add quotes around tokens. Tokens directly after a literal need a leading quote, and those before another literal need an ending quote.
        const lastExpressionWasLiteral = i > 0 && updatedParameterValue[i - 1].type !== ValueSegmentType.TOKEN;
        const nextExpressionIsLiteral =
          i < updatedParameterValue.length - 1 && updatedParameterValue[i + 1].type !== ValueSegmentType.TOKEN;

        const stringifiedTokenExpression = JSON.stringify(tokenExpression).slice(1, -1);
        tokenExpression = `@${stringifiedTokenExpression}`;
        // eslint-disable-next-line no-useless-escape
        tokenExpression = lastExpressionWasLiteral ? `\"${tokenExpression}` : tokenExpression;
        // eslint-disable-next-line no-useless-escape
        tokenExpression = nextExpressionIsLiteral ? `${tokenExpression}\"` : `${tokenExpression}`;
      }

      parameterValueString += tokenExpression;
    } else {
      numberOfDoubleQuotes += (tokenExpression.replace(/\\"/g, '').match(/"/g) || []).length;

      shouldInterpolate = numberOfDoubleQuotes % 2 === 1;
      parameterValueString += expression.value;
    }
  }

  try {
    // This is to validate if this is a valid json, else we return the original raw stringified format to retain user input.
    const jsonValue = JSON.parse(parameterValueString);
    return JSON.stringify(jsonValue);
  } catch {
    return updatedParameterValue.length === 1 && isTokenValueSegment(updatedParameterValue[0]) ? parameterValueString : rawStringFormat;
  }
}

export function parameterValueWithoutCasting(parameter: ParameterInfo): any {
  const stringifiedValue = parameterValueToStringWithoutCasting(parameter.value);
  return getJSONValueFromString(stringifiedValue, parameter.type);
}

export function getJSONValueFromString(value: any, type: string): any {
  const canParse = !isNullOrUndefined(value);
  let parameterValue: any;

  if (canParse) {
    try {
      // The value is already a string. If the type is also a string, don't do any parsing
      if (type !== constants.SWAGGER.TYPE.STRING) {
        parameterValue = JSON.parse(value);
      } else {
        parameterValue = value;
      }
    } catch {
      parameterValue = value;
    }
  }

  return parameterValue;
}

export function remapValueSegmentsWithNewIds(
  segments: ValueSegment[],
  idReplacements: Record<string, string>
): { value: ValueSegment[]; didRemap: boolean } {
  let didRemap = false;
  const value = segments.map((segment) => {
    if (isTokenValueSegment(segment)) {
      const result = remapTokenSegmentValue(segment, idReplacements);
      didRemap = result.didRemap;
      return result.value;
    }

    return segment;
  });

  return { value, didRemap };
}

export function remapTokenSegmentValue(
  segment: ValueSegment,
  idReplacements: Record<string, string>
): { value: ValueSegment; didRemap: boolean } {
  let didRemap = false;
  let newSegment = segment;
  const { actionName, arrayDetails } = segment.token as Token;
  const oldId = isOutputTokenValueSegment(segment) ? (arrayDetails ? arrayDetails?.loopSource : actionName) : '';
  const newId = idReplacements[oldId ?? ''];

  if (oldId && newId) {
    didRemap = true;
    const newValue = segment.value?.replaceAll(`'${oldId}'`, `'${newId}'`);

    newSegment = {
      ...segment,
      value: newValue,
      token: arrayDetails
        ? { ...segment.token, arrayDetails: { ...arrayDetails, loopSource: newId }, value: newValue }
        : { ...segment.token, actionName: newId, value: newValue },
    } as ValueSegment;
  } else if (isFunctionValueSegment(segment)) {
    let newSegmentValue = segment.value;
    for (const id of Object.keys(idReplacements)) {
      if (!didRemap && newSegmentValue?.includes(`'${id}`)) {
        didRemap = true;
      }
      newSegmentValue = newSegmentValue?.replaceAll(`'${id}'`, `'${idReplacements[id]}'`);
    }

    newSegment = { ...segment, value: newSegmentValue, token: { ...segment.token, value: newSegmentValue } } as ValueSegment;
  }

  return { value: newSegment, didRemap };
}

/**
 * @arg {ValueSegment[]} value
 * @arg {boolean} [forValidation=false]
 * @return {string}
 */
function parameterValueToStringWithoutCasting(value: ValueSegment[], forValidation = false): string {
  const shouldInterpolateTokens = value.length > 1 && value.some(isTokenValueSegment);

  return value
    .map((expression) => {
      let expressionValue = !forValidation ? expression.value : expression.value || null;
      if (isTokenValueSegment(expression)) {
        expressionValue = shouldInterpolateTokens ? `@{${expressionValue}}` : `@${expressionValue}`;
      }

      return expressionValue;
    })
    .join('');
}

function castParameterValueToString(value: ValueSegment[], parameterFormat: string, parameterType: string): string | undefined {
  // In case of only one token or only user entered text, we get the casting function from expression format.
  if (value.length === 1) {
    const [expression] = value;
    const { value: tokenExpression } = expression;
    const isTokenSegment = isTokenValueSegment(expression);
    const uncastExpression = isTokenSegment ? tokenExpression : `'${tokenExpression}'`;
    const valueType = expression.token?.type ?? '';
    const segmentFormat = expression.token?.format ?? '';
    const castExpression = addCastToExpression(segmentFormat, parameterFormat, uncastExpression, valueType, parameterType);

    return getInterpolatedExpression(castExpression, parameterType, parameterFormat);
  } else {
    // TODO: We might need to revisit adding encodeURIComponent if path parameters contains format
    return addFoldingCastToExpression(parameterFormat, value, parameterType, parameterFormat);
  }
}

function castTokenSegmentsInValue(parameterValue: ValueSegment[], parameterType: string, parameterFormat: string): ValueSegment[] {
  return parameterValue.map((segment) => {
    const newSegment = { ...segment };
    const segmentValue = newSegment.value;

    if (isOutputTokenValueSegment(segment)) {
      newSegment.value = addCastToExpression(
        segment.token?.format ?? '',
        parameterFormat,
        segmentValue,
        segment.token?.type,
        parameterType
      );
    }

    return newSegment;
  });
}

function requiresCast(
  parameterType: string,
  parameterFormat: string,
  parameterValue: ValueSegment[],
  parameterSuppressesCasting: boolean
): boolean {
  if (parameterSuppressesCasting) {
    return false;
  }

  const castFormats = [constants.SWAGGER.FORMAT.BINARY, constants.SWAGGER.FORMAT.BYTE, constants.SWAGGER.FORMAT.DATAURI];

  if (castFormats.indexOf(parameterFormat) > -1 || parameterType === constants.SWAGGER.TYPE.FILE) {
    if (parameterValue.length === 1) {
      const firstValueSegment = parameterValue[0];
      if (isFunctionValueSegment(firstValueSegment)) {
        return false;
      }

      return !(
        (parameterFormat === constants.SWAGGER.FORMAT.BINARY || parameterType === constants.SWAGGER.TYPE.FILE) &&
        isLiteralValueSegment(firstValueSegment)
      );
    }

    return true;
  } else if (parameterValue.length === 1) {
    const { token } = parameterValue[0];
    return (
      parameterType === constants.SWAGGER.TYPE.STRING &&
      !parameterFormat &&
      isOutputTokenValueSegment(parameterValue[0]) &&
      token?.type === constants.SWAGGER.TYPE.STRING &&
      token?.format === constants.SWAGGER.FORMAT.BINARY
    );
  }

  return false;
}

function getInferredParameterType(value: ValueSegment[], type: string): string {
  let parameterType = type;

  if (type === constants.SWAGGER.TYPE.ANY || type === undefined) {
    const stringValueWithoutCasting = parameterValueToStringWithoutCasting(value);
    if (isValidJSONObjectFormat(stringValueWithoutCasting)) {
      parameterType = constants.SWAGGER.TYPE.OBJECT;
    } else if (isValidJSONArrayFormat(stringValueWithoutCasting)) {
      parameterType = constants.SWAGGER.TYPE.ARRAY;
    } else if (value.length > 1) {
      // This is the case when there are mix of tokens
      parameterType = constants.SWAGGER.TYPE.STRING;
    }
  }

  return parameterType;
}

function fold(expressions: string[], type: string): string | undefined {
  if (expressions.length === 0) {
    return type === constants.SWAGGER.TYPE.STRING ? '' : undefined;
  } else {
    return expressions.join(',');
  }
}

function isValidJSONObjectFormat(value: string): boolean {
  const parameterValue = (value || '').trim();
  return startsWith(parameterValue, '{') && endsWith(parameterValue, '}');
}

function isValidJSONArrayFormat(value: string): boolean {
  const parameterValue = (value || '').trim();
  return startsWith(parameterValue, '[') && endsWith(parameterValue, ']');
}

/**
 * Encode the path value to the number of times specified in encodeValue
 */
function encodePathValueWithFunction(value: string, encodeValue?: string): string {
  const encodeCount = getEncodeValue(encodeValue ?? '');
  let encodedValue = value;

  if (!isUndefinedOrEmptyString(encodedValue)) {
    for (let i = 0; i < encodeCount; i++) {
      encodedValue = `encodeURIComponent(${encodedValue})`;
    }

    return `@{${encodedValue}}`;
  }

  return '';
}

export function encodePathValue(pathValue: string, encodeCount: number): string {
  let encodedValue = pathValue;

  if (encodedValue) {
    for (let i = 0; i < encodeCount; i++) {
      encodedValue = encodeURIComponent(encodedValue);
    }
  }

  return encodedValue;
}

export function getEncodeValue(value: string): number {
  switch (value.toLowerCase()) {
    case 'double':
      return 2;
    default:
      return 1;
  }
}

export function getArrayTypeForOutputs(parsedSwagger: SwaggerParser, operationId: string): string {
  const outputs = parsedSwagger.getOutputParameters(operationId, { excludeInternalOperations: false });
  const outputKeys = Object.keys(outputs);

  let itemKeyOutputParameter: OutputParameter | undefined = undefined;
  for (const key of outputKeys) {
    const output: OutputParameter = getPropertyValue(outputs, key);
    if (output.name === OutputKeys.Item) {
      itemKeyOutputParameter = output;
      break;
    }
  }

  return itemKeyOutputParameter?.type ?? '';
}

export function isParameterRequired(parameterInfo: ParameterInfo): boolean {
  return parameterInfo && parameterInfo.required && !(parameterInfo.info.parentProperty && parameterInfo.info.parentProperty.optional);
}

export function validateParameter(
  parameter: ParameterInfo,
  parameterValue: ValueSegment[],
  shouldValidateUnknownParameterAsError = false
): string[] {
  const parameterType = getInferredParameterType(parameterValue, parameter.type);
  const parameterValueString = parameterValueToStringWithoutCasting(parameterValue, /* forValidation */ true);
  const isJsonObject = parameterType === constants.SWAGGER.TYPE.OBJECT;

  return isJsonObject
    ? validateJSONParameter(parameter, parameterValue)
    : validateStaticParameterInfo(parameter, parameterValueString, shouldValidateUnknownParameterAsError);
}

// Riley - This is a very specific case where the either of the limit properties can be filled, but they cannot both be empty
// Integrating it with the rest of the validation logic would be unnecessarily complex imo
export function validateUntilAction(
  dispatch: Dispatch,
  nodeId: string,
  groupId: string,
  parameterId: string,
  parameters: ParameterInfo[],
  changedParameter: Partial<ParameterInfo>
) {
  const errorMessage = 'Either limit count or timout must be specified.';

  const countParameter = parameters.find((parameter) => parameter.parameterName === 'limit.count');
  const timeoutParameter = parameters.find((parameter) => parameter.parameterName === 'limit.timeout');

  const countValue = countParameter?.id === parameterId ? changedParameter?.value ?? [] : countParameter?.value ?? [];
  const timeoutValue = timeoutParameter?.id === parameterId ? changedParameter?.value ?? [] : timeoutParameter?.value ?? [];

  if ((countValue.length ?? 0) === 0 && (timeoutValue.length ?? 0) === 0) {
    dispatch(
      updateParameterValidation({
        nodeId,
        groupId,
        parameterId: countParameter?.id ?? '',
        validationErrors: [errorMessage],
      })
    );
    dispatch(
      updateParameterValidation({
        nodeId,
        groupId,
        parameterId: timeoutParameter?.id ?? '',
        validationErrors: [errorMessage],
      })
    );
  } else {
    dispatch(
      removeParameterValidationError({
        nodeId,
        groupId,
        parameterId: countParameter?.id ?? '',
        validationError: errorMessage,
      })
    );
    dispatch(
      removeParameterValidationError({
        nodeId,
        groupId,
        parameterId: timeoutParameter?.id ?? '',
        validationError: errorMessage,
      })
    );
  }
}
