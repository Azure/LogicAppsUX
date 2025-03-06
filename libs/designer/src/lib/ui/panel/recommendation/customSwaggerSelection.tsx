import type { AppDispatch } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import {
  useDiscoveryPanelIsAddingTrigger,
  useDiscoveryPanelIsParallelBranch,
  useDiscoveryPanelRelationshipIds,
} from '../../../core/state/panel/panelSelectors';
import { TextField } from '@fluentui/react';
import { Text, Button } from '@fluentui/react-components';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

interface CustomSwaggerSelectionProps {
  operation: DiscoveryOperation<DiscoveryResultTypes>;
}

export const CustomSwaggerSelection = (props: CustomSwaggerSelectionProps) => {
  const { operation } = props;

  const dispatch = useDispatch<AppDispatch>();

  const intl = useIntl();

  const isTrigger = useDiscoveryPanelIsAddingTrigger();
  const relationshipIds = useDiscoveryPanelRelationshipIds();
  const isParallelBranch = useDiscoveryPanelIsParallelBranch();

  const [swaggerUrl, setSwaggerUrl] = useState('');

  const submitCallback = useCallback(() => {
    const newNodeId = (operation?.properties?.summary ?? operation.name).replaceAll(' ', '_');
    dispatch(
      addOperation({
        operation,
        relationshipIds,
        nodeId: newNodeId,
        isParallelBranch,
        isTrigger,
        presetParameterValues: {
          'metadata.apiDefinitionUrl': swaggerUrl,
          'metadata.swaggerSource': 'custom',
        },
      })
    );
  }, [dispatch, isParallelBranch, isTrigger, operation, relationshipIds, swaggerUrl]);

  const inputLabel = intl.formatMessage({
    defaultMessage: 'Swagger endpoint',
    id: 'dd77ffe12b82',
    description: 'Swagger endpoint input label',
  });

  const inputPlaceholder = intl.formatMessage(
    {
      defaultMessage: 'Example: {url}',
      id: '20731ddd7166',
      description: 'Swagger url input placeholder',
    },
    {
      url: 'https://myapi.azurewebsites.net/swagger/docs/v1',
    }
  );

  const urlErrorMessage = intl.formatMessage({
    defaultMessage: 'Please enter a valid URL',
    id: '78781fa7337a',
    description: 'Swagger url input error message',
  });

  const readyToSubmit = useMemo(() => (swaggerUrl?.length ?? '') > 3, [swaggerUrl]);

  const getErrorMessage = useCallback(
    (value: string) => {
      // if value is not a valid url, return error message
      return !value || !value.startsWith('http') ? urlErrorMessage : '';
    },
    [urlErrorMessage]
  );

  return (
    <div className={'msla-azure-resource-selection'}>
      <div className="msla-flex-row" style={{ justifyContent: 'flex-start' }}>
        <img
          src={operation.properties.api.iconUri}
          alt={operation.properties.api.name}
          style={{ width: '32px', height: '32px', borderRadius: '2px', overflow: 'hidden' }}
        />
        <Text style={{ font: '13px/20px @semibold-font-family' }}>{operation.properties.summary}</Text>
      </div>

      <TextField
        label={inputLabel}
        placeholder={inputPlaceholder}
        value={swaggerUrl}
        type={'url'}
        onChange={(_, value) => setSwaggerUrl(value ?? '')}
        spellCheck={false}
        styles={{ root: { width: '100%' } }}
        onGetErrorMessage={getErrorMessage}
        validateOnLoad={false}
        validateOnFocusOut={true}
      />

      <Button
        disabled={!readyToSubmit}
        onClick={() => {
          if (!readyToSubmit) {
            return;
          }
          submitCallback();
        }}
        appearance="primary"
      >
        {intl.formatMessage({ defaultMessage: 'Add action', id: 'd3f546885fae', description: 'Add action button text' })}
      </Button>
    </div>
  );
};
