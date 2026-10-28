import { useMonitoringView, useReadOnly } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import type { AppDispatch, RootState } from '../../../../core/store';
import { isTriggerNode } from '../../../../core/utils/graph';
import { isConnectionExpressionValid } from '../../../../core/utils/connectors/connectionExpression';
import { createValueSegmentFromToken, getExpressionTokenSections, getOutputTokenSections } from '../../../../core/utils/tokens';
import { isExpressionConnectionMapping, type ConnectionMapping, type ConnectionReferences } from '../../../../common/models/workflow';
import { Body1Strong, Button, Dropdown, Field, Option, Text, makeStyles, tokens, useId } from '@fluentui/react-components';
import { StringEditor, TokenPicker, type ParameterInfo, type ValueSegment } from '@microsoft/designer-ui';
import { equals, getRecordEntry, isServiceProviderOperation } from '@microsoft/logic-apps-shared';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { useConnectionExpressionValue } from './useConnectionExpressionValue';

const useStyles = makeStyles({
  form: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  actions: { display: 'flex', justifyContent: 'center', gap: tokens.spacingHorizontalS },
  editor: { '& .msla-editor-container': { marginTop: tokens.spacingVerticalNone } },
  dropdown: { minWidth: '0', width: '100%' },
  examples: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  exampleList: {
    margin: '0',
    paddingLeft: tokens.spacingHorizontalL,
    maxHeight: '96px',
    overflowY: 'auto',
    overflowWrap: 'anywhere',
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
  },
});

export const useConnectionExpressionEnabled = (nodeIds: string[]) =>
  useSelector(
    (state: RootState) =>
      !state.designerOptions.readOnly &&
      !state.designerOptions.isMonitoringView &&
      !!state.workflow.workflowKind &&
      nodeIds.length === 1 &&
      nodeIds.every(
        (nodeId) =>
          isServiceProviderOperation(getRecordEntry(state.operations.operationInfo, nodeId)?.type) &&
          !isTriggerNode(nodeId, state.workflow.nodesMetadata)
      )
  );

interface ConnectionExpressionSelectionProps {
  nodeId: string;
  mapping: ConnectionMapping[string] | undefined;
  connectorId: string;
  references: ConnectionReferences;
  enabled: boolean;
  onApply: (expression: string, designTimeReferenceKey?: string) => Promise<void>;
  onCancel: () => void;
}

export const ConnectionExpressionSelection = ({
  nodeId,
  mapping,
  connectorId,
  references,
  enabled,
  onApply,
  onCancel,
}: ConnectionExpressionSelectionProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const isReadOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();
  const readOnly = isReadOnly || isMonitoringView;
  const expressionMapping = isExpressionConnectionMapping(mapping) ? mapping : undefined;
  const { value, setValue, expression, editorKey } = useConnectionExpressionValue(nodeId, expressionMapping?.expression ?? '');
  const [designTimeReferenceKey, setDesignTimeReferenceKey] = useState(expressionMapping?.designTimeReferenceKey ?? '');
  const [isApplying, setIsApplying] = useState(false);
  const [applyFailed, setApplyFailed] = useState(false);
  const valid = isConnectionExpressionValid(expression);
  const expressionReadOnly = !!readOnly || !enabled || isApplying;
  const referenceKeys = Object.keys(references).filter((key) => equals(references[key].api.id, connectorId, true));
  const expressionLabelId = useId('connection-expression-label');
  const examplesLabelId = useId('connection-expression-examples');
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
  const noneText = intl.formatMessage({
    defaultMessage: 'None',
    id: 'fPjwey',
    description: 'No design-time connection selected',
  });
  const selectedReferenceKey = referenceKeys.includes(designTimeReferenceKey) ? designTimeReferenceKey : '';

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
    <div className={styles.form}>
      <Body1Strong>
        {intl.formatMessage({
          defaultMessage: 'Use an expression to dynamically select a connection at runtime',
          id: '5H/XCj',
          description: 'Subheading for authoring a runtime connection expression',
        })}
      </Body1Strong>
      <Field
        label={{ children: expressionLabel, id: expressionLabelId }}
        validationState={!valid && !expressionReadOnly ? 'error' : 'none'}
        validationMessage={!valid && !expressionReadOnly ? error : undefined}
      >
        <div className={styles.editor}>
          <ConnectionExpressionEditor
            key={editorKey}
            nodeId={nodeId}
            value={value}
            label={expressionLabel}
            labelId={expressionLabelId}
            readOnly={expressionReadOnly}
            onChange={(newValue) => {
              setValue(newValue);
              setApplyFailed(false);
            }}
          />
        </div>
      </Field>
      {referenceKeys.length > 0 ? (
        <div className={styles.examples}>
          <Text id={examplesLabelId} size={200}>
            {intl.formatMessage({
              defaultMessage: 'Existing connection names (case-sensitive)',
              id: 'J6JRp3',
              description: 'Label for example runtime connection names from the current connector',
            })}
          </Text>
          <ul className={styles.exampleList} aria-labelledby={examplesLabelId}>
            {referenceKeys.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        </div>
      ) : null}
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
        <Dropdown
          className={styles.dropdown}
          disabled={expressionReadOnly}
          value={selectedReferenceKey || noneText}
          selectedOptions={[selectedReferenceKey]}
          onOptionSelect={(_, data) => setDesignTimeReferenceKey(data.optionValue ?? '')}
        >
          <Option value="">{noneText}</Option>
          {referenceKeys.map((key) => (
            <Option key={key} value={key}>
              {key}
            </Option>
          ))}
        </Dropdown>
      </Field>
      {enabled ? null : (
        <Text>
          {intl.formatMessage({
            defaultMessage: 'Connection expression editing is unavailable in this context. The existing expression is preserved.',
            id: 'WfGQga',
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
  );
};

interface ConnectionExpressionEditorProps {
  nodeId: string;
  value: ValueSegment[];
  label: string;
  labelId: string;
  readOnly: boolean;
  onChange: (value: ValueSegment[]) => void;
}

export const ConnectionExpressionEditor = ({ nodeId, value, label, labelId, readOnly, onChange }: ConnectionExpressionEditorProps) => {
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
  );
};
