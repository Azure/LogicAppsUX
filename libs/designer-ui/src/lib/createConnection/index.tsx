import { DefaultButton, Dropdown, Icon, Label, PrimaryButton, TextField, TooltipHost } from '@fluentui/react';
import type { ConnectionParameter, ConnectionParameterSet, ConnectionParameterSets } from '@microsoft-logic-apps/utils';
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

export const CreateConnection = (props: CreateConnectionProps): JSX.Element => {
  const { connectorDisplayName, connectionParameters, connectionParameterSets, isLoading, createConnectionCallback, cancelCallback } =
    props;

  const intl = useIntl();

  const [selectedParamSetIndex, setSelectedParamSetIndex] = useState<number>(0);
  const onDropdownChange = useCallback(
    (_event: FormEvent<HTMLDivElement>, item: any): void => {
      if (item.key !== selectedParamSetIndex) {
        setSelectedParamSetIndex(item.key as number);
        setParameterValues({}); // Clear out the config params from previous set
      }
    },
    [selectedParamSetIndex]
  );

  const [connectionDisplayName, setConnectionDisplayName] = useState<string>('');
  const [parameterValues, setParameterValues] = useState<Record<string, any>>({});

  const singleAuthParams = connectionParameters;
  const multiAuthParams = connectionParameterSets?.values[selectedParamSetIndex].parameters;

  const validParams = useMemo(() => {
    return Object.values(singleAuthParams ?? multiAuthParams ?? []).every(
      (parameter) =>
        parameter.uiDefinition?.constraints?.required === 'false' || !!parameterValues[parameter.uiDefinition?.displayName ?? 'UNDEFINED']
    );
  }, [singleAuthParams, multiAuthParams, parameterValues]);
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

  const submitCallback = useCallback(() => {
    return createConnectionCallback?.(connectionDisplayName, connectionParameterSets?.values[selectedParamSetIndex], parameterValues);
  }, [parameterValues, connectionDisplayName, connectionParameterSets?.values, createConnectionCallback, selectedParamSetIndex]);

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

          {Object.keys(multiAuthParams ?? {}).length > 0 && multiAuthParams && (
            <div className="param-row">
              <Label className="label" required htmlFor={'connection-param-set-select'} disabled={isLoading}>
                {connectionParameterSets.uiDefinition.displayName}
              </Label>
              <Dropdown
                id="connection-param-set-select"
                className="connection-parameter-input"
                selectedKey={selectedParamSetIndex}
                onChange={onDropdownChange}
                disabled={isLoading}
                ariaLabel={connectionParameterSets.uiDefinition?.description}
                placeholder={connectionParameterSets.uiDefinition?.description}
                options={connectionParameterSets.values.map((paramSet, index) => ({
                  key: index,
                  text: paramSet.name,
                }))}
              />
            </div>
          )}

          {/* CONNECTOR PARAMETERS RENDERED HERE */}
          {Object.values(multiAuthParams ?? singleAuthParams ?? [])?.map((parameter) => {
            const data = parameter.uiDefinition;
            const id = data?.displayName;

            if (data?.constraints?.hidden === 'true') return null;

            return (
              <div key={id} className="param-row">
                <Label className="label" required={data?.constraints?.required === 'true'} htmlFor={id} disabled={isLoading}>
                  {data?.displayName}
                  <TooltipHost content={data?.tooltip}>
                    <Icon iconName="Info" style={{ marginLeft: '4px', transform: 'translate(0px, 2px)' }} />
                  </TooltipHost>
                </Label>
                <TextField
                  id={id}
                  className="connection-parameter-input"
                  disabled={isLoading}
                  autoComplete="off"
                  // onNotifyValidationResult
                  placeholder={data?.description}
                  value={parameterValues[id]}
                  onChange={(e: any, newVal?: string) => setParameterValues({ ...parameterValues, [id]: newVal })}
                />
              </div>
            );
          })}
        </div>

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
