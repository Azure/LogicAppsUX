import { Constants } from '../../..';
import { getTriggerNodeId } from '../../../core';
import type { VariableDeclaration } from '../../../core/state/tokens/tokensSlice';
import { useAssertions } from '../../../core/state/unitTest/unitTestSelectors';
import { updateAssertions, updateAssertion } from '../../../core/state/unitTest/unitTestSlice';
import type { AppDispatch, RootState } from '../../../core/store';
import {
  generateExpressionFromKey,
  getTokenExpressionMethodFromKey,
  getTokenValueFromToken,
  toConditionViewModel,
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
  TokenPicker,
  type TokenPickerMode,
  ValueSegmentType,
} from '@microsoft/designer-ui';
import { getIntl } from '@microsoft/intl-logic-apps';
import { guid, type AssertionDefintion, aggregate, getPropertyValue, labelCase } from '@microsoft/utils-logic-apps';
import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const variableIcon =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzJweCIgaGVpZ2h0PSIzMnB4IiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAzMiAzMiIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjNzcwQkQ2Ii8+DQogPGcgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Ik02Ljc2MywxMy42ODV2LTMuMjA4QzYuNzYzLDguNzQ4LDcuNzYyLDgsMTAsOHYxLjA3Yy0xLDAtMiwwLjMyNS0yLDEuNDA3djMuMTg4ICAgIEM4LDE0LjgzNiw2LjUxMiwxNiw1LjUxMiwxNkM2LjUxMiwxNiw4LDE3LjE2NCw4LDE4LjMzNVYyMS41YzAsMS4wODIsMSwxLjQyOSwyLDEuNDI5VjI0Yy0yLjIzOCwwLTMuMjM4LTAuNzcyLTMuMjM4LTIuNXYtMy4xNjUgICAgYzAtMS4xNDktMC44OTMtMS41MjktMS43NjMtMS41ODV2LTEuNUM1Ljg3LDE1LjE5NCw2Ljc2MywxNC44MzQsNi43NjMsMTMuNjg1eiIvPg0KICA8cGF0aCBkPSJtMjUuMjM4IDEzLjY4NXYtMy4yMDhjMC0xLjcyOS0xLTIuNDc3LTMuMjM4LTIuNDc3djEuMDdjMSAwIDIgMC4zMjUgMiAxLjQwN3YzLjE4OGMwIDEuMTcxIDEuNDg4IDIuMzM1IDIuNDg4IDIuMzM1LTEgMC0yLjQ4OCAxLjE2NC0yLjQ4OCAyLjMzNXYzLjE2NWMwIDEuMDgyLTEgMS40MjktMiAxLjQyOXYxLjA3MWMyLjIzOCAwIDMuMjM4LTAuNzcyIDMuMjM4LTIuNXYtMy4xNjVjMC0xLjE0OSAwLjg5My0xLjUyOSAxLjc2Mi0xLjU4NXYtMS41Yy0wLjg3LTAuMDU2LTEuNzYyLTAuNDE2LTEuNzYyLTEuNTY1eiIvPg0KICA8cGF0aCBkPSJtMTUuODE1IDE2LjUxMmwtMC4yNDItMC42NDFjLTAuMTc3LTAuNDUzLTAuMjczLTAuNjk4LTAuMjg5LTAuNzM0bC0wLjM3NS0wLjgzNmMtMC4yNjYtMC41OTktMC41MjEtMC44OTgtMC43NjYtMC44OTgtMC4zNyAwLTAuNjYyIDAuMzQ3LTAuODc1IDEuMDM5LTAuMTU2LTAuMDU3LTAuMjM0LTAuMTQxLTAuMjM0LTAuMjUgMC0wLjMyMyAwLjE4OC0wLjY5MiAwLjU2Mi0xLjEwOSAwLjM3NS0wLjQxNyAwLjcxLTAuNjI1IDEuMDA3LTAuNjI1IDAuNTgzIDAgMS4xODYgMC44MzkgMS44MTEgMi41MTZsMC4xNjEgMC40MTQgMC4xOC0wLjI4OWMxLjEwOC0xLjc2IDIuMDQ0LTIuNjQxIDIuODA0LTIuNjQxIDAuMTk4IDAgMC40MyAwLjA1OCAwLjY5NSAwLjE3MmwtMC45NDYgMC45OTJjLTAuMTI1LTAuMDM2LTAuMjE0LTAuMDU1LTAuMjY2LTAuMDU1LTAuNTczIDAtMS4yNTYgMC42NTktMi4wNDggMS45NzdsLTAuMjI3IDAuMzc5IDAuMTc5IDAuNDhjMC42ODQgMS44OTEgMS4yNDkgMi44MzYgMS42OTQgMi44MzYgMC40MDggMCAwLjcyLTAuMjkyIDAuOTM1LTAuODc1IDAuMTQ2IDAuMDk0IDAuMjE5IDAuMTkgMC4yMTkgMC4yODkgMCAwLjI2MS0wLjIwOCAwLjU3My0wLjYyNSAwLjkzOHMtMC43NzYgMC41NDctMS4wNzggMC41NDdjLTAuNjA0IDAtMS4yMjEtMC44NTItMS44NTEtMi41NTVsLTAuMjE5LTAuNTc4LTAuMjI3IDAuMzk4Yy0xLjA2MiAxLjgyMy0yLjA3OCAyLjczNC0zLjA0NyAyLjczNC0wLjM2NSAwLTAuNjc1LTAuMDkxLTAuOTMtMC4yNzFsMC45MDYtMC44ODVjMC4xNTYgMC4xNTYgMC4zMzggMC4yMzQgMC41NDcgMC4yMzQgMC41ODggMCAxLjI1LTAuNTk2IDEuOTg0LTEuNzg2bDAuNDA2LTAuNjU4IDAuMTU1LTAuMjU5eiIvPg0KICA8ZWxsaXBzZSB0cmFuc2Zvcm09Im1hdHJpeCguMDUzNiAtLjk5ODYgLjk5ODYgLjA1MzYgNS40OTI1IDMyLjI0NSkiIGN4PSIxOS43NTciIGN5PSIxMy4yMjUiIHJ4PSIuNzc4IiByeT0iLjc3OCIvPg0KICA8ZWxsaXBzZSB0cmFuc2Zvcm09Im1hdHJpeCguMDUzNiAtLjk5ODYgLjk5ODYgLjA1MzYgLTcuNTgzOSAzMC42MjkpIiBjeD0iMTIuMzY2IiBjeT0iMTkuMzE1IiByeD0iLjc3OCIgcnk9Ii43NzgiLz4NCiA8L2c+DQo8L3N2Zz4NCg==';
const variableColor = '#770BD6';

