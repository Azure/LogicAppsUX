// biome-ignore lint/correctness/noUnusedImports: actually is used
import type { editor } from 'monaco-editor';
import { ValueSegmentType, type Token, type ValueSegment } from '../editor';
import { CLOSE_TOKENPICKER } from '../editor/base/plugins/CloseTokenPicker';
import type { ExpressionEditorEvent } from '../expressioneditor';
import { ExpressionEditor } from '../expressioneditor';
import { PanelSize } from '../panel/panelUtil';
import type { ParameterInfo, TokenGroup } from '@microsoft/logic-apps-shared';
import TokenPickerExpressionHandler from './plugins/InitializeTokenPickerExpressionHandler';
import UpdateTokenNode from './plugins/UpdateTokenNode';
import { TokenPickerFooter } from './tokenpickerfooter';
import { TokenPickerHeader } from './tokenpickerheader';
import { TokenPickerPivot } from './tokenpickerpivot';
import type { GetValueSegmentHandler } from './tokenpickersection/tokenpickeroption';
import { TokenPickerSection } from './tokenpickersection/tokenpickersection';
import type { ICalloutContentStyles, ISearchBox, PivotItem } from '@fluentui/react';
import { SearchBox, DirectionalHint, Callout } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, type LexicalEditor, type NodeKey } from 'lexical';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { escapeString, guid, LOCAL_STORAGE_KEYS, TokenType } from '@microsoft/logic-apps-shared';
import { CreateAgentParameter, generateDefaultAgentParamName } from './tokenpickersection/CreateAgentParameter';
import { INSERT_TOKEN_NODE } from '../editor/base/plugins/InsertTokenNode';
import TokenPickerAgentParameterHandler from './plugins/InitializeTokenPickerAgentParameterHandler';
import { UPDATE_TOKEN_NODES } from '../editor/base/plugins/UpdateTokenNodes';

export const TokenPickerMode = {
  TOKEN: 'token',
  TOKEN_EXPRESSION: 'tokenExpression',
  EXPRESSION: 'expression',
  AGENT_PARAMETER: 'agentParameter',
  AGENT_PARAMETER_CREATE: 'agentParameterCreate',
  AGENT_PARAMETER_ADD: 'agentParameterAdd',
} as const;
export type TokenPickerMode = (typeof TokenPickerMode)[keyof typeof TokenPickerMode];

export type { Token as OutputToken } from '@microsoft/logic-apps-shared';

const AgentParameterIcon =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiBpZD0idXVpZC1hOTNkNmI0YS02N2Y2LTQ1MjAtODNhOS0yMGIwZGJlMjQ1Y2YiIGRhdGEtbmFtZT0iTGF5ZXIgMSIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiB2aWV3Qm94PSIwIDAgMTggMTgiPg0KICA8ZGVmcz4NCiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9InV1aWQtMGJmODYwMGYtNmQ3ZC00OTZmLWE1ZGMtZDJhZjg2ZGQ2NGNmIiBjeD0iLTY3Ljk4MSIgY3k9Ijc5My4xOTkiIGZ4PSItNjcuOTgxIiBmeT0iNzkzLjE5OSIgcj0iLjQ1IiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKC0xNzkzOS4wMyAyMDM2OC4wMjkpIHJvdGF0ZSg0NSkgc2NhbGUoMjUuMDkxIC0zNC4xNDkpIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+DQogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM4M2I5ZjkiLz4NCiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwNzhkNCIvPg0KICAgIDwvcmFkaWFsR3JhZGllbnQ+DQogIDwvZGVmcz4NCiAgPHBhdGggZD0ibTAsMi43djEyLjZjMCwxLjQ5MSwxLjIwOSwyLjcsMi43LDIuN2gxMi42YzEuNDkxLDAsMi43LTEuMjA5LDIuNy0yLjdWMi43YzAtMS40OTEtMS4yMDktMi43LTIuNy0yLjdIMi43QzEuMjA5LDAsMCwxLjIwOSwwLDIuN1pNMTAuOCwwdjMuNmMwLDMuOTc2LDMuMjI0LDcuMiw3LjIsNy4yaC0zLjZjLTMuOTc2LDAtNy4xOTksMy4yMjItNy4yLDcuMTk4di0zLjU5OGMwLTMuOTc2LTMuMjI0LTcuMi03LjItNy4yaDMuNmMzLjk3NiwwLDcuMi0zLjIyNCw3LjItNy4yWiIgZmlsbD0idXJsKCN1dWlkLTBiZjg2MDBmLTZkN2QtNDk2Zi1hNWRjLWQyYWY4NmRkNjRjZikiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlLXdpZHRoPSIwIi8+DQo8L3N2Zz4=';
const AgentParameterBrandColor = '#072a8e';

