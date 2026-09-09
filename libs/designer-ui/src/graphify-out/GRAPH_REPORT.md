# Graph Report - src  (2026-06-22)

## Corpus Check
- 598 files · ~190,079 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2215 nodes · 5265 edges · 106 communities (95 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d59cb30b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]

## God Nodes (most connected - your core abstractions)
1. `ValueSegment` - 101 edges
2. `createLiteralValueSegment()` - 45 edges
3. `BaseEditorProps` - 39 edges
4. `ChangeHandler` - 33 edges
5. `convertStringToSegments()` - 26 edges
6. `ChangeState` - 25 edges
7. `SettingProps` - 25 edges
8. `TokenNode` - 23 edges
9. `convertSegmentsToString()` - 23 edges
10. `ValueSegmentType` - 22 edges

## Surprising Connections (you probably didn't know these)
- `renderWithProvider()` --calls--> `render()`  [INFERRED]
  lib/card/addActionCard/__test__/addActionCard.spec.tsx → lib/settings/settingsection/__tests__/settingTokenField.spec.tsx
- `renderWithProvider()` --calls--> `render()`  [INFERRED]
  lib/connectorsummarycard/__test__/connectorSummaryCard.spec.tsx → lib/settings/settingsection/__tests__/settingTokenField.spec.tsx
- `renderComponent()` --calls--> `render()`  [INFERRED]
  lib/card/collapsedCard/__test__/collapsedCard.spec.tsx → lib/settings/settingsection/__tests__/settingTokenField.spec.tsx
- `ConnectionsSetup()` --calls--> `useFeedbackMessage()`  [EXTRACTED]
  lib/chatbot/components/connectionsSetupMessage.tsx → lib/chatbot/feedbackHelper.tsx
- `FeedbackMessage()` --calls--> `mergeStyles()`  [INFERRED]
  lib/chatbot/components/feedbackMessage.tsx → lib/utils/styles/index.ts

## Import Cycles
- 2-file cycle: `lib/settings/settingsection/index.tsx -> lib/settings/settingsection/settingexpressioneditor.tsx -> lib/settings/settingsection/index.tsx`
- 2-file cycle: `lib/settings/settingsection/index.tsx -> lib/settings/settingsection/settingtagpicker.tsx -> lib/settings/settingsection/index.tsx`
- 2-file cycle: `lib/settings/settingsection/index.tsx -> lib/settings/settingsection/settingdropdown.tsx -> lib/settings/settingsection/index.tsx`
- 2-file cycle: `lib/settings/settingsection/index.tsx -> lib/settings/settingsection/settingslider.tsx -> lib/settings/settingsection/index.tsx`
- 2-file cycle: `lib/settings/settingsection/index.tsx -> lib/settings/settingsection/settingtoggle.tsx -> lib/settings/settingsection/index.tsx`
- 2-file cycle: `lib/settings/settingsection/index.tsx -> lib/settings/settingsection/settingmultiselect.tsx -> lib/settings/settingsection/index.tsx`
- 2-file cycle: `lib/settings/settingsection/index.tsx -> lib/settings/settingsection/settingTokenField.tsx -> lib/settings/settingsection/index.tsx`
- 2-file cycle: `lib/settings/settingsection/index.tsx -> lib/settings/settingsection/settingdictionary.tsx -> lib/settings/settingsection/index.tsx`
- 2-file cycle: `lib/settings/settingsection/index.tsx -> lib/settings/settingsection/settingreactiveinput.tsx -> lib/settings/settingsection/index.tsx`
- 2-file cycle: `lib/settings/settingsection/index.tsx -> lib/settings/settingsection/settingtextfield.tsx -> lib/settings/settingsection/index.tsx`
- 3-file cycle: `lib/settings/settingsection/constants.ts -> lib/settings/settingsection/settingtagpicker.tsx -> lib/settings/settingsection/index.tsx -> lib/settings/settingsection/constants.ts`
- 3-file cycle: `lib/editor/base/EditorWrapper.tsx -> lib/index.ts -> lib/editor/string/index.tsx -> lib/editor/base/EditorWrapper.tsx`
- 3-file cycle: `lib/editor/base/EditorWrapper.tsx -> lib/index.ts -> lib/html/index.tsx -> lib/editor/base/EditorWrapper.tsx`
- 3-file cycle: `lib/editor/base/EditorWrapper.tsx -> lib/index.ts -> lib/picker/filepickerEditor.tsx -> lib/editor/base/EditorWrapper.tsx`
- 3-file cycle: `lib/authentication/MSIAuth/MSIAuth.tsx -> lib/authentication/MSIAuth/MSIAuthDefault.tsx -> lib/authentication/index.tsx -> lib/authentication/MSIAuth/MSIAuth.tsx`
- 3-file cycle: `lib/staticResult/StaticResult.tsx -> lib/staticResult/staticResultProperties.tsx -> lib/staticResult/staticResultProperty.tsx -> lib/staticResult/StaticResult.tsx`
- 3-file cycle: `lib/staticResult/propertyEditor/PropertyEditorItem.tsx -> lib/staticResult/staticResultProperty.tsx -> lib/staticResult/propertyEditor/index.tsx -> lib/staticResult/propertyEditor/PropertyEditorItem.tsx`
- 3-file cycle: `lib/settings/settingsection/index.tsx -> lib/settings/settingsection/settingreactiveinput.tsx -> lib/settings/settingsection/settingtoggle.tsx -> lib/settings/settingsection/index.tsx`
- 3-file cycle: `lib/settings/settingsection/customTokenField.tsx -> lib/settings/settingsection/settingTokenField.tsx -> lib/settings/settingsection/index.tsx -> lib/settings/settingsection/customTokenField.tsx`
- 3-file cycle: `lib/authentication/AADOAuth/AADOAuth.tsx -> lib/authentication/AADOAuth/AADOAuthCredentials.tsx -> lib/authentication/index.tsx -> lib/authentication/AADOAuth/AADOAuth.tsx`

