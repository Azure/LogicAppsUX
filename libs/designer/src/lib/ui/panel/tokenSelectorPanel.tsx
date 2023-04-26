import constants from '../../common/constants';
import { useTokenSelectorData } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useSelectedNodeId } from '../../core/state/panel/panelSelectors';
import { useOperationInfo } from '../../core/state/selectors/actionMetadataSelector';
import { useNodeMetadata, useReplacedIds } from '../../core/state/workflow/workflowSelectors';
import type { AppDispatch, RootState } from '../../core/store';
import { isRootNodeInGraph } from '../../core/utils/graph';
import { addForeachToNode } from '../../core/utils/loops';
import type { TokenGroup } from '../../core/utils/tokens';
import { createValueSegmentFromToken, getExpressionTokenSections, getOutputTokenSections } from '../../core/utils/tokens';
import { Spinner, SpinnerSize, Panel, PanelType, useTheme, Label, MessageBar, MessageBarType, TextField, Text } from '@fluentui/react';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { Stack } from '@fluentui/react/lib/Stack';
import type { TrackedProperty } from '@microsoft/designer-client-services-logic-apps';
import { PanelLocation, TokenPicker, SettingTokenField } from '@microsoft/designer-ui';
import type {
  ChangeState,
  ValueSegment,
  OutputToken,
  TokenPickerMode,
  CommonPanelProps,
  SettingTokenTextFieldProps,
} from '@microsoft/designer-ui';
import { getPropertyValue } from '@microsoft/utils-logic-apps';
import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export interface FormLabelProps {
  label: string;
  children: React.ReactNode;
  style?: CSSProperties;
}

export const FormLabel = (props: FormLabelProps) => {
  return (
    <Stack style={props.style} horizontal tokens={{ childrenGap: 50 }}>
      <Label className="msla-panel-form-label">{props.label}</Label>
      {props.children}
    </Stack>
  );
};

interface HeaderProps {
  text: string;
}

const Header = (props: HeaderProps) => {
  return <Label className="msla-properties-header-text">{props.text}</Label>;
};

export const TokenSelectorPanel = (props: CommonPanelProps) => {
  const intl = useIntl();
  const intlText = {
    PANEL_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Build an expression for each property.',
      description: 'Panel description',
    }),
    BUSINESS_IDENTIFIER_DESCRIPTION: intl.formatMessage({
      defaultMessage:
        'Entering a value here will update any other business process stages that selected the same Logic App and workflow data source.',
      description: 'Payroll run field description',
    }),
    CONTINUE: intl.formatMessage({
      defaultMessage: 'Continue',
      description: 'The text Continue for button',
    }),
    SELECTED_NODE: intl.formatMessage({
      defaultMessage: 'Selected node',
      description: 'The text for a field label',
    }),
    BUSINESS_IDENTIFIER_TITLE: intl.formatMessage({
      defaultMessage: 'Business identifier',
      description: 'The text Business identifier for header',
    }),
    PROPERTIES: intl.formatMessage({
      defaultMessage: 'Properties',
      description: 'The header text for the token selector section',
    }),
    PROPS_UNDEFINED_ERROR: intl.formatMessage({
      defaultMessage:
        'Token selector properties not found. When using token selector mode, the token selector properties must be provided.',
      description: 'Error message thrown when token selector properties are missing',
    }),
  };

  const selectedNodeId = useSelectedNodeId();
  const tokenSelectorProps = useTokenSelectorData();
  if (!tokenSelectorProps) {
    throw Error(intlText.PROPS_UNDEFINED_ERROR);
  }
  const nodeMetadata = useNodeMetadata(selectedNodeId);
  const { tokenState, workflowParametersState } = useSelector((state: RootState) => ({
    tokenState: state.tokens,
    workflowParametersState: state.workflowParameters,
  }));
  const nodeType = useSelector((state: RootState) => state.operations.operationInfo[selectedNodeId]?.type);
  const trackedProperties = tokenSelectorProps.trackedProperties;
  const [values, setValues] = useState<Record<string, ValueSegment[]>>({});
  const onValuesChanged = useCallback((id: string, newState: ChangeState) => {
    const { value } = newState;
    setValues((prevValues) => ({ ...prevValues, [id]: value }));
  }, []);

  const onContinueClick = useCallback(() => {
    const valueNotFoundError = intl.formatMessage({
      defaultMessage: 'Value is assigned to property that is not found',
      description: 'Error message thrown when a value maps to a property that is not found',
    });

    const updatedProperties: TrackedProperty[] = [];

    Object.keys(values).forEach((key) => {
      // Convert the value segments to a token string.
      // The key should be a property name.
      const property = trackedProperties.find((property) => property.name === key);

      if (!property) {
        throw Error(valueNotFoundError);
      }

      const tokenString = values[key].map((valueSegment) => valueSegment.value).join('@');
      updatedProperties.push({ ...property, token: tokenString ? `@${tokenString}` : '' });
    });
    tokenSelectorProps.onCompleted(updatedProperties);
  }, [values, trackedProperties, intl, tokenSelectorProps]);

  const operationInfo = useOperationInfo(selectedNodeId);

  const replacedIds = useReplacedIds();
  const tokenGroup = useMemo(
    () => getOutputTokenSections(selectedNodeId, nodeType, tokenState, workflowParametersState, replacedIds),
    [nodeType, replacedIds, selectedNodeId, tokenState, workflowParametersState]
  );
  const expressionGroup = getExpressionTokenSections();
  const { isInverted } = useTheme();

  if (!operationInfo && !nodeMetadata?.subgraphType) {
    return (
      <div className="msla-loading-container">
        <Spinner size={SpinnerSize.large} />
      </div>
    );
  }

  return (
    <Panel
      isFooterAtBottom={true}
      type={props.panelLocation === PanelLocation.Right ? PanelType.medium : PanelType.customNear}
      isOpen
      hasCloseButton={false}
      overlayProps={{ isDarkThemed: isInverted }}
      isBlocking={false}
      layerProps={props.layerProps}
      customWidth={props.width}
    >
      <Stack tokens={{ childrenGap: 50 }}>
        <MessageBar styles={{ root: { marginTop: '20px' } }} messageBarType={MessageBarType.info}>
          {intlText.PANEL_DESCRIPTION}
        </MessageBar>
        <Stack.Item>
          <Header text={intlText.SELECTED_NODE} />
          <FormLabel label={intlText.SELECTED_NODE}>
            <TextField
              readOnly
              value={selectedNodeId.replace('_', ' ')}
              style={{ fontWeight: 500 }}
              className="text-field-standard-input"
            />
          </FormLabel>
        </Stack.Item>
        <Stack.Item>
          <Header text={intlText.PROPERTIES} />
          <TokenSelectorSection
            key={selectedNodeId}
            nodeId={selectedNodeId}
            nodeType={nodeType}
            trackedProperties={trackedProperties}
            tokenGroup={tokenGroup}
            expressionGroup={expressionGroup}
            onValuesChanged={onValuesChanged}
          />
        </Stack.Item>
        <Stack.Item>
          <Header text={intlText.BUSINESS_IDENTIFIER_TITLE} />
          <Text>{intlText.BUSINESS_IDENTIFIER_DESCRIPTION}</Text>
          <FormLabel style={{ marginTop: '30px' }} label="Run ID">
            <TextField className="text-field-standard-input" />
          </FormLabel>
        </Stack.Item>
        <PrimaryButton text={intlText.CONTINUE} onClick={() => onContinueClick()} className="primary-button-footer" />
      </Stack>
    </Panel>
  );
};

