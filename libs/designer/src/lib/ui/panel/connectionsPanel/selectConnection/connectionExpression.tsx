import { useHostOptions, useReadOnly } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import type { AppDispatch, RootState } from '../../../../core/store';
import { isTriggerNode } from '../../../../core/utils/graph';
import { isConnectionExpressionValid } from '../../../../core/utils/connectors/connectionExpression';
import { parameterValueToStringWithoutCasting } from '../../../../core/utils/parameters/helper';
import { createValueSegmentFromToken, getExpressionTokenSections, getOutputTokenSections } from '../../../../core/utils/tokens';
import { isExpressionConnectionMapping, type ConnectionMapping, type ConnectionReferences } from '../../../../common/models/workflow';
import { Button, Field, Radio, RadioGroup, Select, Text, makeStyles, tokens, useId } from '@fluentui/react-components';
import { StringEditor, TokenPicker, createLiteralValueSegment, type ParameterInfo, type ValueSegment } from '@microsoft/designer-ui';
import { equals, getRecordEntry, isServiceProviderOperation } from '@microsoft/logic-apps-shared';
import { useMemo, useState, type ReactNode } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  form: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, padding: tokens.spacingHorizontalM },
  actions: { display: 'flex', gap: tokens.spacingHorizontalS },
});

export const useConnectionExpressionEnabled = (nodeIds: string[]) => {
  const hostOptions = useHostOptions();
  return useSelector(
    (state: RootState) =>
      !!hostOptions?.enableServiceProviderConnectionExpressions &&
      !!state.workflow.workflowKind &&
      nodeIds.length === 1 &&
      nodeIds.every(
        (nodeId) =>
          isServiceProviderOperation(getRecordEntry(state.operations.operationInfo, nodeId)?.type) &&
          !isTriggerNode(nodeId, state.workflow.nodesMetadata)
      )
  );
};

interface ConnectionExpressionSelectionProps {
  nodeId: string;
  mapping: ConnectionMapping[string] | undefined;
  connectorId: string;
  references: ConnectionReferences;
  enabled: boolean;
  existingConnections: ReactNode;
  onApply: (expression: string, designTimeReferenceKey?: string) => Promise<void>;
  onCancel: () => void;
}