const directionalHint = DirectionalHint.leftTopEdge;
const gapSpace = 10;
const beakWidth = 20;

const calloutStyles: Partial<ICalloutContentStyles> = {
  root: {
    zIndex: 1,
  },
  calloutMain: {
    overflow: 'visible',
  },
};

const calloutStylesWithTopMargin: Partial<ICalloutContentStyles> = {
  ...calloutStyles,
  root: {
    ...(calloutStyles.root as object),
    marginTop: '80px',
  },
};

export type SearchTextChangedEventHandler = (e: string) => void;

export interface TokenPickerProps {
  editorId: string;
  labelId: string;
  getValueSegmentFromToken: GetValueSegmentHandler;
  tokenGroup?: TokenGroup[];
  filteredTokenGroup?: TokenGroup[];
  expressionGroup?: TokenGroup[];
  // if initialMode is undefined, it is Legacy TokenPicker
  initialMode?: TokenPickerMode;
  // tokenClickedCallback is used for the code Editor TokenPicker(Legacy Token Picker)
  tokenClickedCallback?: (token: ValueSegment) => void;
  hideUTFExpressions?: boolean;
  valueType?: string;
  parameter: ParameterInfo;
  createOrUpdateAgentParameter?: (name: string, type: string, description: string, isUpdating?: boolean) => void;
}
export function TokenPicker({
  editorId,
  labelId,
  tokenGroup,
  filteredTokenGroup,
  expressionGroup,
  initialMode,
  hideUTFExpressions,
  valueType,
  parameter,
  getValueSegmentFromToken,
  tokenClickedCallback,
  createOrUpdateAgentParameter,
}: TokenPickerProps): JSX.Element {
  const intl = useIntl();
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<TokenPickerMode>(initialMode ?? TokenPickerMode.TOKEN);
  const [nodeToBeUpdated, setNodeToBeUpdated] = useState<NodeKey | null>(null);
  const [expression, setExpression] = useState<ExpressionEditorEvent>({ value: '', selectionStart: 0, selectionEnd: 0 });
  const [fullScreen, setFullScreen] = useState(false);
  const [isDraggingExpressionEditor, setIsDraggingExpressionEditor] = useState(false);
  const [expressionEditorDragDistance, setExpressionEditorDragDistance] = useState(0);
  const [expressionEditorCurrentHeight, setExpressionEditorCurrentHeight] = useState(windowDimensions.height < 400 ? 50 : 100);
  const [expressionEditorError, setExpressionEditorError] = useState<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const expressionEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const searchBoxRef = useRef<ISearchBox | null>(null);
  const isExpression = initialMode === TokenPickerMode.EXPRESSION;
  const [anchorKey, setAnchorKey] = useState<NodeKey | null>(null);
  const [selectedAgentParameterToken, setSelectedAgentParameterToken] = useState<Token | null>(null);
  const [styleWithMargin, setStyleWithMargin] = useState(false);
  const showCreateAgentParameter =
    selectedMode === TokenPickerMode.AGENT_PARAMETER_CREATE || selectedMode === TokenPickerMode.AGENT_PARAMETER_ADD;

  let editor: LexicalEditor | null;
  try {
    [editor] = useLexicalComposerContext();
  } catch {
    editor = null;
  }

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isExpression) {
      setTimeout(() => {
        expressionEditorRef.current?.focus();
      }, 300);
    } else {
      setTimeout(() => {
        searchBoxRef.current?.focus();
      }, 0);
    }
  }, [isExpression]);

  useEffect(() => {
    editor?.getEditorState().read(() => {
      setAnchorKey($getSelection()?.getNodes()[0]?.__key ?? null);
    });
  }, [editor]);

  useEffect(() => {
    if (anchorKey && containerRef && editor) {
      const calloutContainer = containerRef.current;
      const rootElement = editor.getRootElement();
      if (calloutContainer && rootElement) {
        const { height } = rootElement.getBoundingClientRect();
        if (height / windowDimensions.height > 0.4) {
          setStyleWithMargin(true);
        } else {
          setStyleWithMargin(false);
        }
      }
    }
  }, [anchorKey, editor, windowDimensions.height]);

  const handleInitializeExpression = (s: string, n: NodeKey) => {
    const escapedString = escapeString(s, /*requireSingleQuotesWrap*/ true);
    setExpression({ value: escapedString, selectionStart: 0, selectionEnd: 0 });
    setSelectedMode(TokenPickerMode.EXPRESSION);
    setNodeToBeUpdated(n);

    setTimeout(() => {
      expressionEditorRef.current?.setSelection({
        startLineNumber: escapedString.length + 1,
        startColumn: 1,
        endLineNumber: escapedString.length + 1,
        endColumn: 1,
      });
      expressionEditorRef.current?.focus();
    }, 100);
  };

  const handleInitializeAgentParameter = (token: Token, n: NodeKey) => {
    setSelectedAgentParameterToken(token);
    setSelectedMode(TokenPickerMode.AGENT_PARAMETER_CREATE);
    setNodeToBeUpdated(n);
  };

  const handleSelectKey = (item?: PivotItem) => {
    if (item?.props?.itemKey) {
      setSelectedMode(item.props.itemKey as TokenPickerMode);
    }
  };

  const onExpressionEditorBlur = (e: ExpressionEditorEvent): void => {
    setExpression(e);
  };

  const handleExpressionEditorMoveDistance = (e: any) => {
    if (isDraggingExpressionEditor) {
      setExpressionEditorDragDistance(e.clientY);
    }
  };

  const isDynamicContentAvailable = (tokenGroup: TokenGroup[]): boolean => {
    for (const tg of tokenGroup) {
      if (tg.tokens.length > 0) {
        return true;
      }
    }
    return false;
  };

  const pasteLastUsedExpression = () => {
    setExpression({ ...expression, value: window.localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN_PICKER_EXPRESSION) ?? expression.value });
    expressionEditorRef.current?.focus();
  };

  const tokenPickerPlaceHolderText = intl.formatMessage({
    defaultMessage: 'Search',
    id: 'Mc6ITJ',
    description: 'Placeholder text to search token picker',
  });

  const cancelCreateAgentParameter = (): void => {
    if (selectedMode === TokenPickerMode.AGENT_PARAMETER_ADD) {
      // not yet implemented
      setSelectedMode(TokenPickerMode.AGENT_PARAMETER);
    } else {
      editor?.dispatchCommand(CLOSE_TOKENPICKER, { focusEditorAfter: true });
    }
  };

  const handleCreateAgentParameter = (name: string, type: string, description: string) => {
    if (nodeToBeUpdated) {
      editor?.dispatchCommand(UPDATE_TOKEN_NODES, { key: `agentParameter.${name}`, type, description });
      editor?.dispatchCommand(CLOSE_TOKENPICKER, { focusEditorAfter: true });
    } else {
      const agentParameterValue = `agentParameters('${name}')`;
      const token: Token = {
        tokenType: TokenType.AGENTPARAMETER,
        name: name,
        title: name,
        type: type,
        key: `agentParameter.${name}`,
        brandColor: AgentParameterBrandColor,
        icon: AgentParameterIcon,
        value: agentParameterValue,
        description,
      };
      editor?.dispatchCommand(INSERT_TOKEN_NODE, {
        brandColor: token.brandColor,
        description: token.description,
        title: token.title,
        icon: token.icon,
        value: token.value,
        data: { id: guid(), type: ValueSegmentType.TOKEN, value: agentParameterValue, token },
      });
    }

    createOrUpdateAgentParameter?.(name, type, description, !!nodeToBeUpdated);
  };

  return (
    <>
      <Callout
        role="dialog"
        ariaLabelledBy={labelId}
        gapSpace={gapSpace}
        target={`#${editorId}`}
        beakWidth={beakWidth}
        directionalHint={directionalHint}
        onMouseMove={handleExpressionEditorMoveDistance}
        onMouseUp={() => {
          if (isDraggingExpressionEditor) {
            setIsDraggingExpressionEditor(false);
          }
        }}
        onDismiss={(e) => {
          if (e?.type === 'keydown' && (e as React.KeyboardEvent<HTMLElement>).key === 'Escape') {
            editor?.dispatchCommand(CLOSE_TOKENPICKER, { focusEditorAfter: true });
          } else {
            editor?.dispatchCommand(CLOSE_TOKENPICKER, { focusEditorAfter: false });
          }
        }}
        onRestoreFocus={() => {
          return;
        }}
        styles={styleWithMargin ? calloutStylesWithTopMargin : calloutStyles}
        layerProps={{
          hostId: 'msla-layer-host',
        }}
      >
        <div
          className="msla-token-picker-container-v3"
          style={
            fullScreen
              ? {
                  maxHeight: windowDimensions.height - 16,
                  height: windowDimensions.height - 16,
                  width: Math.max(
                    windowDimensions.width - (Number.parseInt(PanelSize.Medium, 10) + 40),
                    Math.min(windowDimensions.width - 16, 400)
                  ),
                }
              : { maxHeight: Math.min(windowDimensions.height - 16, 550), width: Math.min(windowDimensions.width - 16, 400) }
          }
          ref={containerRef}
        >
          <div className="msla-token-picker">
            {initialMode ? (
              <TokenPickerHeader
                fullScreen={fullScreen}
                isExpression={isExpression}
                setFullScreen={setFullScreen}
                pasteLastUsedExpression={pasteLastUsedExpression}
              />
            ) : null}
            {showCreateAgentParameter ? (
              <CreateAgentParameter
                nodeToBeUpdated={nodeToBeUpdated}
                createAgentParameter={handleCreateAgentParameter}
                cancelCreateAgentParameter={cancelCreateAgentParameter}
                defaultName={selectedAgentParameterToken?.name || generateDefaultAgentParamName(parameter)}
                defaultType={selectedAgentParameterToken?.type || valueType}
                defaultDescription={selectedAgentParameterToken?.description || ''}
              />
            ) : (
              <>
                {isExpression ? (
                  <div className="msla-token-picker-expression-subheader">
                    <ExpressionEditor
                      initialValue={expression.value}
                      editorRef={expressionEditorRef}
                      onBlur={onExpressionEditorBlur}
                      isDragging={isDraggingExpressionEditor}
                      dragDistance={expressionEditorDragDistance}
                      setIsDragging={setIsDraggingExpressionEditor}
                      currentHeight={expressionEditorCurrentHeight}
                      setCurrentHeight={setExpressionEditorCurrentHeight}
                      setExpressionEditorError={setExpressionEditorError}
                      hideUTFExpressions={hideUTFExpressions}
                    />
                    <div className="msla-token-picker-expression-editor-error">{expressionEditorError}</div>
                    <TokenPickerPivot selectedKey={selectedMode} selectKey={handleSelectKey} hideExpressions={!!tokenClickedCallback} />
                  </div>
                ) : null}
                <div className="msla-token-picker-search-container">
                  <SearchBox
                    className="msla-token-picker-search"
                    componentRef={(e) => {
                      searchBoxRef.current = e;
                    }}
                    placeholder={tokenPickerPlaceHolderText}
                    onChange={(_, newValue) => {
                      setSearchQuery(newValue ?? '');
                    }}
                    data-automation-id="msla-token-picker-search"
                  />
                </div>
                <TokenPickerSection
                  tokenGroup={(selectedMode === TokenPickerMode.TOKEN ? filteredTokenGroup : tokenGroup) ?? []}
                  expressionGroup={expressionGroup ?? []}
                  expressionEditorRef={expressionEditorRef}
                  selectedMode={selectedMode}
                  searchQuery={searchQuery}
                  fullScreen={fullScreen}
                  expression={expression}
                  setExpression={setExpression}
                  getValueSegmentFromToken={getValueSegmentFromToken}
                  tokenClickedCallback={tokenClickedCallback}
                  noDynamicContent={!isDynamicContentAvailable(filteredTokenGroup ?? [])}
                  expressionEditorCurrentHeight={expressionEditorCurrentHeight}
                />
                {isExpression ? (
                  <TokenPickerFooter
                    tokenGroup={tokenGroup ?? []}
                    expression={expression}
                    nodeToBeUpdated={nodeToBeUpdated}
                    getValueSegmentFromToken={getValueSegmentFromToken}
                    setExpressionEditorError={setExpressionEditorError}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      </Callout>
      {tokenClickedCallback ? null : <TokenPickerExpressionHandler handleInitializeExpression={handleInitializeExpression} />}
      {tokenClickedCallback ? null : <UpdateTokenNode />}
      {tokenClickedCallback ? null : <TokenPickerAgentParameterHandler handleInitializeAgentParameter={handleInitializeAgentParameter} />}
    </>
  );
}

export function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
  };
}
