import { filterRecord } from '../utils';
import type { IDropdownOption } from '@fluentui/react';
import { DefaultButton, Dropdown, Icon, Label, PrimaryButton, TextField, TooltipHost } from '@fluentui/react';
import type {
  ConnectionParameter,
  ConnectionParameterAllowedValue,
  ConnectionParameterSet,
  ConnectionParameterSetParameter,
  ConnectionParameterSets,
} from '@microsoft-logic-apps/utils';
import type { FormEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

export interface CreateConnectionProps {
  connectorDisplayName: string;
  connectionParameters?: Record<string, ConnectionParameter>;
  connectionParameterSets?: ConnectionParameterSets;
  isLoading?: boolean;
  createConnectionCallback?: (id: string, selectedParameterSet?: ConnectionParameterSet, parameterValues?: Record<string, any>) => void;
  cancelCallback?: () => void;
}

type ParamType = ConnectionParameter | ConnectionParameterSetParameter;

export const CreateConnection = (props: CreateConnectionProps): JSX.Element => {
  const { connectorDisplayName, connectionParameters, connectionParameterSets, isLoading, createConnectionCallback, cancelCallback } =
    props;

  const intl = useIntl();

  const [selectedParamSetIndex, setSelectedParamSetIndex] = useState<number>(0);
  const onAuthDropdownChange = useCallback(
    (_event: FormEvent<HTMLDivElement>, item: any): void => {
      if (item.key !== selectedParamSetIndex) {
        setSelectedParamSetIndex(item.key as number);
        setParameterValues({}); // Clear out the config params from previous set
      }
    },
    [selectedParamSetIndex]
  );

  const singleAuthParams = connectionParameters;
  const multiAuthParams = useMemo(
    () => connectionParameterSets?.values[selectedParamSetIndex].parameters,
    [connectionParameterSets, selectedParamSetIndex]
  );
  const parameters = useMemo(() => multiAuthParams ?? singleAuthParams ?? {}, [multiAuthParams, singleAuthParams]);

  const [connectionDisplayName, setConnectionDisplayName] = useState<string>('');
  const [parameterValues, setParameterValues] = useState<Record<string, string | undefined>>({});

  const isParamVisible = useCallback(
    (parameter: ParamType) => {
      const data = parameter.uiDefinition;
      if (data?.constraints?.hidden || data?.constraints?.hideInUI) return false;
      const dependencyParam = data?.constraints?.dependentParameter;
      if (dependencyParam && parameterValues[dependencyParam.parameter] !== dependencyParam.value) return false;
      return true;
    },
    [parameterValues]
  );

  const validParams = useMemo(() => {
    return Object.entries(parameters).every(
      ([key, parameter]) =>
        parameter.uiDefinition?.constraints?.required === 'false' || !isParamVisible(parameter) || !!parameterValues[key]
    );
  }, [isParamVisible, parameterValues, parameters]);

  const canSubmit = !isLoading && !!connectionDisplayName && validParams;

  const inputConnectionDisplayNameLabel = intl.formatMessage({
    defaultMessage: 'Connection Name',
    description: 'Connection Name',
  });

  const inputConnectionDisplayNamePlaceholder = intl.formatMessage({
    defaultMessage: 'Enter a name for the connection',
    description: 'Placeholder text for connection name input',
  });

  const createButtonText = intl.formatMessage({
    defaultMessage: 'Create New',
    description: 'Button to add a new connection',
  });

  const createButtonLoadingText = intl.formatMessage({
    defaultMessage: 'Creating...',
    description: 'Button text to show a connection is being created',
  });

  const createButtonAria = intl.formatMessage({
    defaultMessage: 'Create a new connection',
    description: 'aria label description for create button',
  });

  const cancelButtonText = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Button to cancel creating a connection',
  });

  const cancelButtonAria = intl.formatMessage({
    defaultMessage: 'Cancel creating a connection',
    description: 'aria label description for cancel button',
  });

  const componentSimpleDescription = intl.formatMessage(
    {
      defaultMessage: 'Create a connection for {connectorName}.',
      description: 'Create a connection for selected connector',
    },
    {
      connectorName: connectorDisplayName,
    }
  );

  const getVisibleParameterValues = useCallback(() => {
    return filterRecord(parameterValues, ([key]) => !isParamVisible(parameters[key]));
  }, [isParamVisible, parameterValues, parameters]);

  const submitCallback = useCallback(() => {
    return createConnectionCallback?.(
      connectionDisplayName,
      connectionParameterSets?.values[selectedParamSetIndex],
      getVisibleParameterValues()
    );
  }, [createConnectionCallback, connectionDisplayName, connectionParameterSets?.values, selectedParamSetIndex, getVisibleParameterValues]);

  if (Object.keys(singleAuthParams ?? {}).length > 0 || Object.keys(multiAuthParams ?? {}).length > 0) {
    // Configurable connector component
    return (
      <div className="msla-create-connection-container">
        <div className="connection-params-container">
          <div className="param-row">
            <Label className="label" required htmlFor={'connection-display-name-input'} disabled={isLoading}>
              {inputConnectionDisplayNameLabel}
            </Label>
            <TextField
              id={'connection-display-name-input'}
              className="connection-parameter-input"
              disabled={isLoading}
              autoComplete="off"
              aria-label={inputConnectionDisplayNamePlaceholder}
              placeholder={inputConnectionDisplayNamePlaceholder}
              value={connectionDisplayName}
              onChange={(e: any, val?: string) => setConnectionDisplayName(val ?? '')}
            />
          </div>

          {/* Authentication Selection */}
          {Object.keys(multiAuthParams ?? {}).length > 0 && multiAuthParams && (
            <div className="param-row">
              <Label className="label" required htmlFor={'connection-param-set-select'} disabled={isLoading}>
                {connectionParameterSets?.uiDefinition?.displayName}
              </Label>
              <Dropdown
                id="connection-param-set-select"
                className="connection-parameter-input"
                selectedKey={selectedParamSetIndex}
                onChange={onAuthDropdownChange}
                disabled={isLoading}
                ariaLabel={connectionParameterSets?.uiDefinition?.description}
                placeholder={connectionParameterSets?.uiDefinition?.description}
                options={
                  connectionParameterSets?.values.map((paramSet, index) => ({
                    key: index,
                    text: paramSet.uiDefinition?.displayName,
                  })) ?? []
                }
              />
            </div>
          )}

          {/* Connector Parameters */}
          {Object.entries(multiAuthParams ?? singleAuthParams ?? [])?.map(
            ([key, parameter]: [string, ConnectionParameterSetParameter | ConnectionParameter]) => {
              if (!isParamVisible(parameter)) return null;

              const data = parameter.uiDefinition;
              let inputComponent = undefined;
              if ((data?.constraints?.allowedValues?.length ?? 0) > 0) {
                // Dropdown Parameter
                inputComponent = (
                  <Dropdown
                    id={`connection-param-${key}`}
                    className="connection-parameter-input"
                    selectedKey={data?.constraints?.allowedValues?.findIndex((value) => value.text === parameterValues[key])}
                    onChange={(e: any, newVal?: IDropdownOption) => {
                      setParameterValues({ ...parameterValues, [key]: newVal?.text });
                    }}
                    disabled={isLoading}
                    ariaLabel={data?.description}
                    placeholder={data?.description}
                    options={(data?.constraints?.allowedValues ?? []).map((allowedValue: ConnectionParameterAllowedValue, index) => ({
                      key: index,
                      text: allowedValue.text ?? '',
                    }))}
                  />
                );
              } else {
                // Text Input Parameter
                inputComponent = (
                  <TextField
                    id={key}
                    className="connection-parameter-input"
                    disabled={isLoading}
                    autoComplete="off"
                    // onNotifyValidationResult
                    ariaLabel={data?.description}
                    placeholder={data?.description}
                    value={parameterValues[key]}
                    onChange={(e: any, newVal?: string) => setParameterValues({ ...parameterValues, [key]: newVal })}
                  />
                );
              }

              return (
                <div key={key} className="param-row">
                  <Label className="label" required={data?.constraints?.required === 'true'} htmlFor={key} disabled={isLoading}>
                    {data?.displayName}
                    <TooltipHost content={data?.tooltip}>
                      <Icon iconName="Info" style={{ marginLeft: '4px', transform: 'translate(0px, 2px)' }} />
                    </TooltipHost>
                  </Label>
                  {inputComponent}
                </div>
              );
            }
          )}
        </div>

        {/* Action Buttons */}
        <div className="msla-create-connection-actions-container">
          <PrimaryButton
            disabled={!canSubmit}
            text={isLoading ? createButtonLoadingText : createButtonText}
            ariaLabel={createButtonAria}
            onClick={submitCallback}
          />
          <DefaultButton disabled={isLoading} text={cancelButtonText} ariaLabel={cancelButtonAria} onClick={cancelCallback} />
        </div>
      </div>
    );
  } else {
    // Simple connector component
    return (
      <div className="msla-create-connection-container">
        <div>{componentSimpleDescription}</div>

        <div className="msla-create-connection-actions-container">
          <PrimaryButton
            disabled={isLoading}
            text={isLoading ? createButtonLoadingText : createButtonText}
            ariaLabel={createButtonAria}
            onClick={submitCallback}
          />
        </div>
      </div>
    );
  }
};
