import type { CustomCodeFileNameMapping } from '../../..';
import type { ConnectionReference, WorkflowParameter } from '../../../common/models/workflow';
import type { NodeDataWithOperationMetadata, PasteScopeAdditionalParams } from '../../actions/bjsworkflow/operationdeserializer';
import type { CustomCodeState } from '../../state/customcode/customcodeInterfaces';
import type { DependencyInfo, NodeDependencies, NodeInputs, NodeOperation, ParameterGroup } from '../../state/operation/operationMetadataSlice';
import type { VariableDeclaration } from '../../state/tokens/tokensSlice';
import { type NodesMetadata, type Operations as Actions } from '../../state/workflow/workflowInterfaces';
import type { WorkflowParameterDefinition } from '../../state/workflowparameters/workflowparametersSlice';
import type { RootState } from '../../store';
import type { GroupItemProps, OutputToken, ParameterInfo, RowItemProps, Token as SegmentToken, ValueSegment } from '@microsoft/designer-ui';
import { ArrayType, TokenType } from '@microsoft/designer-ui';
import type { DynamicParameters, Expression, InputParameter, ResolvedParameter, Segment, SwaggerParser, OperationManifest, RecurrenceSetting, OperationInfo } from '@microsoft/logic-apps-shared';
import { type Dispatch } from '@reduxjs/toolkit';
export declare const ParameterBrandColor = "#916F6F";
export declare const ParameterIcon = "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cGF0aCBkPSJtMCAwaDMydjMyaC0zMnoiIGZpbGw9IiM5MTZmNmYiLz4NCiA8ZyBmaWxsPSIjZmZmIj4NCiAgPHBhdGggZD0ibTE2LjAyMyAxMS41cTAuOTQ1MzEgMCAxLjc3MzQgMC4yODkwNiAwLjgyODEyIDAuMjg5MDYgMS40NDUzIDAuODM1OTQgMC42MTcxOSAwLjU0Njg4IDAuOTY4NzUgMS4zMjgxIDAuMzU5MzggMC43ODEyNSAwLjM1OTM4IDEuNzY1NiAwIDAuNTE1NjItMC4xNDA2MiAxLjA3ODEtMC4xMzI4MSAwLjU1NDY5LTAuNDIxODggMS4wMTU2LTAuMjgxMjUgMC40NTMxMi0wLjcyNjU2IDAuNzUtMC40Mzc1IDAuMjk2ODgtMS4wNDY5IDAuMjk2ODgtMC42NzE4OCAwLTAuOTY4NzUtMC4zNjcxOS0wLjI5Njg4LTAuMzY3MTktMC4zMDQ2OS0xLjAwNzhoLTAuMDMxMjVxLTAuMTc5NjkgMC42MTcxOS0wLjU4NTk0IDEtMC4zOTg0NCAwLjM3NS0xLjA3MDMgMC4zNzUtMC40NjA5NCAwLTAuNzk2ODgtMC4xNzk2OS0wLjMyODEyLTAuMTg3NS0wLjU0Njg4LTAuNDg0MzgtMC4yMTA5NC0wLjMwNDY5LTAuMzEyNS0wLjY4NzUtMC4xMDE1Ni0wLjM5MDYyLTAuMTAxNTYtMC44MDQ2OSAwLTAuNTQ2ODggMC4xNDA2Mi0xLjA5MzggMC4xNDg0NC0wLjU0Njg4IDAuNDQ1MzEtMC45NzY1NiAwLjI5Njg4LTAuNDI5NjkgMC43NS0wLjY5NTMxIDAuNDYwOTQtMC4yNzM0NCAxLjA4NTktMC4yNzM0NCAwLjE3OTY5IDAgMC4zNTkzOCAwLjA0Njg3IDAuMTg3NSAwLjA0Njg3IDAuMzUxNTYgMC4xNDA2MiAwLjE2NDA2IDAuMDkzNzUgMC4yODkwNiAwLjIzNDM4dDAuMTg3NSAwLjMyODEydi0wLjAzOTA1OHEwLjAxNTYzLTAuMTU2MjUgMC4wMjM0NC0wLjMxMjUgMC4wMTU2My0wLjE1NjI1IDAuMDMxMjUtMC4zMTI1aDAuNzI2NTZsLTAuMTg3NSAyLjIzNDRxLTAuMDIzNDQgMC4yNS0wLjA1NDY5IDAuNTA3ODEtMC4wMzEyNTEgMC4yNTc4MS0wLjAzMTI1MSAwLjUwNzgxIDAgMC4xNzE4OCAwLjAxNTYzIDAuMzgyODEgMC4wMjM0NCAwLjIwMzEyIDAuMDkzNzUgMC4zOTA2MiAwLjA3MDMxIDAuMTc5NjkgMC4yMDMxMiAwLjMwNDY5IDAuMTQwNjIgMC4xMTcxOSAwLjM3NSAwLjExNzE5IDAuMjgxMjUgMCAwLjUtMC4xMTcxOSAwLjIxODc1LTAuMTI1IDAuMzc1LTAuMzIwMzEgMC4xNjQwNi0wLjE5NTMxIDAuMjczNDQtMC40NDUzMSAwLjEwOTM4LTAuMjU3ODEgMC4xNzk2OS0wLjUyMzQ0IDAuMDcwMzEtMC4yNzM0NCAwLjA5Mzc1LTAuNTM5MDYgMC4wMzEyNS0wLjI2NTYyIDAuMDMxMjUtMC40ODQzOCAwLTAuODU5MzgtMC4yODEyNS0xLjUzMTJ0LTAuNzg5MDYtMS4xMzI4cS0wLjUtMC40NjA5NC0xLjIwMzEtMC43MDMxMi0wLjY5NTMxLTAuMjQyMTktMS41MjM0LTAuMjQyMTktMC44OTg0NCAwLTEuNjMyOCAwLjMzNTk0LTAuNzI2NTYgMC4zMzU5NC0xLjI1IDAuOTE0MDYtMC41MTU2MiAwLjU3MDMxLTAuNzk2ODggMS4zMzU5dC0wLjI4MTI1IDEuNjMyOHEwIDAuODk4NDQgMC4yNzM0NCAxLjYzMjggMC4yODEyNSAwLjcyNjU2IDAuNzk2ODggMS4yNDIydDEuMjQyMiAwLjc5Njg4cTAuNzM0MzggMC4yODEyNSAxLjYzMjggMC4yODEyNSAwLjYzMjgxIDAgMS4yNS0wLjEwMTU2IDAuNjI1LTAuMTAxNTYgMS4xOTUzLTAuMzc1djAuNzE4NzVxLTAuNTg1OTQgMC4yNS0xLjIyNjYgMC4zNDM3NS0wLjY0MDYzIDAuMDg1OTM4LTEuMjczNCAwLjA4NTkzOC0xLjAzOTEgMC0xLjg5ODQtMC4zMjAzMS0wLjg1OTM4LTAuMzI4MTItMS40ODQ0LTAuOTIxODgtMC42MTcxOS0wLjYwMTU2LTAuOTYwOTQtMS40NTMxLTAuMzQzNzUtMC44NTE1Ni0wLjM0Mzc1LTEuODk4NCAwLTEuMDU0NyAwLjM1MTU2LTEuOTUzMSAwLjM1MTU2LTAuODk4NDQgMC45ODQzOC0xLjU1NDcgMC42MzI4MS0wLjY1NjI1IDEuNTE1Ni0xLjAyMzQgMC44ODI4MS0wLjM3NSAxLjk1MzEtMC4zNzV6bS0wLjYwOTM3IDYuNjc5N3EwLjQ3NjU2IDAgMC43ODEyNS0wLjI2NTYyIDAuMzA0NjktMC4yNzM0NCAwLjQ3NjU2LTAuNjcxODggMC4xNzE4OC0wLjM5ODQ0IDAuMjM0MzgtMC44NTE1NiAwLjA3MDMxLTAuNDUzMTIgMC4wNzAzMS0wLjgyMDMxIDAtMC4yNjU2Mi0wLjA1NDY5LTAuNDkyMTktMC4wNTQ2OS0wLjIyNjU2LTAuMTc5NjktMC4zOTA2Mi0wLjExNzE5LTAuMTY0MDYtMC4zMjAzMS0wLjI1NzgxdC0wLjQ5MjE5LTAuMDkzNzVxLTAuNDUzMTIgMC0wLjc1NzgxIDAuMjM0MzgtMC4zMDQ2OSAwLjIzNDM4LTAuNDkyMTkgMC41ODU5NC0wLjE4NzUgMC4zNTE1Ni0wLjI3MzQ0IDAuNzczNDQtMC4wNzgxMyAwLjQxNDA2LTAuMDc4MTMgMC43ODEyNSAwIDAuMjU3ODEgMC4wNTQ2OSAwLjUyMzQ0IDAuMDU0NjkgMC4yNTc4MSAwLjE3OTY5IDAuNDY4NzUgMC4xMjUgMC4yMTA5NCAwLjMzNTk0IDAuMzQzNzUgMC4yMTA5NCAwLjEzMjgxIDAuNTE1NjIgMC4xMzI4MXptLTcuNDE0MS04LjE3OTdoM3YxaC0ydjEwaDJ2MWgtM3ptMTYgMHYxMmgtM3YtMWgydi0xMGgtMnYtMXoiIHN0cm9rZS13aWR0aD0iLjQiLz4NCiA8L2c+DQo8L3N2Zz4NCg==";
export declare const AgentParameterBrandColor = "#072a8e";
export declare const AgentParameterIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiBpZD0idXVpZC1hOTNkNmI0YS02N2Y2LTQ1MjAtODNhOS0yMGIwZGJlMjQ1Y2YiIGRhdGEtbmFtZT0iTGF5ZXIgMSIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiB2aWV3Qm94PSIwIDAgMTggMTgiPg0KICA8ZGVmcz4NCiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9InV1aWQtMGJmODYwMGYtNmQ3ZC00OTZmLWE1ZGMtZDJhZjg2ZGQ2NGNmIiBjeD0iLTY3Ljk4MSIgY3k9Ijc5My4xOTkiIGZ4PSItNjcuOTgxIiBmeT0iNzkzLjE5OSIgcj0iLjQ1IiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKC0xNzkzOS4wMyAyMDM2OC4wMjkpIHJvdGF0ZSg0NSkgc2NhbGUoMjUuMDkxIC0zNC4xNDkpIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+DQogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM4M2I5ZjkiLz4NCiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwNzhkNCIvPg0KICAgIDwvcmFkaWFsR3JhZGllbnQ+DQogIDwvZGVmcz4NCiAgPHBhdGggZD0ibTAsMi43djEyLjZjMCwxLjQ5MSwxLjIwOSwyLjcsMi43LDIuN2gxMi42YzEuNDkxLDAsMi43LTEuMjA5LDIuNy0yLjdWMi43YzAtMS40OTEtMS4yMDktMi43LTIuNy0yLjdIMi43QzEuMjA5LDAsMCwxLjIwOSwwLDIuN1pNMTAuOCwwdjMuNmMwLDMuOTc2LDMuMjI0LDcuMiw3LjIsNy4yaC0zLjZjLTMuOTc2LDAtNy4xOTksMy4yMjItNy4yLDcuMTk4di0zLjU5OGMwLTMuOTc2LTMuMjI0LTcuMi03LjItNy4yaDMuNmMzLjk3NiwwLDcuMi0zLjIyNCw3LjItNy4yWiIgZmlsbD0idXJsKCN1dWlkLTBiZjg2MDBmLTZkN2QtNDk2Zi1hNWRjLWQyYWY4NmRkNjRjZikiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlLXdpZHRoPSIwIi8+DQo8L3N2Zz4=";
export declare const FxBrandColor = "#AD008C";
export declare const FxIcon = "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzNCAzNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cmVjdCB3aWR0aD0iMzQiIGhlaWdodD0iMzQiIGZpbGw9IiNhZDAwOGMiLz4NCiA8cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMTMuNDg3LDEzLjI0OGE3LjA1NCw3LjA1NCwwLDAsMSwxLjg0OS0zLjY5QTUuMyw1LjMsMCwwLDEsMTguNTkzLDcuOWMuOTg1LDAsMS40NjcuNTg1LDEuNDQ3LDEuMDY5YTEuNTUxLDEuNTUxLDAsMCwxLS43NDQsMS4xNDkuNDA2LjQwNiwwLDAsMS0uNTQzLS4wNjFjLS41NDMtLjY2NS0xLjAwNS0xLjA2OS0xLjM2Ny0xLjA2OS0uNC0uMDItLjc2NC4yODItMS40MDcsNC4yNTVoMi4zMzJsLS40MjIuODA3LTIuMDkuMTYxYy0uMzQyLDEuODM1LS42LDMuNjMtMS4xNDYsNS45MDgtLjc4NCwzLjMyNy0xLjY4OCw0LjY1OC0zLjEsNS44MjdBMy43NDYsMy43NDYsMCwwLDEsOS4zNDcsMjdDOC42ODMsMjcsOCwyNi41NTYsOCwyNi4wMzJhMS42OTIsMS42OTIsMCwwLDEsLjcyNC0xLjE0OWMuMTYxLS4xMjEuMjgxLS4xNDEuNDIyLS4wNGEyLjg3MywyLjg3MywwLDAsMCwxLjU2OC43MDYuNjc1LjY3NSwwLDAsMCwuNjYzLS41LDI3LjQyNywyNy40MjcsMCwwLDAsLjg0NC00LjE3NGMuNDYyLTIuNzYyLjc0NC00LjY1OCwxLjA4NS02LjY1NEgxMS43bC0uMS0uMi42ODMtLjc2NloiLz4NCiA8cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMTcuMzIxLDE4LjljLjgxMi0xLjE4MywxLjY1NC0xLjg3NCwyLjIzNi0xLjg3NC40OSwwLC43MzUuNTIyLDEuMDU3LDEuNDlsLjIzLjcyMmMxLjE2NC0xLjY3NSwxLjczMS0yLjIxMiwyLjQtMi4yMTJhLjc0Mi43NDIsMCwwLDEsLjc1MS44NDUuOTIyLjkyMiwwLDAsMS0uOC44NzYuNDE0LjQxNCwwLDAsMS0uMjkxLS4xNjkuNDc3LjQ3NywwLDAsMC0uMzY4LS4xODRjLS4xNTMsMC0uMzM3LjEwOC0uNjEzLjM4NGE4LjU0Nyw4LjU0NywwLDAsMC0uODczLDEuMDc1bC42MTMsMS45NjZjLjE4NC42My4zNjcuOTUyLjU2Ny45NTIuMTg0LDAsLjUwNi0uMjQ2LDEuMDQyLS44OTFsLjMyMi4zODRjLS45LDEuNDI5LTEuNzYxLDEuOTItMi4zNDMsMS45Mi0uNTIxLDAtLjg1OC0uNDMtMS4xOC0xLjQ5bC0uMzUyLTEuMTY4Yy0xLjE3OSwxLjkyLTEuNzQ2LDIuNjU4LTIuNTQzLDIuNjU4YS44MTUuODE1LDAsMCwxLS44MTItLjg3NS45LjksMCwwLDEsLjc2Ni0uOTIyLjQ5My40OTMsMCwwLDEsLjI5MS4xNTQuNTE0LjUxNCwwLDAsMCwuMzY4LjE2OWMuMzM3LDAsLjk1LS42NzYsMS43MTUtMS44NTlsLS40LTEuMzY3Yy0uMjc2LS45MDYtLjQxNC0xLjAxNC0uNTY3LTEuMDE0LS4xMzgsMC0uNDE0LjItLjg4OC44MTRaIi8+DQo8L3N2Zz4NCg==";
export declare const VariableBrandColor = "#770bd6";
export declare const VariableIcon = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzJweCIgaGVpZ2h0PSIzMnB4IiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAzMiAzMiIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjNzcwQkQ2Ii8+DQogPGcgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Ik02Ljc2MywxMy42ODV2LTMuMjA4QzYuNzYzLDguNzQ4LDcuNzYyLDgsMTAsOHYxLjA3Yy0xLDAtMiwwLjMyNS0yLDEuNDA3djMuMTg4ICAgIEM4LDE0LjgzNiw2LjUxMiwxNiw1LjUxMiwxNkM2LjUxMiwxNiw4LDE3LjE2NCw4LDE4LjMzNVYyMS41YzAsMS4wODIsMSwxLjQyOSwyLDEuNDI5VjI0Yy0yLjIzOCwwLTMuMjM4LTAuNzcyLTMuMjM4LTIuNXYtMy4xNjUgICAgYzAtMS4xNDktMC44OTMtMS41MjktMS43NjMtMS41ODV2LTEuNUM1Ljg3LDE1LjE5NCw2Ljc2MywxNC44MzQsNi43NjMsMTMuNjg1eiIvPg0KICA8cGF0aCBkPSJtMjUuMjM4IDEzLjY4NXYtMy4yMDhjMC0xLjcyOS0xLTIuNDc3LTMuMjM4LTIuNDc3djEuMDdjMSAwIDIgMC4zMjUgMiAxLjQwN3YzLjE4OGMwIDEuMTcxIDEuNDg4IDIuMzM1IDIuNDg4IDIuMzM1LTEgMC0yLjQ4OCAxLjE2NC0yLjQ4OCAyLjMzNXYzLjE2NWMwIDEuMDgyLTEgMS40MjktMiAxLjQyOXYxLjA3MWMyLjIzOCAwIDMuMjM4LTAuNzcyIDMuMjM4LTIuNXYtMy4xNjVjMC0xLjE0OSAwLjg5My0xLjUyOSAxLjc2Mi0xLjU4NXYtMS41Yy0wLjg3LTAuMDU2LTEuNzYyLTAuNDE2LTEuNzYyLTEuNTY1eiIvPg0KICA8cGF0aCBkPSJtMTUuODE1IDE2LjUxMmwtMC4yNDItMC42NDFjLTAuMTc3LTAuNDUzLTAuMjczLTAuNjk4LTAuMjg5LTAuNzM0bC0wLjM3NS0wLjgzNmMtMC4yNjYtMC41OTktMC41MjEtMC44OTgtMC43NjYtMC44OTgtMC4zNyAwLTAuNjYyIDAuMzQ3LTAuODc1IDEuMDM5LTAuMTU2LTAuMDU3LTAuMjM0LTAuMTQxLTAuMjM0LTAuMjUgMC0wLjMyMyAwLjE4OC0wLjY5MiAwLjU2Mi0xLjEwOSAwLjM3NS0wLjQxNyAwLjcxLTAuNjI1IDEuMDA3LTAuNjI1IDAuNTgzIDAgMS4xODYgMC44MzkgMS44MTEgMi41MTZsMC4xNjEgMC40MTQgMC4xOC0wLjI4OWMxLjEwOC0xLjc2IDIuMDQ0LTIuNjQxIDIuODA0LTIuNjQxIDAuMTk4IDAgMC40MyAwLjA1OCAwLjY5NSAwLjE3MmwtMC45NDYgMC45OTJjLTAuMTI1LTAuMDM2LTAuMjE0LTAuMDU1LTAuMjY2LTAuMDU1LTAuNTczIDAtMS4yNTYgMC42NTktMi4wNDggMS45NzdsLTAuMjI3IDAuMzc5IDAuMTc5IDAuNDhjMC42ODQgMS44OTEgMS4yNDkgMi44MzYgMS42OTQgMi44MzYgMC40MDggMCAwLjcyLTAuMjkyIDAuOTM1LTAuODc1IDAuMTQ2IDAuMDk0IDAuMjE5IDAuMTkgMC4yMTkgMC4yODkgMCAwLjI2MS0wLjIwOCAwLjU3My0wLjYyNSAwLjkzOHMtMC43NzYgMC41NDctMS4wNzggMC41NDdjLTAuNjA0IDAtMS4yMjEtMC44NTItMS44NTEtMi41NTVsLTAuMjE5LTAuNTc4LTAuMjI3IDAuMzk4Yy0xLjA2MiAxLjgyMy0yLjA3OCAyLjczNC0zLjA0NyAyLjczNC0wLjM2NSAwLTAuNjc1LTAuMDkxLTAuOTMtMC4yNzFsMC45MDYtMC44ODVjMC4xNTYgMC4xNTYgMC4zMzggMC4yMzQgMC41NDcgMC4yMzQgMC41ODggMCAxLjI1LTAuNTk2IDEuOTg0LTEuNzg2bDAuNDA2LTAuNjU4IDAuMTU1LTAuMjU5eiIvPg0KICA8ZWxsaXBzZSB0cmFuc2Zvcm09Im1hdHJpeCguMDUzNiAtLjk5ODYgLjk5ODYgLjA1MzYgNS40OTI1IDMyLjI0NSkiIGN4PSIxOS43NTciIGN5PSIxMy4yMjUiIHJ4PSIuNzc4IiByeT0iLjc3OCIvPg0KICA8ZWxsaXBzZSB0cmFuc2Zvcm09Im1hdHJpeCguMDUzNiAtLjk5ODYgLjk5ODYgLjA1MzYgLTcuNTgzOSAzMC42MjkpIiBjeD0iMTIuMzY2IiBjeT0iMTkuMzE1IiByeD0iLjc3OCIgcnk9Ii43NzgiLz4NCiA8L2c+DQo8L3N2Zz4NCg==";
export declare const ItemBrandColor = "#486991";
export declare const ItemIcon = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGQ9Im0wIDBoMzJ2MzJoLTMyeiIgZmlsbD0iIzQ4Njk5MSIvPg0KIDxwYXRoIGQ9Ik0xMSAyMGg3LjJsMSAxaC05LjJ2LTguM2wtMS4zIDEuMy0uNy0uNyAyLjUtMi41IDIuNSAyLjUtLjcuNy0xLjMtMS4zem0xMi4zLTJsLjcuNy0yLjUgMi41LTIuNS0yLjUuNy0uNyAxLjMgMS4zdi03LjNoLTcuMmwtMS0xaDkuMnY4LjN6IiBmaWxsPSIjZmZmIi8+DQo8L3N2Zz4NCg==";
export declare const httpWebhookBrandColor = "#709727";
export declare const httpWebhookIcon = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGZpbGw9IiM3MDk3MjciIGQ9Im0wIDBoMzJ2MzJoLTMyeiIvPg0KIDxnIGZpbGw9IiNmZmYiPg0KICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMTEuODE3IDIxLjIwNmMtLjM2NyAwLS42NjEtLjE0Ny0uNjYxLS41ODdsLS4wNzMtMS43NjJjLS4wNzMtMS4xMDEtLjE0Ny0yLjIwMi0xLjI0OC0yLjkzNi42NjEtLjQ0IDEuMTAxLTEuMTAxIDEuMTc0LTEuODM1bC4xNDctMi4yMDJjMC0xLjAyOC4yMi0xLjMyMSAxLjEwMS0xLjE3NGguMDczYy4wNzMtLjA3My4yMi0uMTQ3LjIyLS4yMnYtMS4yNDhoLS44MDdjLTEuMzIxIDAtMi4wNTUuNzM0LTIuMTI5IDIuMDU1LS4wNzMuNzM0LS4wNzMgMS41NDItLjA3MyAyLjI3NiAwIDEuMTAxLS4zNjcgMS4zOTUtMS4zMjEgMS42MTUtLjA3MyAwLS4yMi4yMi0uMjIuMjk0djEuMDI4YzAgLjI5NC4wNzMuMzY3LjM2Ny4zNjcuNTg3IDAgLjg4MS4yMiAxLjAyOC44MDcuMDczLjI5NC4xNDcuNjYxLjE0Ny45NTRsLjA3MyAyLjIwMmMuMDczLjczNC4yOTQgMS4zOTUgMS4wMjggMS42ODguNTg3LjI5NCAxLjI0OC4yOTQgMS45ODIuMjJ2LS42NjFjLS4wNzMtLjgwNy0uMDczLS44ODEtLjgwNy0uODgxeiIvPg0KICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMjMuNjM1IDE1LjExM2MtLjQ0IDAtLjgwNy0uMjItLjk1NC0uNjYxbC0uMjItMS4xMDFjLS4wNzMtLjczNC0uMDczLTEuMzk1LS4wNzMtMi4xMjktLjA3My0xLjI0OC0uODA3LTEuOTA5LTEuOTgyLTEuOTgyLS45NTQtLjA3My0uOTU0LS4wNzMtLjk1NC44ODF2LjA3M2MwIC41MTQgMCAuNTE0LjUxNC41MTQuNjYxIDAgLjg4MS4yMi44ODEuODgxIDAgLjczNCAwIDEuMzk1LjA3MyAyLjEyOS4wNzMuODA3LjI5NCAxLjYxNSAxLjAyOCAyLjEyOWwuMjIuMTQ3Yy0uNzM0LjQ0LTEuMTAxIDEuMTAxLTEuMTc0IDEuOTA5LS4wNzMuNzM0LS4xNDcgMS40NjgtLjE0NyAyLjEyOSAwIDEuMDI4LS4yMiAxLjMyMS0xLjE3NCAxLjI0OC0uMDczIDAtLjI5NC4xNDctLjI5NC4yMnYxLjI0OGgxLjAyOGMxLjAyOC0uMDczIDEuNjE1LS41ODcgMS44MzUtMS42MTUuMTQ3LS41ODcuMDczLTEuMjQ4LjE0Ny0xLjgzNSAwLS40NCAwLS44ODEuMDczLTEuMzIxLjA3My0uNzM0LjQ0LTEuMTAxIDEuMTc0LTEuMTAxLjIyIDAgLjI5NC0uMDczLjI5NC0uMjk0di0uOTU0Yy4xNDctLjQ0LjA3My0uNTg3LS4yOTQtLjUxNHoiLz4NCiAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTEyLjc3MSAxNS4wNGMtLjUxNCAwLS45NTQuNDQtLjk1NC45NTRzLjQ0Ljg4MS45NTQuODgxLjk1NC0uMzY3Ljk1NC0uOTU0YzAtLjUxNC0uNDQtLjg4MS0uOTU0LS44ODF6Ii8+DQogIDxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0xNi4wMDEgMTUuMDRjLS41MTQgMC0uOTU0LjM2Ny0uOTU0Ljg4MSAwIC41ODcuMzY3Ljk1NC44ODEuOTU0cy45NTQtLjM2Ny45NTQtLjg4MWMuMDczLS41ODctLjI5NC0uOTU0LS44ODEtLjk1NHoiLz4NCiAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTIwLjE4NSAxNS45MmMwLS41MTQtLjQ0LS44ODEtLjk1NC0uODgxcy0uOTU0LjQ0LS45NTQuODgxYzAgLjUxNC40NC45NTQuOTU0Ljk1NHMuOTU0LS40NC45NTQtLjk1NHoiLz4NCiA8L2c+DQo8L3N2Zz4NCg==";
export declare const ParameterGroupKeys: {
    DEFAULT: string;
    RECURRENCE: string;
};
export interface RepetitionContext {
    splitOn?: string;
    repetitionReferences: RepetitionReference[];
}
export interface RepetitionReference {
    actionName: string;
    actionType: string;
    repetitionValue: any;
    repetitionStep?: string;
    repetitionPath?: string;
}
export interface UpdateParameterAndDependenciesPayload {
    nodeId: string;
    groupId: string;
    parameterId: string;
    properties: Partial<ParameterInfo>;
    isTrigger: boolean;
    operationInfo: NodeOperation;
    connectionReference: ConnectionReference;
    nodeInputs: NodeInputs;
    dependencies: NodeDependencies;
    updateTokenMetadata?: boolean;
    operationDefinition?: any;
    skipStateSave?: boolean;
    loadDynamicOutputs?: boolean;
    loadDefaultValues?: boolean;
}
export declare function getParametersSortedByVisibility(parameters: ParameterInfo[]): ParameterInfo[];
export declare function addRecurrenceParametersInGroup(parameterGroups: Record<string, ParameterGroup>, recurrence: RecurrenceSetting | undefined, definition: any, shouldEncodeBasedOnMetadata?: boolean): void;
export declare const getDependentParameters: (inputs: NodeInputs, parameters: Record<string, any> | DynamicParameters) => Record<string, {
    isValid: boolean;
}>;
/**
 * Converts to parameter info map.
 * @arg {InputParameter[]} inputParameters - The input parameters.
 * @arg {any} [stepDefinition] - The step definition.
 */