// TODO (tmauldin): Replace with with callback from props

const TokenSelectorSection = ({
  nodeId,
  nodeType,
  trackedProperties,
  tokenGroup,
  expressionGroup,
  onValuesChanged,
}: {
  nodeId: string;
  nodeType?: string;
  trackedProperties: TrackedProperty[];
  tokenGroup: TokenGroup[];
  expressionGroup: TokenGroup[];
  onValuesChanged: (id: string, newState: ChangeState) => void;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isTrigger } = useSelector((state: RootState) => {
    return {
      isTrigger: isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata),
    };
  });
  const rootState = useSelector((state: RootState) => state);

  const getValueSegmentFromToken = async (
    token: OutputToken,
    addImplicitForeachIfNeeded: boolean,
    parameterId?: string
  ): Promise<ValueSegment> => {
    const { segment, foreachDetails } = await createValueSegmentFromToken(
      nodeId,
      token,
      addImplicitForeachIfNeeded,
      rootState,
      parameterId
    );
    if (foreachDetails) {
      dispatch(addForeachToNode({ arrayName: foreachDetails.arrayValue, nodeId, token }));
    }

    return segment;
  };

  const getTokenPicker = (
    editorId: string,
    labelId: string,
    type: string,
    tokenPickerMode?: TokenPickerMode,
    parameterId?: string,
    closeTokenPicker?: () => void,
    tokenPickerClicked?: (b: boolean) => void,
    tokenClickedCallback?: (token: ValueSegment) => void
  ): JSX.Element => {
    const supportedTypes: string[] = getPropertyValue(constants.TOKENS, type);
    const filteredTokens = tokenGroup.map((group) => ({
      ...group,
      tokens: group.tokens.filter((token) => supportedTypes.includes(token.type)),
    }));

    return (
      <TokenPicker
        editorId={editorId}
        labelId={labelId}
        tokenGroup={filteredTokens}
        expressionGroup={expressionGroup}
        tokenPickerFocused={tokenPickerClicked}
        initialMode={tokenPickerMode}
        getValueSegmentFromToken={(token: OutputToken, addImplicitForeach: boolean) =>
          getValueSegmentFromToken(token, addImplicitForeach, parameterId)
        }
        tokenClickedCallback={tokenClickedCallback}
        closeTokenPicker={closeTokenPicker}
      />
    );
  };

  const fieldProps: SettingTokenTextFieldProps[] = trackedProperties?.map((trackedProperty) => {
    const { name: label, type } = trackedProperty;
    //const placeholder = 'Enter value';

    return {
      label,
      showTokens: true,
      value: [],
      tokenEditor: true,
      isTrigger,
      isCallback: nodeType?.toLowerCase() === constants.NODE.TYPE.HTTP_WEBHOOK,
      getTokenPicker: (
        editorId: string,
        labelId: string,
        tokenPickerMode?: TokenPickerMode,
        closeTokenPicker?: () => void,
        tokenPickerClicked?: (b: boolean) => void,
        tokenClickedCallback?: (token: ValueSegment) => void
      ) => getTokenPicker(editorId, labelId, type, tokenPickerMode, undefined, closeTokenPicker, tokenPickerClicked, tokenClickedCallback),
    };
  });

  return (
    <Stack tokens={{ childrenGap: 25 }}>
      {fieldProps.map((fieldProp, i) => (
        <SettingTokenField
          {...{
            ...fieldProp,
            useFormLabel: true,
          }}
          key={`property-${i}`}
          onValueChange={(newState: ChangeState) => onValuesChanged(fieldProp.label, newState)}
          className="msla-setting-property-editor-container"
        />
      ))}
    </Stack>
  );
};