## Communities (106 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (54): getLanguageExtension(), ClockIcon, Colorizer(), ColorizerProps, CopyIcon, ErrorSection(), ErrorSectionProps, ErrorShape (+46 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (39): KnowledgeConnectionTabProps, KnowledgeTabProps, OnTabNavigation, McpConnectorTabProps, McpCreateAppTabProps, McpPanelTabProps, FieldSectionItem(), FieldSectionItemProps (+31 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (46): useEditorCollapseToggleStyles, calloutProps, EditorCollapseToggle(), EditorCollapseToggleProps, inlineBlockStyle, CreateIcon, InitializeVariableEditor(), InitializeVariableEditorProps (+38 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (48): ValueSegmentType, addIcon, AddSection(), AddSectionProps, calloutProps, Group(), GroupProps, menuIconProps (+40 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (50): ActiveDirectoryAuthentication(), ActiveDirectoryAuthenticationProps, AuthenticationOAuthType, zipDropDownOptions(), AadOAuthCredentials(), AadOAuthCredentialsProps, AuthenticationDropdown(), AuthenticationDropdownProps (+42 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (38): PanelContainer(), PanelContainerProps, MoreHorizontal, OverflowMenuItemProps, OverflowMenuProps, PanelContent(), PanelContentProps, PanelResizer() (+30 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (37): Checkbox(), CheckboxProps, CheckboxState, useCheckboxDescriptionCalloutStyles, useCheckboxStyles, DocumentationLinkItem(), DocumentationLinkItemProps, FlyoutBalloon() (+29 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (43): addItemButtonIconProps, calloutTextFieldStyles, cancelButtonStyles, newPropertyTextFieldStyles, PropertyEditor(), PropertyEditorProps, saveButtonStyles, ContextMenuKeys (+35 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (41): CollapsedArray(), CollapsedArrayProps, addItemButtonIconProps, ExpandedComplexArray(), ExpandedComplexArrayProps, addItemButtonIconProps, ContextMenuKeys, ExpandedSimpleArray() (+33 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (36): useCodeEditorStyles, EditableFileNameProps, CodeEditor(), CodeEditorProps, customCodeIconStyle, FileNameChangeHandler, buildInlineCodeTextFromToken(), formatForCSharp() (+28 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (35): DynamicallyAddedParameterIcon, generateDynamicParameterKey(), getDefaultTitleForDynamicallyAddedParameterType(), getDescriptionForDynamicallyAddedParameterType(), getIconForDynamicallyAddedParameterType(), DynamicallyAddedParameter(), DynamicallyAddedParameterProps, DynamicallyAddedParameterType (+27 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (37): useAgentInstructionStyles, AgentInstructionEditor(), AgentInstructionEditorProps, NavigateIcon, AGENT_INSTRUCTION_TYPES, AgentInstructions, parseAgentInstruction(), serializeAgentInstructions() (+29 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (26): CollapsedCard, CollapsedCardProps, FileDropZone(), FileDropZoneProps, FileHandler, useStyles, FoundryAgentPicker(), FoundryAgentPickerProps (+18 more)

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (22): CodeMirrorEditor, keybindingsCompartment, languageCompartment, readOnlyCompartment, themeCompartment, CodeMirrorEditorProps, CodeMirrorEditorRef, CursorPositionChangedEvent (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (24): parseAuthEditor(), updateValues(), ChangeHandler, DropdownEditor(), DropdownEditorProps, DropdownItem, getSelectedKey(), getSelectedKeys() (+16 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (26): canReplaceSpanWithId(), convertEditorState(), HTMLChangePlugin(), HTMLChangePluginProps, cleanHtmlString(), cleanStyleAttribute(), decodeSegmentValueInDomContext(), decodeSegmentValueInLexicalContext() (+18 more)

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (21): ChatButton(), ChatButtonProps, ChatIcon, CloseIcon, filterTextFieldStyles, navigateForwardIconProps, Overview(), OverviewProps (+13 more)

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (18): DictionaryCallbackProps, ErrorDetailsProps, ArrowNavigation(), AutoFocus(), AutoLink(), MATCHERS, ClearEditor(), ClearEditorProps (+10 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (24): Assertion(), AssertionAddEvent, AssertionAddHandler, AssertionDeleteEvent, AssertionDeleteHandler, AssertionProps, AssertionUpdateEvent, AssertionUpdateHandler (+16 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (23): EditorWrapper(), CollapsedDictionary(), CollapsedDictionaryProps, ExpandedDictionary(), ExpandedDictionaryEditorType, ExpandedDictionaryProps, isEmpty(), deleteButtonIconProps (+15 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (23): TokenType, $createExtendedTextNode(), $createPasswordNode(), $createTokenNode(), PastePlugin(), ChangeProps, UpdateEditorFromFilePicker(), getExpressionOutput() (+15 more)

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (20): useAzureCopilotButton(), useExternalLink(), useFeedbackMessage(), AgentHeader(), AssistantGreeting(), useAssistantGreetingStyles, AdditionalParametersItem, AgentHeaderItem (+12 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (20): CreateAgentParameter(), BaseEditor(), CreateNaturalLanguageToFlowInputInternal(), SimpleDictionary(), SimpleDictionaryProps, useStyles, SimpleDictionaryChangeModel, SimpleDictionaryItem() (+12 more)

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (18): BuiltinToolOption, BuiltinToolsEditor(), BuiltinToolsEditorProps, useBuiltinToolsStyles, isCustomCode(), CustomTokenField(), CustomTokenFieldProps, ICustomEditorAndOptions (+10 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (18): FormatBoldButton(), FormatBoldButtonProps, FormatButton(), FormatButtonProps, FormatItalicButton(), FormatItalicButtonProps, FormatLinkButton(), FormatLinkButtonProps (+10 more)

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (15): ToolReplyItem, badge, ToolReply(), Aborted(), Cancelled(), Failed(), Handoff(), Skipped() (+7 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (15): FilePickerEditor(), FilePickerEditorProps, PickerCallbackHandlers, FilePickerPopover(), FilePickerProps, FilePickerPopoverHeader(), FilePickerPopoverHeaderItem(), FilePickerPopoverHeaderProps (+7 more)

### Community 27 - "Community 27"
Cohesion: 0.13
Nodes (17): NoAgentParameters(), SearchVisual, AddIcon, SelectAgentParameter(), SelectAgentParameterProps, SINGLE_VALUE_SEGMENT, SingleValueSegment(), TokenPickerProps (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (17): HtmlViewToggleButton(), HtmlViewToggleButtonProps, RedoButton(), RedoButtonProps, UndoButton(), UndoButtonProps, CLOSE_DROPDOWN_COMMAND, DropDown() (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (17): useReportBugButton(), AssistantError(), AssistantErrorProps, ChatBubble(), ChatBubbleAction, ChatBubbleProps, ChatEntryReaction, CopyIcon (+9 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (19): FlowPreview(), FlowPreviewProps, IFlowDefinition, OperationContract, OperationPreview(), OperationPreviewProps, OperationsPreview(), OperationsPreviewProps (+11 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (17): ExpressionEditorEvent, SerializedTokenNode, TokenNodeProps, CLOSE_TOKENPICKER, CloseTokenPicker(), CloseTokenPickerPaylaod, CloseTokenPickerProps, INSERT_TOKEN_NODE (+9 more)

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (17): FunctionDefinition, FunctionGroupDefinition, FunctionGroupDefinitions, intl, ParameterDetails, Resources, SignatureInfo, allCompletions (+9 more)

### Community 33 - "Community 33"
Cohesion: 0.12
Nodes (17): CreateAgentParameterProps, options, getBrandColorWithOpacity(), opacityHexValues, CONDITION_RELATIONSHIP_VALUES, PANEL_TAB_NAMES, VARIABLE_TYPE, WORKFLOW_PARAMETER_SERIALIZED_TYPE (+9 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (17): animations, fadeIn, scaleFromLeft, scaleFromRight, slideFromBottom, backgroundMotion, ContainerWithProgressBar(), ContainerWithProgressBarProps (+9 more)

### Community 35 - "Community 35"
Cohesion: 0.16
Nodes (11): OperationGroupDetailsPageProps, mockOperationActionsData, mockOperationApi, OperationSearchCardProps, OperationSearchGroupProps, Grid(), GridProps, useGridStyles (+3 more)

### Community 36 - "Community 36"
Cohesion: 0.19
Nodes (13): ErrorBanner(), ErrorBannerProps, ICON_MAP, iconStyles, useCardKeyboardInteraction(), Card, CardProps, Gripper() (+5 more)

### Community 37 - "Community 37"
Cohesion: 0.19
Nodes (17): SettingProps, Expression(), ExpressionChangeHandler, ExpressionProps, Expressions(), ExpressionsEditor(), ExpressionsEditorProps, ExpressionsProps (+9 more)

### Community 39 - "Community 39"
Cohesion: 0.16
Nodes (11): ClearIcon, Combobox(), ComboboxItem, getDisplayValue(), getMode(), getSelectedKey(), getSelectedKeys(), Mode (+3 more)

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (14): basicColors, FONT_FAMILY_OPTIONS, FONT_SIZE_OPTIONS, FontDropDown(), FontDropdownProps, FontDropDownType, keyMoveMap, MoveWrapper() (+6 more)

### Community 41 - "Community 41"
Cohesion: 0.19
Nodes (15): generateDefaultAgentParamDescription(), generateDefaultAgentParamName(), Token, INITIALIZE_TOKENPICKER_AGENT_PARAMETER, TokenPickerAgentParameterHandler(), TokenPickerHandlerProps, INITIALIZE_TOKENPICKER_EXPRESSION, TokenPickerExpressionHandler() (+7 more)

### Community 42 - "Community 42"
Cohesion: 0.19
Nodes (12): calculateDuration(), StatusPill(), StatusPillProps, useStatusPillStyles, removeNewlinesAndSpaces(), getConnectorAllCategories(), getDurationString(), getDurationStringFromTimes() (+4 more)

### Community 43 - "Community 43"
Cohesion: 0.15
Nodes (13): $isPasswordNode(), SerializedPasswordNode, $isTokenNode(), EditorChangePlugin(), EditorChangePluginProps, ChangeProps, updateTokenNodes(), UpdateTokenNodesPayload (+5 more)

### Community 44 - "Community 44"
Cohesion: 0.19
Nodes (13): Recurrence, ScheduleEditor(), ScheduleEditorProps, convertRecurrenceToExpression(), getMinuteValueFromDatetimeString(), ISO_DAY_ORDER, Preview(), PreviewProps (+5 more)

### Community 45 - "Community 45"
Cohesion: 0.16
Nodes (12): useWorkflowParameterStyles, getFieldBooleanValue(), getWorkflowParameterTypeDisplayNames(), isSecureParameter(), ParameterFieldDetails, stringifyValue(), textStyles, WorkflowparameterField() (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.20
Nodes (10): AriaSearchResultsAlert(), AriaSearchResultsAlertProps, useAriaSearchResultsStyles, SearchResultSortOption, SearchResultSortOptions, getDefaultRuntimeCategories(), RuntimeFilterTagList(), RuntimeFilterTagListProperties (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.12
Nodes (14): OperationsNeedingAttentionItem, OperationsNeedingAttentionOnUserAction, IFlowDiffPreviewProps, OperationInfo, OperationInfoItemProps, OperationItem(), OperationItemProps, OperationItemsList() (+6 more)

### Community 48 - "Community 48"
Cohesion: 0.16
Nodes (13): OpenTokenPickerProps, TokenOption, TokenTypeAheadPlugin(), TokenTypeAheadPluginProps, TokenPickerMode, dynamicContentIconProps, expressionButtonProps, hideButtonOptions (+5 more)

### Community 49 - "Community 49"
Cohesion: 0.18
Nodes (13): ChatInput, ChatInputHandle, ChatInputSubmitButtonProps, IChatInputProps, SendIcon, StopIcon, useStyles, ChatSuggestion() (+5 more)

### Community 50 - "Community 50"
Cohesion: 0.17
Nodes (11): useConnectorSummaryCardStyles, ConnectorSummaryCard(), ConnectorSummaryCardProps, OperationRuntimeBadges(), OperationRuntimeBadgesProps, InfoDot(), InfoDotProps, useInfoDotStyles (+3 more)

### Community 51 - "Community 51"
Cohesion: 0.24
Nodes (11): AgentUrlButton, AgentUrlButtonProps, AgentUrlViewer(), AgentUrlViewerProps, IframeState, CopyInputControlWithAgent, CopyInputControlWithAgentProps, CopyIcon (+3 more)

### Community 52 - "Community 52"
Cohesion: 0.12
Nodes (5): PasswordNode, buttonStyles, CloseEye, EyeIcon, PasswordMaskPlugin()

### Community 53 - "Community 53"
Cohesion: 0.19
Nodes (12): ActionResult(), ActionResultProps, OutputsSettings(), OutputsSettingsProps, ActionResults, ActionResultUpdateEvent, ActionResultUpdateHandler, MockUpdateEvent (+4 more)

### Community 54 - "Community 54"
Cohesion: 0.18
Nodes (7): useBatchStyles, useDropdownDarkStyles, useDropdownStyles, useStaticResultStyles, useCommonDarkThemeStyles, useCommonStyles, DesignTokens

### Community 55 - "Community 55"
Cohesion: 0.13
Nodes (6): CardContextMenuProps, FUIReactMenuItem, FloatingActionMenuKind, ScratchProps, connectionContainerTokens, useConnectionContainerStyles

### Community 56 - "Community 56"
Cohesion: 0.18
Nodes (10): AssistantReplyWithFlow(), AssistantReplyWithFlowProps, changeIconMap, targetTypeDisplayNameMap, targetTypeIconMap, useStyles, AssistantReplyWithFlowItem, UndoStatus (+2 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (13): ConnectorAvatar(), ConnectorAvatarProps, IApiReference, BaseRecommendationPanelCardProps, isOperationData(), OperationGroupData, OperationsData, RecommendationPanelCard() (+5 more)

### Community 58 - "Community 58"
Cohesion: 0.19
Nodes (8): OperationSearchHeader(), OperationSearchHeaderProps, OperationSearchHeaderProps, OperationTypeFilter, OperationTypeFilterProps, DesignerSearchBox(), SearchBoxProps, useSearchBoxStyles

### Community 59 - "Community 59"
Cohesion: 0.23
Nodes (9): useAddActionCardStyles, AddActionCardPropsV2, AddActionCardV2(), useAddActionCardV2Styles, ADD_CARD_TYPE, AddActionCard(), AddActionCardProps, getCardStyle() (+1 more)

### Community 60 - "Community 60"
Cohesion: 0.31
Nodes (5): isBuiltInConnector(), isCustomConnector(), getOperationCardDataFromOperation(), OperationActionDataFromOperation(), getConnectorCategoryString()

### Community 61 - "Community 61"
Cohesion: 0.22
Nodes (11): isHighContrastBlack(), useWorkflowParametersStyles, WorkflowParameterDeleteHandler, WorkflowParameterUpdateHandler, CloseIcon, CreateIcon, InfoBar(), OnClickHandler (+3 more)

### Community 62 - "Community 62"
Cohesion: 0.25
Nodes (8): WorkflowParametersErrorCardProps, hasModifier(), isDeleteKey(), isDownArrowKey(), isEnterKey(), isEscapeKey(), isSpaceKey(), isUpArrowKey()

### Community 63 - "Community 63"
Cohesion: 0.19
Nodes (11): ConnectionsSetup(), ConnectionsSetupMessage(), ConnectionsSetupMessageProps, ConnectionsSetupProps, ConnectionsLoading(), ConnectionStatus(), ConnectionStatusList(), ConnectionStatusListProps (+3 more)

### Community 64 - "Community 64"
Cohesion: 0.18
Nodes (10): DotProps, TrafficLightDot(), CollapseIcon, DeleteIcon, ExpandIcon, RegisterLanguageHandler, WorkflowParameter(), WorkflowParameterDeleteEvent (+2 more)

### Community 65 - "Community 65"
Cohesion: 0.16
Nodes (4): ExtendedTextNode, SerializedExtendedTextNode, theme, defaultNodes

### Community 66 - "Community 66"
Cohesion: 0.18
Nodes (9): PromptGuideCardProps, contextualMenuStyles, headerBackButtonStyles, IPromptGuideContextualMenuProps, PromptGuideContextualMenu(), PromptGuideItem, PromptGuideItemKey, PromptGuideMenuKey (+1 more)

### Community 67 - "Community 67"
Cohesion: 0.21
Nodes (9): CardBadgeBar(), CardBadgeBarProps, CardBadgeProps, CardFooter, CardFooterProps, CommentBoxProps, CommentChangeEvent, MenuItemType (+1 more)

### Community 68 - "Community 68"
Cohesion: 0.22
Nodes (9): RecommendationPanelConstants, BrowseGrid(), BrowseGridProps, useBrowseResultStyles, filterOperationData(), getShouldUseSingleColumn(), SpotlightCategoryType, SpotlightSection() (+1 more)

### Community 69 - "Community 69"
Cohesion: 0.24
Nodes (7): Completed(), Empty(), MockStatusIcon(), MockStatusIconProps, useMockStatusIconStyles, OutputMock, getMockStatusString()

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (7): SearchableDropdown(), SearchableDropdownOption, SearchableDropdownProps, useSearchableDropdownStyles, SearchableDropdownWithAddAll(), SearchableDropdownWithAddAllProps, useSearchableDropdownWithAddAllStyles

### Community 72 - "Community 72"
Cohesion: 0.26
Nodes (8): useConditionExpressionStyles, buttonStyles, ConditionExpression(), ConditionExpressionProps, getWindowDimensions(), pivotStyles, TokenPickerPivot(), TokenPickerPivotProps

### Community 73 - "Community 73"
Cohesion: 0.26
Nodes (7): buildFoundryPortalUrl(), FoundryAgentDetails(), FoundryAgentDetailsProps, guidToBase64Url(), useFoundryAgentDetailsStyles, baseAgent, baseModels

### Community 74 - "Community 74"
Cohesion: 0.32
Nodes (7): ReactiveToggle(), ReactiveToggleProps, TextInputChangeHandler, SettingToggle(), SettingToggleProps, useStyles, ToggleChangeHandler

### Community 75 - "Community 75"
Cohesion: 0.23
Nodes (8): WorkflowParameterDefinition, ButtonProps, DeleteIcon, EditIcon, EditOrDeleteButton(), EditOrDeleteButtonProps, WorkflowParameterDeleteEvent, WorkflowParameterDeleteHandler

### Community 76 - "Community 76"
Cohesion: 0.29
Nodes (7): useAboutStyles, About(), AboutProps, BadgeProps, DocLinkClickedEventHandler, DocumentationItem(), DocumentationItemProps

### Community 77 - "Community 77"
Cohesion: 0.33
Nodes (7): FavoriteButton(), IFavoriteButtonProps, useStyles, OperationSearchGroup(), OperationGroupHeaderNew(), OperationGroupHeaderNewProps, useOperationSearchGroupStyles

### Community 78 - "Community 78"
Cohesion: 0.25
Nodes (10): colorVariableMap, cssToCamelCase(), fontVariableMap, generateImports(), generateStyleHook(), sizeVariableMap, spacingVariableMap, transformRule() (+2 more)

### Community 79 - "Community 79"
Cohesion: 0.24
Nodes (8): DropdownIcon, DropdownItem, DropdownSelectionChangeHandler, IDropdownOption, SelectionChangedEvent, SettingDropdown(), SettingDropdownProps, useStyles

### Community 80 - "Community 80"
Cohesion: 0.36
Nodes (7): BuiltInTextProps, LargeText(), MediumText(), SmallText(), TextProps, XLargeText(), XXLargeText()

### Community 81 - "Community 81"
Cohesion: 0.36
Nodes (4): MessageLevel, NodeMessage, ErrorSubsectionProps, NodeErrorCardProps

### Community 82 - "Community 82"
Cohesion: 0.39
Nodes (7): BaseTextProps, convertStringToNumberArray(), MinuteTextInput(), MinuteTextProps, useStyles, TextInput(), TextProps

### Community 83 - "Community 83"
Cohesion: 0.43
Nodes (4): useActionButtonV2Styles, ActionButtonV2(), ActionButtonV2Props, Plus()

### Community 84 - "Community 84"
Cohesion: 0.29
Nodes (5): AssistedConnectionProps, AzureResourcePickerProps, fuseOptions, GetResourceCallback, ResourceEntryProps

### Community 85 - "Community 85"
Cohesion: 0.43
Nodes (5): HTTP_STATUS_CODE_OPTIONS, SettingTagPicker(), SettingTagPickerProps, TagPickerOption, useStyles

### Community 86 - "Community 86"
Cohesion: 0.52
Nodes (3): useErrorStyles, SettingTextField(), SettingTextFieldProps

### Community 87 - "Community 87"
Cohesion: 0.43
Nodes (4): NodeCollapseToggle(), NodeCollapseToggleProps, useNodeCollapseToggleStyles, nodeButtonInteraction()

### Community 88 - "Community 88"
Cohesion: 0.29
Nodes (6): DropdownControl(), DropdownProps, dropdownStyle, DropdownType, hoursDropdownStyles, timezoneDropdownStyles

### Community 89 - "Community 89"
Cohesion: 0.48
Nodes (4): Tip(), TipButton, TipProps, useTipStyles

### Community 90 - "Community 90"
Cohesion: 0.53
Nodes (3): AnnouncedMatches(), AnnouncedMatchesProps, TokenPickerNoMatches()

### Community 91 - "Community 91"
Cohesion: 0.53
Nodes (3): useGraphContainerStyles, GraphContainer(), GraphContainerProps

### Community 92 - "Community 92"
Cohesion: 0.47
Nodes (3): Peek(), PeekProps, usePeekStyles

### Community 93 - "Community 93"
Cohesion: 0.53
Nodes (4): MultiSelectOption, MultiSelectSetting(), MultiSelectSettingProps, StatusChangeHandler

### Community 95 - "Community 95"
Cohesion: 0.60
Nodes (3): dropdownStyles, IdentityDropdown(), IdentityDropdownProps

## Knowledge Gaps
- **430 isolated node(s):** `cache`, `intl`, `NavigateIcon`, `AgentInstructions`, `AriaSearchResultsAlertProps` (+425 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ValueSegment` connect `Community 8` to `Community 2`, `Community 3`, `Community 4`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 15`, `Community 17`, `Community 19`, `Community 20`, `Community 23`, `Community 26`, `Community 27`, `Community 31`, `Community 39`, `Community 41`, `Community 43`, `Community 44`, `Community 70`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `createLiteralValueSegment()` connect `Community 14` to `Community 2`, `Community 3`, `Community 4`, `Community 39`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 44`, `Community 8`, `Community 43`, `Community 19`, `Community 55`, `Community 23`, `Community 26`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `TokenNode` connect `Community 70` to `Community 33`, `Community 65`, `Community 8`, `Community 13`, `Community 20`, `Community 31`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `cache`, `intl`, `NavigateIcon` to the rest of the system?**
  _430 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05002337540906966 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.052884615384615384 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06041986687147977 - nodes in this community are weakly interconnected._