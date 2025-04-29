import type { SectionProps } from '../..';
import type { OutputToken, ParameterInfo, TokenPickerMode, ValueSegment } from '@microsoft/designer-ui';
import { convertSegmentsToString, SettingTokenField, TokenPicker, ValueSegmentType } from '@microsoft/designer-ui';
import { useIsInfiniteLoop, useReplacedIds, useTransition } from '../../../../core/state/workflow/workflowSelectors';
import { useIntl } from 'react-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TokenGroup } from '@microsoft/logic-apps-shared';
import { clone, guid, isRecordNotEmpty } from '@microsoft/logic-apps-shared';
import { convertToValueSegments, remapValueSegmentsWithNewIds } from '../../../../core/utils/parameters/helper';
import type { AppDispatch, RootState } from '../../../../core';
import { getOutputTokenSections, getExpressionTokenSections } from '../../../../core';
import { useDispatch, useSelector } from 'react-redux';
import { updateTransitions } from '../../../../core/state/workflow/workflowSlice';

export interface TransitionPropertiesProps extends SectionProps {
  sourceId: string;
  targetId: string;
}

export const TransitionProperties = ({ sourceId, targetId, readOnly }: TransitionPropertiesProps): JSX.Element | null => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const isInfinite = useIsInfiniteLoop(sourceId, targetId);

  const transition = useTransition(sourceId, targetId);

  const conditionLabel = intl.formatMessage({
    defaultMessage: 'Condition',
    id: 'WpYfbG',
    description: 'label for the input to define the branch condition',
  });

  const conditionChangeCallback = useCallback(
    (state: any) => {
      dispatch(
        updateTransitions({
          sourceId,
          targetId,
          transition: {
            ...transition,
            condition: state.value.length > 0 ? convertSegmentsToString(state.value) : undefined,
          },
        })
      );
    },
    [dispatch, sourceId, targetId, transition]
  );

  const inputsChangeCallback = useCallback(
    (state: any) => {
      const value = state.value.length > 0 ? JSON.parse(convertSegmentsToString(state.value)) : undefined;
      const newTransition = clone(transition)!;
      if (value) {
        newTransition.inputs = value;
      } else if (newTransition?.inputs) {
        delete newTransition.inputs;
      }
      dispatch(
        updateTransitions({
          sourceId,
          targetId,
          transition: newTransition,
        })
      );
    },
    [dispatch, sourceId, targetId, transition]
  );

  const nodeType = useSelector((state: RootState) => state.operations.operationInfo?.[sourceId]?.type);

  const { tokenState, workflowParametersState, workflowState } = useSelector((state: RootState) => ({
    tokenState: state.tokens,
    workflowParametersState: state.workflowParameters,
    workflowState: state.workflow,
  }));

  const replacedIds = useReplacedIds();
  const expressionGroup = getExpressionTokenSections();
  const tokenGroup = useMemo(
    () => getOutputTokenSections(sourceId, nodeType, tokenState, workflowParametersState, workflowState, replacedIds, true),
    [sourceId, nodeType, replacedIds, tokenState, workflowParametersState, workflowState]
  );

  const [tokenMapping, setTokenMapping] = useState<Record<string, ValueSegment>>({});
  useEffect(() => {
    const callback = async () => {
      const mapping: Record<string, ValueSegment> = {};
      for (const group of tokenGroup) {
        for (const token of group.tokens) {
          if (!token.value) {
            continue;
          }
          mapping[token.value] = await getValueSegmentFromToken(token);
        }
      }
      setTokenMapping(mapping);
    };

    callback();
  }, [tokenGroup]);

  const param: ParameterInfo = {
    id: targetId,
    value: [],
    required: false,
    info: {},
    label: 'test',
    parameterKey: 'test',
    parameterName: 'test',
    type: 'any',
  };

  const idReplacements = useReplacedIds();

  const getValueAsValueSegments = useCallback(
    (value = ''): ValueSegment[] => {
      const segments = convertToValueSegments(value, true);
      const { value: remappedValue } = isRecordNotEmpty(idReplacements)
        ? remapValueSegmentsWithNewIds(segments, idReplacements)
        : { value: segments };
      return remappedValue;
    },
    [idReplacements]
  );

  const generalProps = {
    showTokens: true,
    tokenMapping,
    readOnly,
    onCastParameter: () => '', // This only matters for array editors
    getTokenPicker: (editorId, labelId, tokenPickerMode, valueType) =>
      getTokenPicker(editorId, labelId, valueType ?? '', tokenGroup, expressionGroup, param, tokenPickerMode),
  };

  return (
    <>
      {/* CONDITION FIELD */}
      <SettingTokenField
        {...generalProps}
        key={'tokenField-transition-condition'}
        tokenEditor={true}
        errorDetails={
          isInfinite
            ? {
                message: intl.formatMessage({
                  defaultMessage: 'Add a condition to prevent infinite loop',
                  id: '88HRh2',
                  description: 'Error message for infinite loop',
                }),
              }
            : undefined
        }
        label={conditionLabel}
        value={getValueAsValueSegments(transition?.condition)}
        onValueChange={conditionChangeCallback}
      />
      {/* INPUTS FIELD */}
      <SettingTokenField
        {...generalProps}
        key={'tokenField-transition-inputs'}
        tokenEditor={true}
        label={intl.formatMessage({
          defaultMessage: 'Inputs',
          id: 'xyNdAC',
          description: 'Label for the input to define the inputs',
        })}
        value={getValueAsValueSegments(transition?.inputs)}
        onValueChange={inputsChangeCallback}
      />
    </>
  );
};

const getTokenPicker = (
  editorId: string,
  labelId: string,
  type: string,
  tokenGroup: TokenGroup[] = [],
  expressionGroup: TokenGroup[] = [],
  param: ParameterInfo,
  tokenPickerMode?: TokenPickerMode
): JSX.Element => {
  return (
    <TokenPicker
      editorId={editorId}
      labelId={labelId}
      tokenGroup={tokenGroup}
      filteredTokenGroup={tokenGroup}
      expressionGroup={expressionGroup}
      initialMode={tokenPickerMode}
      getValueSegmentFromToken={(token: OutputToken) => Promise.resolve(getValueSegmentFromToken(token))}
      parameter={param}
    />
  );
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

export const getValueSegmentFromLiteral = (literal: string): ValueSegment => {
  const segment = {
    id: guid(),
    type: ValueSegmentType.LITERAL,
    value: literal ?? '',
  };

  return segment;
};
