import { aggregate, getIntl, getPropertyValue, guid, labelCase } from '@microsoft/logic-apps-shared';
import { Constants } from '../../..';
import { getTriggerNodeId } from '../../../core';
import type { VariableDeclaration } from '../../../core/state/tokens/tokensSlice';
import { useAssertions, useAssertionsValidationErrors } from '../../../core/state/unitTest/unitTestSelectors';
import { addAssertion, updateAssertion, deleteAssertion, updateAssertionExpression } from '../../../core/state/unitTest/unitTestSlice';
import type { AppDispatch, RootState } from '../../../core/store';
import {
  VariableBrandColor,
  VariableIcon,
  generateExpressionFromKey,
  getTokenExpressionMethodFromKey,
  getTokenValueFromToken,
} from '../../../core/utils/parameters/helper';
import { type TokenGroup, getExpressionTokenSections } from '../../../core/utils/tokens';
import { convertVariableTypeToSwaggerType } from '../../../core/utils/variables';
import {
  type AssertionDeleteEvent,
  type AssertionUpdateEvent,
  Assertions,
  type CommonPanelProps,
  type AssertionAddEvent,
  type ValueSegment,
  type OutputToken,
  TokenType,
  ValueSegmentType,
  ConditionExpression,
} from '@microsoft/designer-ui';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const getVariableTokens = (variables: Record<string, VariableDeclaration[]>): OutputToken[] => {
  const vars = aggregate(Object.values(variables));
  return vars.map(({ name, type }) => {
    return {
      key: `variables:${name}`,
      brandColor: VariableBrandColor,
      icon: VariableIcon,
      title: name,
      name,
      type: convertVariableTypeToSwaggerType(type) ?? Constants.SWAGGER.TYPE.ANY,
      isAdvanced: false,
      outputInfo: {
        type: TokenType.VARIABLE,
        functionName: Constants.FUNCTION_NAME.VARIABLES,
        functionArguments: [name],
      },
    };
  });
};

const useTokens = (): { outputTokensWithValues: TokenGroup[]; variableTokens: TokenGroup[]; expressionTokens: TokenGroup[] } => {
  const { outputTokens, variables } = useSelector((state: RootState) => ({
    outputTokens: state.tokens.outputTokens,
    variables: state.tokens.variables,
  }));

  const { workflowState } = useSelector((state: RootState) => ({
    workflowState: state.workflow,
  }));

  const triggerNodeId = workflowState.graph ? getTriggerNodeId(workflowState) : null;

  const variableTokens = useMemo(() => {
    const variableText = getIntl().formatMessage({
      description: 'Heading section for Variable tokens',
      id: 'unMaeV',
      defaultMessage: 'Variables',
    });
    return [
      {
        id: 'variables',
        label: variableText,
        tokens: getVariableTokens(variables).map((token) => {
          const valueExpression = getTokenValueFromToken(token.outputInfo.type, token.outputInfo.functionArguments as string[]);
          return {
            ...token,
            value: valueExpression,
          };
        }),
      },
    ];
  }, [variables]);

  const outputTokensWithValues = useMemo(() => {
    return Object.keys(outputTokens).map((tokenKey) => {
      const tokensArray = outputTokens[tokenKey].tokens.map((token) => {
        const isTrigger = tokenKey === triggerNodeId;
        const method = getTokenExpressionMethodFromKey(token.key, token.outputInfo.actionName, token.outputInfo.source);
        const valueExpression = generateExpressionFromKey(method, token.key, token.outputInfo.actionName, false, false);
        const actionName = isTrigger ? undefined : tokenKey;
        const triggerName = isTrigger ? undefined : tokenKey;
        return {
          ...token,
          value: valueExpression,
          actionName: actionName,
          triggerName: triggerName,
          outputInfo: { ...token.outputInfo, actionName: actionName, triggerName: triggerName },
        };
      });
      return { tokens: tokensArray, id: tokenKey, label: labelCase(tokenKey) };
    });
  }, [outputTokens, triggerNodeId]);

  const allTokens = useMemo(
    () => ({
      outputTokensWithValues,
      variableTokens,
      expressionTokens: getExpressionTokenSections(),
    }),
    [outputTokensWithValues, variableTokens]
  );

  return allTokens;
};