export const ConnectionExpressionSelection = ({
  nodeId,
  mapping,
  connectorId,
  references,
  enabled,
  existingConnections,
  onApply,
  onCancel,
}: ConnectionExpressionSelectionProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const readOnly = useReadOnly();
  const expressionMapping = isExpressionConnectionMapping(mapping) ? mapping : undefined;
  const [mode, setMode] = useState(expressionMapping ? 'expression' : 'existing');
  const [value, setValue] = useState<ValueSegment[]>(() => [createLiteralValueSegment(expressionMapping?.expression ?? '')]);
  const [designTimeReferenceKey, setDesignTimeReferenceKey] = useState(expressionMapping?.designTimeReferenceKey ?? '');
  const [isApplying, setIsApplying] = useState(false);
  const [applyFailed, setApplyFailed] = useState(false);
  const expression = parameterValueToStringWithoutCasting(value);
  const valid = isConnectionExpressionValid(expression);
  const expressionReadOnly = !!readOnly || !enabled || isApplying;
  const referenceKeys = Object.keys(references).filter((key) => equals(references[key].api.id, connectorId, true));
  const modeLabelId = useId('connection-mode');
  const expressionLabel = intl.formatMessage({
    defaultMessage: 'Connection expression',
    id: 'F6vqih',
    description: 'Label for the runtime connection expression editor',
  });
  const error = intl.formatMessage({
    defaultMessage:
      "Enter a valid workflow expression, for example @parameters('connectionName'). Escaped text starting with @@ is not an expression.",
    id: 'Ndfl+w',
    description: 'Validation error for a runtime connection expression',
  });

  const apply = async () => {
    if (expressionReadOnly || !valid) {
      return;
    }
    setIsApplying(true);
    setApplyFailed(false);
    try {
      await onApply(expression, referenceKeys.includes(designTimeReferenceKey) ? designTimeReferenceKey : undefined);
    } catch {
      setApplyFailed(true);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className={styles.root}>
      <Text id={modeLabelId}>
        {intl.formatMessage({
          defaultMessage: 'Connection mode',
          id: 'Aks6v3',
          description: 'Accessible label for choosing the connection mode',
        })}
      </Text>
      <RadioGroup
        aria-labelledby={modeLabelId}
        value={mode}
        onChange={(_, data) => setMode(data.value)}
        disabled={!!readOnly || isApplying}
      >
        <Radio
          value="existing"
          label={intl.formatMessage({
            defaultMessage: 'Existing connection',
            id: 'TyZznE',
            description: 'Use a concrete existing connection',
          })}
        />
        <Radio
          value="expression"
          disabled={!enabled && !expressionMapping}
          label={intl.formatMessage({
            defaultMessage: 'Use expression',
            id: 'cTRaCf',
            description: 'Choose a connection at runtime using an expression',
          })}
        />
      </RadioGroup>
      {mode === 'existing' ? (
        existingConnections
      ) : (
        <div className={styles.form}>
          <Text>
            {intl.formatMessage({
              defaultMessage: 'The expression selects a connection at runtime. No connection is created by the designer.',
              id: 'w5FZqt',
              description: 'Explains runtime connection expression behavior',
            })}
          </Text>
          <Field
            label={expressionLabel}
            validationState={!valid && !expressionReadOnly ? 'error' : 'none'}
            validationMessage={!valid && !expressionReadOnly ? error : undefined}
          >
            <ConnectionExpressionEditor
              nodeId={nodeId}
              value={value}
              label={expressionLabel}
              readOnly={expressionReadOnly}
              onChange={(newValue) => {
                setValue(newValue);
                setApplyFailed(false);
              }}
            />
          </Field>
          <Field
            label={intl.formatMessage({
              defaultMessage: 'Design-time connection (optional)',
              id: 'nUmNgD',
              description: 'Optional concrete connection used only by the designer',
            })}
            hint={intl.formatMessage({
              defaultMessage:
                'Used only to browse resources and schemas while editing. This is never a runtime fallback and is not saved with the workflow. Without a selection, enter values manually. Schemas can differ between runtime connections.',
              id: 'w19Ytu',
              description: 'Clarifies that the design-time connection is not a runtime fallback',
            })}
          >
            <Select
              disabled={expressionReadOnly}
              value={referenceKeys.includes(designTimeReferenceKey) ? designTimeReferenceKey : ''}
              onChange={(_, data) => setDesignTimeReferenceKey(data.value)}
            >
              <option value="">
                {intl.formatMessage({
                  defaultMessage: 'None',
                  id: 'fPjwey',
                  description: 'No design-time connection selected',
                })}
              </option>
              {referenceKeys.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </Select>
          </Field>
          {enabled ? null : (
            <Text>
              {intl.formatMessage({
                defaultMessage: 'This host does not enable editing connection expressions. The existing expression is preserved.',
                id: '7bEIoW',
                description: 'Imported expression is preserved when expression authoring is disabled',
              })}
            </Text>
          )}
          {applyFailed ? (
            <Text role="alert">
              {intl.formatMessage({
                defaultMessage: 'Connection expression setup did not finish. Check the design-time connection and try again.',
                id: 'Kx/APX',
                description: 'Error applying the connection expression',
              })}
            </Text>
          ) : null}
          <div className={styles.actions}>
            <Button appearance="primary" disabled={expressionReadOnly || !valid} onClick={apply}>
              {intl.formatMessage({ defaultMessage: 'Apply', id: '5sZLU4', description: 'Apply the connection expression' })}
            </Button>
            <Button onClick={onCancel} disabled={isApplying}>
              {intl.formatMessage({ defaultMessage: 'Cancel', id: 'wF7C+h', description: 'Button to cancel a connection' })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

interface ConnectionExpressionEditorProps {
  nodeId: string;
  value: ValueSegment[];
  label: string;
  readOnly: boolean;
  onChange: (value: ValueSegment[]) => void;
}

export const ConnectionExpressionEditor = ({ nodeId, value, label, readOnly, onChange }: ConnectionExpressionEditorProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const state = useSelector((state: RootState) => state);
  const nodeType = getRecordEntry(state.operations.operationInfo, nodeId)?.type ?? '';
  const tokenGroup = useMemo(
    () =>
      getOutputTokenSections(nodeId, nodeType, state.tokens, state.workflowParameters, state.workflow, state.workflow.idReplacements).map(
        (group) => ({
          ...group,
          // Array-property tokens require implicit loop binding. Use explicit items(...) expressions instead.
          tokens: group.tokens.filter((token) => !token.outputInfo.arrayDetails),
        })
      ),
    [nodeId, nodeType, state.tokens, state.workflowParameters, state.workflow]
  );
  const expressionGroup = useMemo(() => getExpressionTokenSections(), []);
  const labelId = useId('connection-expression');
  const parameter: ParameterInfo = {
    id: 'connectionName',
    parameterKey: 'connectionName',
    parameterName: 'connectionName',
    label,
    type: 'string',
    required: true,
    info: {},
    value,
  };
  return (
    <>
      <span id={labelId} hidden>
        {label}
      </span>
      <StringEditor
        initialValue={value}
        ariaLabel={label}
        labelId={labelId}
        readonly={readOnly}
        valueType="string"
        onChange={({ value }) => onChange(value)}
        getTokenPicker={(editorId, pickerLabelId, initialMode, _type, tokenClickedCallback) => (
          <TokenPicker
            editorId={editorId}
            labelId={pickerLabelId}
            initialMode={initialMode}
            tokenGroup={tokenGroup}
            filteredTokenGroup={tokenGroup}
            expressionGroup={expressionGroup}
            parameter={parameter}
            valueType="string"
            tokenClickedCallback={tokenClickedCallback}
            getValueSegmentFromToken={(token) =>
              // A draft connection expression must not insert loops or change workflow metadata.
              createValueSegmentFromToken(nodeId, parameter.id, token, false, false, state, dispatch)
            }
          />
        )}
      />
    </>
  );
};
