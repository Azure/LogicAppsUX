import {
  Capabilities,
  ConnectionParameterTypes,
  ConnectionService,
  equals,
  getPropertyValue,
  isConnectionParameterHidden,
  isServicePrincipalConnectionParameter,
} from '@microsoft/logic-apps-shared';
import type { ParameterType } from './createConnection';

interface ParameterContext {
  legacyManagedIdentitySelected: boolean;
  parameterValues: Record<string, unknown>;
  servicePrincipalSelected: boolean;
}

const hiddenOverrideKeys = {
  TOKEN_CLIENT_ID: 'token:clientId',
  TOKEN_CLIENT_SECRET: 'token:clientSecret',
  TOKEN_TENANT_ID: 'token:tenantId',
} as const;

const parametersWithRequiredDefaultValues = {
  ACS_CONNECTION: 'isAcsConnection',
} as const;

export const connectorOnlySupportsOnPremisesGateway = (connectorCapabilities: string[] | undefined) =>
  (connectorCapabilities?.includes(Capabilities.gateway) && !connectorCapabilities?.includes(Capabilities.cloud)) ?? false;

export const getDefaultParameterValues = (
  allParameters: Record<string, ParameterType>,
  context: Omit<ParameterContext, 'parameterValues'>
): Record<string, unknown> => {
  const parameterValues: Record<string, unknown> = {};

  Object.entries(allParameters).forEach(([k, v]) => {
    if (isParameterVisible(k, v, { ...context, parameterValues: {} })) {
      // If the parameter is visible in the UI, it should not be given a default value.
      return;
    }

    if (!isParameterUsedToCreateConnection(k, v, { ...context, parameterValues: {} })) {
      // If the parameter is not required for the 'create connection' payload, it should not be given a default value.
      return;
    }

    if ('defaultValue' in v) {
      parameterValues[k] = v.defaultValue;
    }
  });

  return parameterValues;
};

export const getTermsOfUseUrl = (termsOfUseUrlString: string | undefined): URL | undefined => {
  if (!termsOfUseUrlString) {
    return undefined;
  }

  try {
    return new URL(termsOfUseUrlString);
  } catch {
    return undefined;
  }
};

export const isHiddenAuthKey = (key: string) => ConnectionService().getAuthSetHideKeys?.()?.includes(key) ?? false;

export const isParameterHiddenInUiBasedOnConstraints = (parameter: ParameterType) =>
  isConnectionParameterHidden(parameter) || equals(parameter.uiDefinition?.constraints?.hideInUI, 'true');

export const isParameterUsedToCreateConnection = (key: string, parameter: ParameterType, context: ParameterContext) => {
  if (isParameterVisible(key, parameter, context)) {
    return true;
  }

  return Object.values(parametersWithRequiredDefaultValues).some((k) => equals(key, k));
};

export const isParameterVisible = (key: string, parameter: ParameterType, context: ParameterContext) => {
  const { legacyManagedIdentitySelected, parameterValues, servicePrincipalSelected } = context;

  if (servicePrincipalSelected) {
    return isServicePrincipalConnectionParameter(key) && isServicePrincipalParameterVisible(key, parameter);
  }

  if (legacyManagedIdentitySelected) {
    // In this case, show parameters only if they are intended for legacy managed connectors. (At the moment, there are none.)
    return false;
  }

  if (isParameterHiddenInUiBasedOnConstraints(parameter)) {
    // Only show visible parameters.
    return false;
  }

  const dependentParam = parameter.uiDefinition?.constraints?.dependentParameter;

  if (dependentParam?.parameter && getPropertyValue(parameterValues, dependentParam.parameter) !== dependentParam.value) {
    return false;
  }

  if (parameter.type === ConnectionParameterTypes.oauthSetting) {
    return false;
  }

  if (parameter.type === ConnectionParameterTypes.managedIdentity) {
    return false;
  }

  return true;
};

const isServicePrincipalParameterVisible = (key: string, parameter: ParameterType): boolean => {
  if (Object.values(hiddenOverrideKeys).some((k) => k.toLowerCase() === key.toLowerCase())) {
    return true;
  }
  return !isParameterHiddenInUiBasedOnConstraints(parameter);
};

export const parseParameterValues = (
  parameterValues: Record<string, unknown>,
  capabilityEnabledParameters: Record<string, ParameterType>
) => {
  const visibleParameterValues = Object.fromEntries(
    Object.entries(parameterValues).filter(([key]) => Object.keys(capabilityEnabledParameters).includes(key)) ?? []
  );
  const additionalParameterValues = Object.fromEntries(
    Object.entries(parameterValues).filter(([key]) => !Object.keys(capabilityEnabledParameters).includes(key)) ?? []
  );

  return {
    visibleParameterValues,
    additionalParameterValues: Object.keys(additionalParameterValues).length ? additionalParameterValues : undefined,
  };
};