export declare function toParameterInfoMap(inputParameters: InputParameter[], stepDefinition?: any, shouldEncodeBasedOnMetadata?: boolean): ParameterInfo[];
/**
 * Gets the parameter info object for UI elements from the resolved parameters from schema, swagger, definition, etc.
 * @arg {ResolvedParameter} parameter - An object with metadata about a Swagger input parameter.
 * @arg {Record<string, string>} [metadata] - A hash mapping dynamic value lookup values to their display strings.
 * @arg {boolean} [shouldIgnoreDefaultValue=false] - True if should not populate with default value of dynamic parameter.
 * @return {ParameterInfo} - An object with the view model for an input parameter field.
 */
export declare function createParameterInfo(parameter: ResolvedParameter, metadata?: Record<string, string>, shouldIgnoreDefaultValue?: boolean, shouldEncodeBasedOnMetadata?: boolean): ParameterInfo;
export declare function getParameterEditorProps(parameter: InputParameter, parameterValue: ValueSegment[], _shouldIgnoreDefaultValue: boolean, nodeMetadata?: Record<string, any>): ParameterEditorProps;
export interface LoadParamteerValueFromStringOptions {
    removeQuotesFromExpression?: boolean;
    trimExpression?: boolean;
    convertIfContainsExpression?: boolean;
    parameterType?: string;
}
export declare const loadParameterValueFromString: (value: string, options?: LoadParamteerValueFromStringOptions) => ValueSegment[];
export declare const convertStringToInputParameter: (value: string, options: LoadParamteerValueFromStringOptions) => InputParameter;
export declare const toArrayViewModelSchema: (schema: any) => {
    arrayType: ArrayType;
    itemSchema: any;
    uncastedValue: undefined;
};
export declare const toSimpleQueryBuilderViewModel: (input: any) => {
    isOldFormat: boolean;
    itemValue: RowItemProps | undefined;
    isRowFormat: boolean;
};
export declare const canConvertToComplexCondition: (input: any) => boolean;
export declare const toHybridConditionViewModel: (input: any) => {
    items: GroupItemProps;
};
export declare const toConditionViewModel: (input: any) => {
    items: GroupItemProps;
};
interface ParameterEditorProps {
    editor?: string;
    editorOptions?: Record<string, any>;
    editorViewModel?: any;
    schema: any;
}
export declare function shouldIncludeSelfForRepetitionReference(manifest: OperationManifest, parameterName?: string): boolean;
export declare function loadParameterValue(parameter: InputParameter, shouldEncodeBasedOnMetadata?: boolean): ValueSegment[];
export declare function compressSegments(segments: ValueSegment[], addInsertAnchorIfNeeded?: boolean): ValueSegment[];
export declare function convertToTokenExpression(value: any): string;
export declare function convertToValueSegments(value: any, shouldUncast: boolean, parameterType?: string, parameterSchema?: any): ValueSegment[];
export declare function getAllInputParameters(nodeInputs: NodeInputs): ParameterInfo[];
export declare function shouldUseParameterInGroup(parameter: ParameterInfo, allParameters: ParameterInfo[]): boolean;
export declare function ensureExpressionValue(valueSegment: ValueSegment, calculateValue?: boolean): void;
export declare function getExpressionValueForOutputToken(token: OutputToken, nodeType: string): string | undefined;
export declare function getTokenExpressionMethodFromKey(key: string, actionName?: string, source?: string): string;
export declare function generateExpressionFromKey(method: string, tokenKey: string, actionName: string | undefined, isInsideArray: boolean, required: boolean, overrideMethod?: boolean): string;
export declare function getTokenValueFromToken(tokenType: TokenType, functionArguments: string[]): string | undefined;
export declare function getTokenExpressionValue(token: SegmentToken, currentValue?: string): string;
export declare function convertPathToBracketsFormat(path: string, optional: boolean): string;
export declare function loadParameterValuesFromDefault(inputParameters: Record<string, InputParameter>): void;
export declare function loadParameterValuesArrayFromDefault(inputParameters: InputParameter[]): void;
export declare function updateParameterWithValues(parameterKey: string, parameterValue: any, parameterLocation: string, availableInputParameters: InputParameter[], createInvisibleParameter?: boolean, useDefault?: boolean): InputParameter[];
export declare function getAndEscapeSegment(segment: Segment, decodeSegment?: boolean): string | number;
/**
 * Converts the value to a string that will be evaluated to the original value at runtime.
 * @arg {string} value - The value that the returned string will be evaluated to.
 * @return {string}
 */