const getVariableTokens = (variables: Record<string, VariableDeclaration[]>): OutputToken[] => {
  const vars = aggregate(Object.values(variables));
  return vars.map(({ name, type }) => {
    return {
      key: `variables:${name}`,
      brandColor: variableColor,
      icon: variableIcon,
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

export const useTokens = (): { outputTokensWithValues: TokenGroup[]; variableTokens: TokenGroup[]; expressionTokens: TokenGroup[] } => {
  const { outputTokens, variables } = useSelector((state: RootState) => ({
    outputTokens: state.tokens.outputTokens,
    variables: state.tokens.variables,
  }));

  const { workflowState } = useSelector((state: RootState) => ({
    workflowState: state.workflow,
  }));

  const triggerNodeId = workflowState.graph ? getTriggerNodeId(workflowState) : null;

  const variableTokens = useMemo(() => {
    return [
      {
        id: 'variables',
        label: getIntl().formatMessage({ description: 'Heading section for Variable tokens', defaultMessage: 'Variables' }),
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
        const method = getTokenExpressionMethodFromKey(token.key, token.outputInfo.actionName);
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

export const getValueSegmentFromToken = (token: OutputToken): ValueSegment => {
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

const getTokenPicker = (
  editorId: string,
  labelId: string,
  type: string,
  tokenGroup: TokenGroup[],
  expressionGroup: TokenGroup[],
  tokenPickerMode?: TokenPickerMode,
  setIsTokenPickerOpened?: (b: boolean) => void,
  tokenClickedCallback?: (token: ValueSegment) => void
): JSX.Element => {
  const supportedTypes: string[] = getPropertyValue(Constants.TOKENS, type);
  const filteredTokens = tokenGroup.map((group) => ({
    ...group,
    tokens: group.tokens.filter((token) => supportedTypes.includes(token.type)),
  }));

  return (
    <TokenPicker
      editorId={editorId}
      labelId={labelId}
      tokenGroup={filteredTokens}
      filteredTokenGroup={filteredTokens}
      expressionGroup={expressionGroup}
      setIsTokenPickerOpened={setIsTokenPickerOpened}
      initialMode={tokenPickerMode}
      getValueSegmentFromToken={(token: OutputToken) => Promise.resolve(getValueSegmentFromToken(token))}
      tokenClickedCallback={tokenClickedCallback}
    />
  );
};

export const AssertionsPanel = (props: CommonPanelProps) => {
  const workflowAssertions = useAssertions();
  const [assertions, setAssertions] = useState<Record<string, AssertionDefintion>>(workflowAssertions);
  const dispatch = useDispatch<AppDispatch>();

  const tokens = useTokens();
  console.log('tokenGroup', tokens);

  const onClose = () => {
    props.toggleCollapse?.();
  };

  const onAssertionDelete = (event: AssertionDeleteEvent) => {
    const { id } = event;
    const newAssertions = { ...assertions };
    delete newAssertions[id];
    setAssertions(newAssertions);
  };

  const onAssertionUpdate = (event: AssertionUpdateEvent) => {
    const { name, description, id } = event;
    const assertionToUpdate = { name: name, description: description, id: id, expression: {} };
    dispatch(updateAssertion({ assertionToUpdate }));

    const newAssertions = { ...assertions };
    newAssertions[id] = assertionToUpdate;
    setAssertions(newAssertions);
  };

  const onAssertionAdd = (event: AssertionAddEvent) => {
    const id = guid();
    const newAssertions = {
      ...assertions,
      [id]: {
        id: id,
        name: event.name,
        description: event.description,
        expression: toConditionViewModel(event.expression),
      },
    };
    setAssertions(newAssertions);
    dispatch(updateAssertions({ assertions: newAssertions }));
  };

  const onGetTokenPicker = useCallback(
    (
      editorId: string,
      labelId: string,
      type: string,
      tokenPickerMode?: TokenPickerMode,
      setIsTokenPickerOpened?: (b: boolean) => void,
      tokenClickedCallback?: (token: ValueSegment) => void
    ) => {
      return getTokenPicker(
        editorId,
        labelId,
        type,
        [...tokens.outputTokensWithValues, ...tokens.variableTokens],
        tokens.expressionTokens,
        tokenPickerMode,
        setIsTokenPickerOpened,
        tokenClickedCallback
      );
    },
    [tokens]
  );

  return (
    <Assertions
      assertions={Object.values(assertions)}
      onAssertionAdd={onAssertionAdd}
      onDismiss={onClose}
      onAssertionDelete={onAssertionDelete}
      onAssertionUpdate={onAssertionUpdate}
      getTokenPicker={onGetTokenPicker}
    />
  );
};