const getValueSegmentFromToken = (token: OutputToken): ValueSegment => {
  const { key, brandColor, icon, title, description, name, type, value, outputInfo } = token;
  const { actionName, type: tokenType, required, format, source, isSecure, arrayDetails, triggerName } = outputInfo;
  const segment = {
    id: guid(),
    type: ValueSegmentType.TOKEN,
    value: value ?? '',
    token: {
      actionName,
      triggerName,
      tokenType,
      brandColor,
      icon,
      description,
      key,
      name,
      type,
      value,
      format,
      required,
      title,
      source,
      isSecure,
      arrayDetails: arrayDetails
        ? {
            parentArrayName: arrayDetails.parentArray,
            itemSchema: arrayDetails.itemSchema,
          }
        : undefined,
    },
  };

  return segment;
};

const getConditionExpression = (
  editorId: string,
  labelId: string,
  initialValue: string,
  type: string,
  tokenGroup: TokenGroup[],
  expressionGroup: TokenGroup[],
  onChange: (value: string) => void,
  isReadOnly: boolean
): JSX.Element => {
  const supportedTypes: string[] = getPropertyValue(Constants.TOKENS, type);
  const filteredTokens = tokenGroup.map((group) => ({
    ...group,
    tokens: group.tokens.filter((token) => supportedTypes.includes(token.type)),
  }));

  return (
    <ConditionExpression
      editorId={editorId}
      labelId={labelId}
      initialValue={initialValue}
      tokenGroup={filteredTokens}
      filteredTokenGroup={filteredTokens}
      expressionGroup={expressionGroup}
      getValueSegmentFromToken={(token: OutputToken) => Promise.resolve(getValueSegmentFromToken(token))}
      onChange={onChange}
      isReadOnly={isReadOnly}
    />
  );
};

export const AssertionsPanel = (props: CommonPanelProps) => {
  const assertions = useAssertions();
  const assertionsValidationErrors = useAssertionsValidationErrors();

  const dispatch = useDispatch<AppDispatch>();

  const tokens = useTokens();
  const onClose = () => {
    props.toggleCollapse?.();
  };

  const onAssertionDelete = (event: AssertionDeleteEvent) => {
    const { id } = event;
    dispatch(deleteAssertion({ assertionId: id }));
  };

  const onAssertionUpdate = (event: AssertionUpdateEvent) => {
    const { name, description, id, assertionString, isEditable } = event;
    const assertionToUpdate = { name, description, id, assertionString, isEditable };
    dispatch(updateAssertion({ assertionToUpdate }));
  };

  const onAssertionAdd = (event: AssertionAddEvent) => {
    const id = guid();
    const newAssertion = {
      id: id,
      name: event.name,
      isEditable: true,
      description: event.description,
      assertionString: event.assertionString,
    };
    dispatch(addAssertion({ assertion: newAssertion }));
  };

  const getConditionExpressionHandler = useCallback(
    (editorId: string, labelId: string, assertionId: string, initialValue: string, type: string, isReadOnly: boolean) => {
      return getConditionExpression(
        editorId,
        labelId,
        initialValue,
        type,
        [...tokens.outputTokensWithValues, ...tokens.variableTokens],
        tokens.expressionTokens,
        (value) => {
          dispatch(updateAssertionExpression({ id: assertionId, assertionString: value }));
        },
        isReadOnly
      );
    },
    [dispatch, tokens.expressionTokens, tokens.outputTokensWithValues, tokens.variableTokens]
  );

  return (
    <Assertions
      assertions={Object.values(assertions)}
      onAssertionAdd={onAssertionAdd}
      onDismiss={onClose}
      onAssertionDelete={onAssertionDelete}
      onAssertionUpdate={onAssertionUpdate}
      getConditionExpression={getConditionExpressionHandler}
      validationErrors={assertionsValidationErrors}
    />
  );
};
