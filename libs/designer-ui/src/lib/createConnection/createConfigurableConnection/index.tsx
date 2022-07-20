import { DefaultButton, Dropdown, Icon, Label, PrimaryButton, TextField, TooltipHost } from '@fluentui/react';
import type { Connector } from '@microsoft-logic-apps/utils';
import type { FormEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

export interface CreateConfigurableConnectionProps {
  connector: Connector;
  isLoading?: boolean;
  createConnectionCallback?: (val: Record<string, string | undefined>) => void;
  cancelCallback?: () => void;
}

export const CreateConfigurableConnection = (props: CreateConfigurableConnectionProps): JSX.Element => {
  const { connector, isLoading, createConnectionCallback, cancelCallback } = props;

  const intl = useIntl();

  const [selectedParamSetIndex, setSelectedParamSetIndex] = useState<number>(0);
  const onDropdownChange = useCallback(
    (_event: FormEvent<HTMLDivElement>, item: any): void => {
      if (item.key !== selectedParamSetIndex) {
        setSelectedParamSetIndex(item.key as number);
        setConfigurationValues({}); // Clear out the config params from previous set
      }
    },
    [selectedParamSetIndex]
  );

  const [connectionName, setConnectionName] = useState<string>('');
  const [configurationValues, setConfigurationValues] = useState<Record<string, string | undefined>>({});

  const singleAuthParams = connector.properties?.connectionParameters;
  const multiAuthParams = connector.properties?.connectionParameterSets?.values[selectedParamSetIndex].parameters;

  const validParams = useMemo(() => {
    return Object.values(singleAuthParams ?? multiAuthParams ?? []).every(
      (parameter) =>
        parameter.uiDefinition?.constraints?.required === 'false' ||
        !!configurationValues[parameter.uiDefinition?.displayName ?? 'UNDEFINED']
    );
  }, [singleAuthParams, multiAuthParams, configurationValues]);
  const canSubmit = !isLoading && !!connectionName && validParams;

  const inputConnectionNameLabel = intl.formatMessage({
    defaultMessage: 'Connection Name',
    description: 'Connection Name',
  });

  const inputConnectionNamePlaceholder = intl.formatMessage({
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

  return (
    <div className="msla-create-connection-container">
      <div className="connection-params-container">
        <div className="param-row">
          <Label className="label" required htmlFor={'connection-name-input'} disabled={isLoading}>
            {inputConnectionNameLabel}
          </Label>
          <TextField
            id={'connection-name-input'}
            className="param-input"
            disabled={isLoading}
            autoComplete="off"
            aria-label={inputConnectionNamePlaceholder}
            placeholder={inputConnectionNamePlaceholder}
            value={connectionName}
            onChange={(e: any, val?: string) => setConnectionName(val ?? '')}
          />
        </div>

        {connector.properties.connectionParameterSets && (
          <div className="param-row">
            <Label className="label" required htmlFor={'connection-param-set-select'} disabled={isLoading}>
              {connector.properties.connectionParameterSets.uiDefinition.displayName}
            </Label>
            <Dropdown
              id="connection-param-set-select"
              className="param-input"
              selectedKey={selectedParamSetIndex}
              onChange={onDropdownChange}
              disabled={isLoading}
              ariaLabel={connector.properties.connectionParameterSets.uiDefinition?.description}
              placeholder={connector.properties.connectionParameterSets.uiDefinition?.description}
              options={connector.properties.connectionParameterSets.values.map((paramSet, index) => ({
                key: index,
                text: paramSet.name,
              }))}
            />
          </div>
        )}

        {/* CONNECTOR PARAMETERS RENDERED HERE */}
        {Object.values(multiAuthParams ?? singleAuthParams ?? [])?.map((parameter) => {
          const data = parameter.uiDefinition;
          const id = data?.displayName ?? 'UNDEFINED';

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
                className="param-input"
                disabled={isLoading}
                autoComplete="off"
                // onNotifyValidationResult
                placeholder={data?.description}
                value={configurationValues[id]}
                onChange={(e: any, newVal?: string) => setConfigurationValues({ ...configurationValues, [id]: newVal })}
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
          onClick={() => createConnectionCallback?.(configurationValues)}
        />
        <DefaultButton disabled={isLoading} text={cancelButtonText} ariaLabel={cancelButtonAria} onClick={cancelCallback} />
      </div>
    </div>
  );
};