export declare function tryConvertStringToExpression(value: string): string;
export declare function transformInputParameter(inputParameter: InputParameter, parameterValue: any, invisible?: boolean): InputParameter;
/**
 * Check whether the specified value is compatiable with provided schema
 * @arg {any} value - The specified value.
 * @arg {any} schema - The provided schema. If isArray is true, it is the array's item schema, otherwise, it's the object schema
 * @arg {boolean} isArray - The flag to check for an array value.
 * @arg {boolean} shallowArrayCheck - The flag to indicate whether the checking is shallow check only or dive into property or nested item.
 * @return {boolean} - Return true if the value match the schema, otherwise return false.
 */
export declare function isArrayOrObjectValueCompatibleWithSchema(value: any, schema: any, isArray: boolean, shallowArrayCheck?: boolean): boolean;
export declare const updateParameterAndDependencies: import("@reduxjs/toolkit").AsyncThunk<void, UpdateParameterAndDependenciesPayload, {
    state?: unknown;
    dispatch?: Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const updateDynamicDataInNode: (nodeId: string, isTrigger: boolean, operationInfo: NodeOperation, connectionReference: ConnectionReference | undefined, dependencies: NodeDependencies, dispatch: Dispatch, getState: () => RootState, variableDeclarations?: Record<string, VariableDeclaration[]>, workflowParameterDefinitions?: Record<string, WorkflowParameterDefinition>, updateTokenMetadata?: boolean, operationDefinition?: any, loadDynamicOutputs?: boolean, loadDefaultValues?: boolean) => Promise<void>;
export declare const loadDynamicContentForInputsInNode: (nodeId: string, isTrigger: boolean, inputDependencies: Record<string, DependencyInfo>, operationInfo: NodeOperation, connectionReference: ConnectionReference | undefined, dispatch: Dispatch, getState: () => RootState, variableDeclarations?: Record<string, VariableDeclaration[]>, workflowParameterDefinitions?: Record<string, WorkflowParameterDefinition>, updateTokenMetadata?: boolean, operationDefinition?: any, loadDynamicOutputs?: boolean, loadDefaultValues?: boolean) => Promise<void>;
export declare function getDisplayValueFromPickerSelectedItem(selectedItem: any, parameter: ParameterInfo, dependencies: NodeDependencies): string;
export declare function getValueFromPickerSelectedItem(selectedItem: any, parameter: ParameterInfo, dependencies: NodeDependencies): string;
export declare function loadDynamicTreeItemsForParameter(nodeId: string, groupId: string, parameterId: string, selectedValue: any | undefined, operationInfo: NodeOperation, connectionReference: ConnectionReference | undefined, nodeInputs: NodeInputs, dependencies: NodeDependencies, showErrorWhenNotReady: boolean, dispatch: Dispatch, idReplacements: Record<string, string> | undefined, workflowParameters: Record<string, WorkflowParameterDefinition>): Promise<void>;
export declare function loadDynamicValuesForParameter(nodeId: string, groupId: string, parameterId: string, operationInfo: NodeOperation, connectionReference: ConnectionReference | undefined, nodeInputs: NodeInputs, dependencies: NodeDependencies, showErrorWhenNotReady: boolean, dispatch: Dispatch, idReplacements: Record<string, string> | undefined, workflowParameters: Record<string, WorkflowParameterDefinition>): Promise<void>;
export declare function fetchDynamicValuesForParameter(groupId: string, parameterId: string, operationInfo: NodeOperation, connectionReference: ConnectionReference | undefined, nodeInputs: NodeInputs, dependencies: NodeDependencies, showErrorWhenNotReady: boolean, idReplacements: Record<string, string> | undefined, workflowParameters: Record<string, WorkflowParameterDefinition>, nodeId: string, dispatch: Dispatch): Promise<{
    parameterId: string;
    groupId: string;
    propertiesToUpdate: any;
} | undefined>;
export declare function shouldLoadDynamicInputs(nodeInputs: NodeInputs): boolean;
export declare const isDynamicDataReadyToLoad: ({ dependentParameters }: DependencyInfo) => boolean;
export declare function fetchErrorWhenDependenciesNotReady(groupId: string, parameterId: string, dependencyInfo: DependencyInfo, groupParameters: ParameterInfo[], isTreeCall: boolean): any;
export declare const iterateSimpleQueryBuilderEditor: (itemValue: RowItemProps, isRowFormat: boolean, idReplacements?: Record<string, string>) => string | undefined;
export declare const recurseSerializeCondition: (parameter: ParameterInfo, editorViewModel: any, isDefinitionValue: boolean, idReplacements?: Record<string, string>, errors?: string[], shouldEncodeBasedOnMetadata?: boolean) => any;
export declare function getParameterFromName(nodeInputs: NodeInputs, parameterName: string): ParameterInfo | undefined;
export declare function getParameterFromId(nodeInputs: NodeInputs, parameterId: string): ParameterInfo | undefined;
export declare function parameterHasValue(parameter: ParameterInfo): boolean;
export declare function parameterValidForDynamicCall(parameter: ParameterInfo): boolean;
export declare function getGroupAndParameterFromParameterKey(nodeInputs: NodeInputs, parameterKey: string): {
    groupId: string;
    parameter: ParameterInfo;
} | undefined;
export declare function getGroupIdFromParameterId(nodeInputs: NodeInputs, parameterId: string): string | undefined;
export declare const getCustomCodeFileNameFromParameter: (parameter: ParameterInfo) => string;
export declare const getCustomCodeFileName: (nodeId: string, nodeInputs?: NodeInputs, idReplacements?: Record<string, string>) => string;
export declare const getCustomCodeFilesWithData: (state: CustomCodeState) => CustomCodeFileNameMapping;
export declare function getInputsValueFromDefinitionForManifest(inputsLocation: string[], manifest: OperationManifest, customSwagger: SwaggerParser | undefined, stepDefinition: any, allInputs: InputParameter[]): any;
export declare function escapeSchemaProperties(schemaProperties: Record<string, any>): Record<string, any>;
export declare function getNormalizedName(name: string): string;
export declare function getRepetitionReference(repetitionContext: RepetitionContext, actionName?: string): RepetitionReference | undefined;
export declare const updateTokenMetadataInParameters: (nodeId: string, parameters: ParameterInfo[], rootState: RootState) => void;
export declare const flattenAndUpdateViewModel: (nodeId: string, repetitionContext: RepetitionContext, items: any, actionNodes: Record<string, string>, triggerNodeId: string, nodes: Record<string, Partial<NodeDataWithOperationMetadata>>, operations: Actions, workflowParameters: Record<string, WorkflowParameter | WorkflowParameterDefinition>, nodesMetadata: NodesMetadata, parameterType?: string) => any;
export declare const updateScopePasteTokenMetadata: (valueSegment: ValueSegment, pasteParams: PasteScopeAdditionalParams) => {
    updatedTokenSegment: ValueSegment;
    tokenError: string;
};
export declare function updateTokenMetadata(valueSegment: ValueSegment, repetitionContext: RepetitionContext, actionNodes: Record<string, string>, triggerNodeId: string, nodes: Record<string, Partial<NodeDataWithOperationMetadata>>, operations: Actions, workflowParameters: Record<string, WorkflowParameter | WorkflowParameterDefinition>, nodesMetadata: NodesMetadata, parameterType?: string, parameterNodeId?: string): ValueSegment;
export declare function getExpressionTokenTitle(expression: Expression): string;
export declare function getTypeForTokenFiltering(parameterType: string | undefined): string;
export declare function getTitleFromTokenName(tokenName: string, parentArray: string, parentArrayTitle?: string): string;
export declare function getNormalizedTokenName(tokenName: string): string;
export declare function getRepetitionValue(manifest: OperationManifest, nodeInputs: ParameterInfo[]): any;
export declare function getInterpolatedExpression(expression: string, parameterType: string, parameterFormat: string): string;
export declare function parameterValueToString(parameterInfo: ParameterInfo, isDefinitionValue: boolean, idReplacements?: Record<string, string>, shouldEncodeBasedOnMetadata?: boolean): string | undefined;
/**
 * Casts the value segments after casting based on the provided parameters.
 * @param {ValueSegment[]} segmentsAfterCasting - The value segments after casting.
 * @param {boolean} shouldInterpolate - A boolean indicating whether interpolation should be performed.
 * @param {string} parameterType - The type of the parameter.
 * @param {boolean} suppressCasting - Optional. A boolean indicating whether casting should be suppressed.
 * @returns The concatenated expression value.
 */
export declare const castValueSegments: (segmentsAfterCasting: ValueSegment[], shouldInterpolate: boolean, parameterType: string, remappedParameterInfo?: any) => string;
export declare function parameterValueToJSONString(parameterValue: ValueSegment[], applyCasting?: boolean, forValidation?: boolean): string;
export declare function parameterValueWithoutCasting(parameter: ParameterInfo, shouldInterpolateSingleToken?: boolean): any;
export declare function getJSONValueFromString(value: any, type: string): any;
export declare function remapEditorViewModelWithNewIds(editorViewModel: any, idReplacements: Record<string, string>): any;
export declare function remapValueSegmentsWithNewIds(segments: ValueSegment[], idReplacements: Record<string, string>): {
    value: ValueSegment[];
    didRemap: boolean;
};
export declare function remapTokenSegmentValue(segment: ValueSegment, idReplacements: Record<string, string>): {
    value: ValueSegment;
    didRemap: boolean;
};
/**
 * @arg {ValueSegment[]} value
 * @arg {boolean} [forValidation=false]
 * @return {string}
 */
export declare function parameterValueToStringWithoutCasting(value: ValueSegment[], forValidation?: boolean, shouldInterpolateSingleToken?: boolean): string;
export declare function encodePathValue(pathValue: string, encodeCount: number): string;
export declare function getEncodeValue(value: string): number;
export declare function getArrayTypeForOutputs(parsedSwagger: SwaggerParser, operationId: string): string;
export declare function isParameterRequired(parameterInfo: ParameterInfo): boolean;
export declare function validateParameter(parameter: ParameterInfo, parameterValue: ValueSegment[], shouldValidateUnknownParameterAsError?: boolean, shouldEncodeBasedOnMetadata?: boolean): string[];
export declare function validateUntilAction(dispatch: Dispatch, nodeId: string, groupId: string, parameterId: string, parameters: ParameterInfo[], changedParameter: Partial<ParameterInfo>): void;
export declare function validateInitializeVariable(dispatch: Dispatch, nodeId: string, groupId: string, parameterId: string, parameter: ParameterInfo, changedParameter: Partial<ParameterInfo>): void;
export declare function shouldEncodeParameterValueForOperationBasedOnMetadata(operationInfo: OperationInfo): boolean;
export {};
