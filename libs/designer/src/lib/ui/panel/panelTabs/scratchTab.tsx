import constants from '../../../common/constants';
import type { TokenGroup } from '../../../core/utils/tokens';
import { getExpressionTokenSections } from '../../../core/utils/tokens';
import type { OutputToken, PanelTab, TokenPickerHandler, ValueSegment } from '@microsoft/designer-ui';
import {
  RowDropdownOptions,
  GroupType,
  ArrayEditor,
  ArrayType, // DictionaryEditor,
  // TokenType,
  // GroupType,
  // GroupDropdownOptions,
  // QueryBuilderEditor, // DictionaryType, // EditorLanguage,
  UntilEditor,
  ValueSegmentType, // CodeEditor, // HTMLEditor,
  TokenPicker, // TokenType,
  // DictionaryEditor,
  testTokenSegment, // SchemaEditor, // Combobox,
  // ArrayEditor,
  Scratch, // StringEditor, // AuthenticationEditor,
  // DropdownEditor,
  outputToken,
  outputToken2, // RowDropdownOptions,
} from '@microsoft/designer-ui';
import { guid } from '@microsoft/utils-logic-apps';

const testTokenGroup: TokenGroup[] = [
  { id: guid(), label: 'Checks if Blob exists in Azure Storage', tokens: [outputToken, outputToken2] },
  { id: guid(), label: 'Insert a row into a string array', tokens: [outputToken2, outputToken] },
];

export const ScratchTab = () => {
  const expressionGroup = getExpressionTokenSections();

  const getValueSegmentFromToken = async (token: OutputToken): Promise<ValueSegment> => {
    const { key, brandColor, icon, title, description, name, type, value, outputInfo } = token;
    const { actionName, type: tokenType, required, format, source, isSecure, arrayDetails } = outputInfo;
    const segment = {
      id: guid(),
      type: ValueSegmentType.TOKEN,
      value: value ?? '',
      token: {
        actionName,
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
        arrayDetails: arrayDetails ? { parentArrayName: arrayDetails.parentArray, itemSchema: arrayDetails.itemSchema } : undefined,
      },
    };

    return segment;
  };

  const GetTokenPicker = (
    editorId: string,
    labelId: string,
    onClick?: (b: boolean) => void,
    tokenClicked?: (token: ValueSegment) => void,
    tokenPickerHide?: () => void
  ): JSX.Element => {
    return (
      <TokenPicker
        editorId={editorId}
        labelId={labelId}
        tokenGroup={testTokenGroup}
        expressionGroup={expressionGroup}
        tokenPickerFocused={onClick}
        getValueSegmentFromToken={getValueSegmentFromToken}
        tokenClickedCallback={tokenClicked}
        tokenPickerHide={tokenPickerHide}
      />
    );
  };

  const tokenPickerHandler: TokenPickerHandler = { getTokenPicker: GetTokenPicker, tokenPickerProps: {} };
  const children = (): React.ReactNode => {
    return (
      <>
        {/* <QueryBuilderEditor
          tokenPickerHandler={tokenPickerHandler}
          readonly={false}
          groupProps={{
            type: GroupType.GROUP,
            condition: GroupDropdownOptions.OR,
            items: [
              { type: GroupType.ROW, checked: true },
              {
                type: GroupType.ROW,
                operand1: [testTokenSegment],
                operator: RowDropdownOptions.LESSOREQUALS,
                operand2: [testTokenSegment],
              },
              { type: GroupType.GROUP, checked: false, items: [] },
              {
                type: GroupType.GROUP,
                checked: true,
                items: [
                  { type: GroupType.ROW },
                  { type: GroupType.GROUP, checked: false, items: [{ type: GroupType.ROW, operand1: [testTokenSegment] }] },
                ],
              },
            ],
          }}
        /> */}
        {/* <CodeEditor
          initialValue={[
            {
              type: ValueSegmentType.LITERAL,
              value: `function createTable(rows, cols) {
  var j = 1;
  var output = "<table>";
  for (i = 1; i <= rows; i++) {
    output = output + "<tr>";
    while (j <= cols) {
  		output = output + "<td>" + i * j + "</td>";
   		j = j + 1;
   	}
   	output = output + "</tr>";
   	j = 1;
  }
  output = output + "</table>";
  document.write(output);
}`,
              id: guid(),
            },
          ]}
          tokenPickerHandler={tokenPickerHandler}
          language={EditorLanguage.javascript}
        /> */}
        {/* <DropdownEditor
          multiSelect={true}
          initialValue={[
            { id: '0', type: ValueSegmentType.LITERAL, value: 'PUT' },
            { id: '0', type: ValueSegmentType.LITERAL, value: 'GET' },
          ]}
          options={[
            { displayName: 'GET', value: 'GET', key: 'GET', disabled: false },
            { displayName: 'PUT', value: 'PUT', key: 'PUT', disabled: false },
            { displayName: 'POST', value: 'POST', key: 'POST', disabled: false },
            { displayName: 'PATCH', value: 'PATCH', key: 'PATCH', disabled: false },
            { displayName: 'DELETE', value: 'DELETE', key: 'DELETE', disabled: false },
          ]}
        /> */}
        {/* <AuthenticationEditor initialValue={[]} tokenPickerHandler={tokenPickerHandler} AuthenticationEditorOptions={{}} authProps={{}} /> */}
        <ArrayEditor
          type={ArrayType.SIMPLE}
          labelProps={{ text: 'Input Array', isRequiredField: true }}
          initialValue={[
            { id: guid(), type: ValueSegmentType.LITERAL, value: '[\n  "' },
            { id: guid(), type: ValueSegmentType.LITERAL, value: 'This is Text' },
            testTokenSegment,
            { id: guid(), type: ValueSegmentType.LITERAL, value: 'Some Text' },
            { id: guid(), type: ValueSegmentType.LITERAL, value: '",\n  "' },
            testTokenSegment,
            testTokenSegment,
            { id: guid(), type: ValueSegmentType.LITERAL, value: 'More Text' },
            { id: guid(), type: ValueSegmentType.LITERAL, value: '"\n]' },
          ]}
          tokenPickerHandler={tokenPickerHandler}
        />

        <ArrayEditor
          itemSchema={{
            content: { type: 'integer', isRequired: true },
            name: { type: 'string', isRequired: true },
            object: { p1: { type: 'string', isRequired: true }, p2: { type: 'string', isRequired: true } },
          }}
          type={ArrayType.COMPLEX}
          labelProps={{ text: 'Input Array', isRequiredField: true }}
          initialValue={[
            { id: guid(), type: ValueSegmentType.LITERAL, value: '[\n    {\n        "content": "test",\n        "name": "MoreTst' },
            testTokenSegment,
            { id: guid(), type: ValueSegmentType.LITERAL, value: '",\n        "object": {\n            "p1": "' },
            testTokenSegment,
            testTokenSegment,
            { id: guid(), type: ValueSegmentType.LITERAL, value: '",\n            "p2": ""\n        }\n    }\n]' },
          ]}
          tokenPickerHandler={tokenPickerHandler}
        />

        {/* <Combobox
          options={[
            { displayName: 'GET', value: 'GET', key: 'GET', disabled: false },
            { displayName: 'PUT', value: 'PUT', key: 'PUT', disabled: false },
            { displayName: 'POST', value: 'POST', key: 'POST', disabled: false },
            { displayName: 'PATCH', value: 'PATCH', key: 'PATCH', disabled: false },
            { displayName: 'DELETE', value: 'DELETE', key: 'DELETE', disabled: false },
          ]}
          placeholder="Method is Required"
          initialValue={[{ id: '0', type: ValueSegmentType.LITERAL, value: 'PUT' }]}
          tokenPickerHandler={tokenPickerHandler}
          // readonly={true}
        /> */}

        {/* <SchemaEditor
          initialValue={[{ id: '0', type: ValueSegmentType.LITERAL, value: '{\n"type": "object",\n"properties" : {}\n}' }]}
          label="Request Body JSON Schema"
        /> */}
        {/* <DictionaryEditor
          initialItems={[
            {
              key: [
                { id: guid(), type: ValueSegmentType.LITERAL, value: 'Key Text' },
                testTokenSegment,
                {
                  id: guid(),
                  type: ValueSegmentType.TOKEN,
                  token: {
                    key: 'TOKEN',
                    brandColor: '#0000FF',
                    description: 'New token',
                    icon: 'data:image/svg+xml;base64,PHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAzMiAzMiIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHBhdGggZD0ibTAgMGgzMnYzMmgtMzJ6IiBmaWxsPSIjMDA5ZGE1Ii8+DQogPGcgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Im0xMy45IDIxLjE2NGg0LjIxOHYxLjg5MWgtNC4yMTh6Ii8+DQogIDxwYXRoIGQ9Im0xOC40MDkgMjEuNjczaDEuNTI3djEuMzgyaC0xLjUyN3oiLz4NCiAgPHBhdGggZD0ibTEyLjAwOSAyMS42NzNoMS41Mjd2MS4zODJoLTEuNTI3eiIvPg0KICA8cGF0aCBkPSJNMTUuMjgyIDIzLjQxOGgxLjM4MnYuNTgyaC0xLjM4MnoiLz4NCiAgPHBhdGggZD0iTTI0Ljg4MiAxOC4xMDlsLTEuNjczLTEuNTI3aC0xLjAxOGwxLjIzNiAxLjE2NGgtMy43MDl2LjhoMy43MDlsLTEuMTY0IDEuMjM2aC45NDV6Ii8+DQogIDxwYXRoIGQ9Ik0xNS4yODIgMjAuODczaDEuMzgydi0xLjAxOGMuOC0uMDczIDEuNTI3LS4zNjQgMi4yNTUtLjcyN3YtMS4zODJjLS40MzYuMzY0LTEuMDE4LjY1NS0xLjYuOC4zNjQtLjU4Mi42NTUtMS40NTUuOC0yLjQuODczLS4xNDUgMS43NDUtLjI5MSAyLjMyNy0uNTgyLS4yMTguNTgyLS41MDkgMS4wMTgtLjg3MyAxLjQ1NWgxLjQ1NWMuNTgyLS44NzMuODczLTEuOTY0Ljg3My0zLjEyNyAwLTEuMDkxLS4yOTEtMi4xMDktLjgtMi45ODItMS4wMTgtMS43NDUtMi45MDktMi45MDktNS4wOTEtMi45MDktMi4xODIgMC00LjA3MyAxLjE2NC01LjA5MSAyLjkwOS0uNTA5Ljg3My0uOCAxLjg5MS0uOCAyLjk4MiAwIDMuMDU1IDIuMzI3IDUuNTI3IDUuMjM2IDUuODkxdjEuMDkxem0yLjQ3My01LjE2NGMtLjUwOS4wNzMtMS4wOTEuMDczLTEuNzQ1LjA3My0uNjU1IDAtMS4yMzYgMC0xLjc0NS0uMDczLS4wNzMtLjU4Mi0uMTQ1LTEuMTY0LS4xNDUtMS43NDUgMC0uNDM2IDAtLjg3My4wNzMtMS4zMDkuNTgyLjA3MyAxLjE2NC4xNDUgMS44MTguMTQ1LjY1NSAwIDEuMjM2LS4wNzMgMS44MTgtLjE0NS4wNzMuNDM2LjA3My44LjA3MyAxLjMwOSAwIC42NTUtLjA3MyAxLjIzNi0uMTQ1IDEuNzQ1em0yLjYxOC0zLjc4MmMuMjkxLjU4Mi40MzYgMS4zMDkuNDM2IDIuMDM2bC0uMDczIDEuMDE4Yy0uNTA5LjI5MS0xLjMwOS41ODItMi40NzMuNzI3LjA3My0uNTA5LjA3My0xLjA5MS4wNzMtMS43NDUgMC0uNDM2IDAtLjk0NS0uMDczLTEuMzgyLjgtLjE0NSAxLjUyNy0uMzY0IDIuMTA5LS42NTV6bS0uMjE4LS4zNjRjLS40MzYuMjE4LTEuMDkxLjQzNi0xLjg5MS41ODItLjE0NS0xLjE2NC0uNDM2LTIuMTA5LS44NzMtMi43NjQgMS4xNjQuMzY0IDIuMTA5IDEuMDkxIDIuNzY0IDIuMTgyem0tNC4xNDUtMi40Yy4yMTggMCAuNDM2IDAgLjY1NS4wNzMuNDM2LjUwOS44NzMgMS42IDEuMDkxIDIuOTgyLS41MDkuMDczLTEuMDkxLjE0NS0xLjc0NS4xNDUtLjY1NSAwLTEuMjM2LS4wNzMtMS43NDUtLjE0NS4yMTgtMS4zODIuNTgyLTIuNDczIDEuMDkxLTIuOTgyLjE0NS0uMDczLjQzNi0uMDczLjY1NS0uMDczem0tMS4zODIuMjE4Yy0uMzY0LjY1NS0uNzI3IDEuNi0uODczIDIuNzY0LS44LS4xNDUtMS40NTUtLjM2NC0xLjg5MS0uNTgyLjU4Mi0xLjA5MSAxLjYtMS44MTggMi43NjQtMi4xODJ6bS0zLjQxOCA0LjU4MmMwLS43MjcuMTQ1LTEuMzgyLjQzNi0yLjAzNi41MDkuMjkxIDEuMjM2LjUwOSAyLjEwOS42NTUtLjA3My40MzYtLjA3My44NzMtLjA3MyAxLjM4MmwuMDczIDEuNzQ1Yy0xLjE2NC0uMTQ1LTEuOTY0LS40MzYtMi40NzMtLjcyN2wtLjA3My0xLjAxOHptLjI5MSAxLjZjLjU4Mi4yOTEgMS40NTUuNDM2IDIuMzI3LjU4Mi4xNDUuOTQ1LjQzNiAxLjgxOC44IDIuNC0xLjQ1NS0uNDM2LTIuNjE4LTEuNTI3LTMuMTI3LTIuOTgyem0yLjgzNi42NTVjLjU4Mi4wNzMgMS4wOTEuMDczIDEuNjczLjA3My41ODIgMCAxLjA5MSAwIDEuNjczLS4wNzMtLjIxOCAxLjE2NC0uNTgyIDIuMDM2LS45NDUgMi40NzNsLS42NTUuMDczYy0uMjE4IDAtLjQzNiAwLS42NTUtLjA3My0uNTA5LS41MDktLjg3My0xLjMwOS0xLjA5MS0yLjQ3M3oiLz4NCiA8L2c+DQo8L3N2Zz4NCg==',
                    title: 'TOKEN',
                    tokenType: TokenType.OUTPUTS,
                  },
                  value: 'TOKEN',
                },
                { id: guid(), type: ValueSegmentType.LITERAL, value: 'More Text' },
              ],
              value: [
                { id: guid(), type: ValueSegmentType.LITERAL, value: 'Value Text' },
                testTokenSegment,
                { id: guid(), type: ValueSegmentType.LITERAL, value: 'Additional Text' },
              ],
            },
            {
              key: [testTokenSegment, testTokenSegment, { id: guid(), type: ValueSegmentType.LITERAL, value: 'Key2 Text' }],
              value: [testTokenSegment, testTokenSegment, { id: guid(), type: ValueSegmentType.LITERAL, value: 'Value2 Text' }],
            },
            { key: [], value: [] },
          ]}
          initialValue={[
            { id: guid(), type: ValueSegmentType.LITERAL, value: '{\n    "' },
            testTokenSegment,
            {
              id: guid(),
              type: ValueSegmentType.TOKEN,
              token: {
                key: 'TOKEN',
                brandColor: '#0000FF',
                description: 'New token',
                icon: 'data:image/svg+xml;base64,PHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAzMiAzMiIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHBhdGggZD0ibTAgMGgzMnYzMmgtMzJ6IiBmaWxsPSIjMDA5ZGE1Ii8+DQogPGcgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Im0xMy45IDIxLjE2NGg0LjIxOHYxLjg5MWgtNC4yMTh6Ii8+DQogIDxwYXRoIGQ9Im0xOC40MDkgMjEuNjczaDEuNTI3djEuMzgyaC0xLjUyN3oiLz4NCiAgPHBhdGggZD0ibTEyLjAwOSAyMS42NzNoMS41Mjd2MS4zODJoLTEuNTI3eiIvPg0KICA8cGF0aCBkPSJNMTUuMjgyIDIzLjQxOGgxLjM4MnYuNTgyaC0xLjM4MnoiLz4NCiAgPHBhdGggZD0iTTI0Ljg4MiAxOC4xMDlsLTEuNjczLTEuNTI3aC0xLjAxOGwxLjIzNiAxLjE2NGgtMy43MDl2LjhoMy43MDlsLTEuMTY0IDEuMjM2aC45NDV6Ii8+DQogIDxwYXRoIGQ9Ik0xNS4yODIgMjAuODczaDEuMzgydi0xLjAxOGMuOC0uMDczIDEuNTI3LS4zNjQgMi4yNTUtLjcyN3YtMS4zODJjLS40MzYuMzY0LTEuMDE4LjY1NS0xLjYuOC4zNjQtLjU4Mi42NTUtMS40NTUuOC0yLjQuODczLS4xNDUgMS43NDUtLjI5MSAyLjMyNy0uNTgyLS4yMTguNTgyLS41MDkgMS4wMTgtLjg3MyAxLjQ1NWgxLjQ1NWMuNTgyLS44NzMuODczLTEuOTY0Ljg3My0zLjEyNyAwLTEuMDkxLS4yOTEtMi4xMDktLjgtMi45ODItMS4wMTgtMS43NDUtMi45MDktMi45MDktNS4wOTEtMi45MDktMi4xODIgMC00LjA3MyAxLjE2NC01LjA5MSAyLjkwOS0uNTA5Ljg3My0uOCAxLjg5MS0uOCAyLjk4MiAwIDMuMDU1IDIuMzI3IDUuNTI3IDUuMjM2IDUuODkxdjEuMDkxem0yLjQ3My01LjE2NGMtLjUwOS4wNzMtMS4wOTEuMDczLTEuNzQ1LjA3My0uNjU1IDAtMS4yMzYgMC0xLjc0NS0uMDczLS4wNzMtLjU4Mi0uMTQ1LTEuMTY0LS4xNDUtMS43NDUgMC0uNDM2IDAtLjg3My4wNzMtMS4zMDkuNTgyLjA3MyAxLjE2NC4xNDUgMS44MTguMTQ1LjY1NSAwIDEuMjM2LS4wNzMgMS44MTgtLjE0NS4wNzMuNDM2LjA3My44LjA3MyAxLjMwOSAwIC42NTUtLjA3MyAxLjIzNi0uMTQ1IDEuNzQ1em0yLjYxOC0zLjc4MmMuMjkxLjU4Mi40MzYgMS4zMDkuNDM2IDIuMDM2bC0uMDczIDEuMDE4Yy0uNTA5LjI5MS0xLjMwOS41ODItMi40NzMuNzI3LjA3My0uNTA5LjA3My0xLjA5MS4wNzMtMS43NDUgMC0uNDM2IDAtLjk0NS0uMDczLTEuMzgyLjgtLjE0NSAxLjUyNy0uMzY0IDIuMTA5LS42NTV6bS0uMjE4LS4zNjRjLS40MzYuMjE4LTEuMDkxLjQzNi0xLjg5MS41ODItLjE0NS0xLjE2NC0uNDM2LTIuMTA5LS44NzMtMi43NjQgMS4xNjQuMzY0IDIuMTA5IDEuMDkxIDIuNzY0IDIuMTgyem0tNC4xNDUtMi40Yy4yMTggMCAuNDM2IDAgLjY1NS4wNzMuNDM2LjUwOS44NzMgMS42IDEuMDkxIDIuOTgyLS41MDkuMDczLTEuMDkxLjE0NS0xLjc0NS4xNDUtLjY1NSAwLTEuMjM2LS4wNzMtMS43NDUtLjE0NS4yMTgtMS4zODIuNTgyLTIuNDczIDEuMDkxLTIuOTgyLjE0NS0uMDczLjQzNi0uMDczLjY1NS0uMDczem0tMS4zODIuMjE4Yy0uMzY0LjY1NS0uNzI3IDEuNi0uODczIDIuNzY0LS44LS4xNDUtMS40NTUtLjM2NC0xLjg5MS0uNTgyLjU4Mi0xLjA5MSAxLjYtMS44MTggMi43NjQtMi4xODJ6bS0zLjQxOCA0LjU4MmMwLS43MjcuMTQ1LTEuMzgyLjQzNi0yLjAzNi41MDkuMjkxIDEuMjM2LjUwOSAyLjEwOS42NTUtLjA3My40MzYtLjA3My44NzMtLjA3MyAxLjM4MmwuMDczIDEuNzQ1Yy0xLjE2NC0uMTQ1LTEuOTY0LS40MzYtMi40NzMtLjcyN2wtLjA3My0xLjAxOHptLjI5MSAxLjZjLjU4Mi4yOTEgMS40NTUuNDM2IDIuMzI3LjU4Mi4xNDUuOTQ1LjQzNiAxLjgxOC44IDIuNC0xLjQ1NS0uNDM2LTIuNjE4LTEuNTI3LTMuMTI3LTIuOTgyem0yLjgzNi42NTVjLjU4Mi4wNzMgMS4wOTEuMDczIDEuNjczLjA3My41ODIgMCAxLjA5MSAwIDEuNjczLS4wNzMtLjIxOCAxLjE2NC0uNTgyIDIuMDM2LS45NDUgMi40NzNsLS42NTUuMDczYy0uMjE4IDAtLjQzNiAwLS42NTUtLjA3My0uNTA5LS41MDktLjg3My0xLjMwOS0xLjA5MS0yLjQ3M3oiLz4NCiA8L2c+DQo8L3N2Zz4NCg==',
                title: 'TOKEN',
                tokenType: TokenType.OUTPUTS,
              },
              value: 'TOKEN',
            },
            { id: guid(), type: ValueSegmentType.LITERAL, value: 'More Text' },
            { id: guid(), type: ValueSegmentType.LITERAL, value: '" : "' },
            { id: guid(), type: ValueSegmentType.LITERAL, value: 'Value Text' },
            testTokenSegment,
            { id: guid(), type: ValueSegmentType.LITERAL, value: 'Additional Text' },
            { id: guid(), type: ValueSegmentType.LITERAL, value: '",\n  ' },
            { id: guid(), type: ValueSegmentType.LITERAL, value: '  "' },
            testTokenSegment,
            testTokenSegment,
            { id: guid(), type: ValueSegmentType.LITERAL, value: 'Key2 Text' },
            { id: guid(), type: ValueSegmentType.LITERAL, value: '" : "' },
            testTokenSegment,
            testTokenSegment,
            { id: guid(), type: ValueSegmentType.LITERAL, value: 'Value2 Text' },
            { id: guid(), type: ValueSegmentType.LITERAL, value: '"\n}' },
          ]}
          tokenPickerHandler={tokenPickerHandler}
        /> */}
        {/* <DictionaryEditor
          initialItems={[
            {
              key: [
                { id: guid(), type: ValueSegmentType.LITERAL, value: 'Key Text' },
                testTokenSegment,
                {
                  id: guid(),
                  type: ValueSegmentType.TOKEN,
                  token: {
                    key: 'TOKEN',
                    brandColor: '#0000FF',
                    description: 'New token',
                    icon: 'data:image/svg+xml;base64,PHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAzMiAzMiIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHBhdGggZD0ibTAgMGgzMnYzMmgtMzJ6IiBmaWxsPSIjMDA5ZGE1Ii8+DQogPGcgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Im0xMy45IDIxLjE2NGg0LjIxOHYxLjg5MWgtNC4yMTh6Ii8+DQogIDxwYXRoIGQ9Im0xOC40MDkgMjEuNjczaDEuNTI3djEuMzgyaC0xLjUyN3oiLz4NCiAgPHBhdGggZD0ibTEyLjAwOSAyMS42NzNoMS41Mjd2MS4zODJoLTEuNTI3eiIvPg0KICA8cGF0aCBkPSJNMTUuMjgyIDIzLjQxOGgxLjM4MnYuNTgyaC0xLjM4MnoiLz4NCiAgPHBhdGggZD0iTTI0Ljg4MiAxOC4xMDlsLTEuNjczLTEuNTI3aC0xLjAxOGwxLjIzNiAxLjE2NGgtMy43MDl2LjhoMy43MDlsLTEuMTY0IDEuMjM2aC45NDV6Ii8+DQogIDxwYXRoIGQ9Ik0xNS4yODIgMjAuODczaDEuMzgydi0xLjAxOGMuOC0uMDczIDEuNTI3LS4zNjQgMi4yNTUtLjcyN3YtMS4zODJjLS40MzYuMzY0LTEuMDE4LjY1NS0xLjYuOC4zNjQtLjU4Mi42NTUtMS40NTUuOC0yLjQuODczLS4xNDUgMS43NDUtLjI5MSAyLjMyNy0uNTgyLS4yMTguNTgyLS41MDkgMS4wMTgtLjg3MyAxLjQ1NWgxLjQ1NWMuNTgyLS44NzMuODczLTEuOTY0Ljg3My0zLjEyNyAwLTEuMDkxLS4yOTEtMi4xMDktLjgtMi45ODItMS4wMTgtMS43NDUtMi45MDktMi45MDktNS4wOTEtMi45MDktMi4xODIgMC00LjA3MyAxLjE2NC01LjA5MSAyLjkwOS0uNTA5Ljg3My0uOCAxLjg5MS0uOCAyLjk4MiAwIDMuMDU1IDIuMzI3IDUuNTI3IDUuMjM2IDUuODkxdjEuMDkxem0yLjQ3My01LjE2NGMtLjUwOS4wNzMtMS4wOTEuMDczLTEuNzQ1LjA3My0uNjU1IDAtMS4yMzYgMC0xLjc0NS0uMDczLS4wNzMtLjU4Mi0uMTQ1LTEuMTY0LS4xNDUtMS43NDUgMC0uNDM2IDAtLjg3My4wNzMtMS4zMDkuNTgyLjA3MyAxLjE2NC4xNDUgMS44MTguMTQ1LjY1NSAwIDEuMjM2LS4wNzMgMS44MTgtLjE0NS4wNzMuNDM2LjA3My44LjA3MyAxLjMwOSAwIC42NTUtLjA3MyAxLjIzNi0uMTQ1IDEuNzQ1em0yLjYxOC0zLjc4MmMuMjkxLjU4Mi40MzYgMS4zMDkuNDM2IDIuMDM2bC0uMDczIDEuMDE4Yy0uNTA5LjI5MS0xLjMwOS41ODItMi40NzMuNzI3LjA3My0uNTA5LjA3My0xLjA5MS4wNzMtMS43NDUgMC0uNDM2IDAtLjk0NS0uMDczLTEuMzgyLjgtLjE0NSAxLjUyNy0uMzY0IDIuMTA5LS42NTV6bS0uMjE4LS4zNjRjLS40MzYuMjE4LTEuMDkxLjQzNi0xLjg5MS41ODItLjE0NS0xLjE2NC0uNDM2LTIuMTA5LS44NzMtMi43NjQgMS4xNjQuMzY0IDIuMTA5IDEuMDkxIDIuNzY0IDIuMTgyem0tNC4xNDUtMi40Yy4yMTggMCAuNDM2IDAgLjY1NS4wNzMuNDM2LjUwOS44NzMgMS42IDEuMDkxIDIuOTgyLS41MDkuMDczLTEuMDkxLjE0NS0xLjc0NS4xNDUtLjY1NSAwLTEuMjM2LS4wNzMtMS43NDUtLjE0NS4yMTgtMS4zODIuNTgyLTIuNDczIDEuMDkxLTIuOTgyLjE0NS0uMDczLjQzNi0uMDczLjY1NS0uMDczem0tMS4zODIuMjE4Yy0uMzY0LjY1NS0uNzI3IDEuNi0uODczIDIuNzY0LS44LS4xNDUtMS40NTUtLjM2NC0xLjg5MS0uNTgyLjU4Mi0xLjA5MSAxLjYtMS44MTggMi43NjQtMi4xODJ6bS0zLjQxOCA0LjU4MmMwLS43MjcuMTQ1LTEuMzgyLjQzNi0yLjAzNi41MDkuMjkxIDEuMjM2LjUwOSAyLjEwOS42NTUtLjA3My40MzYtLjA3My44NzMtLjA3MyAxLjM4MmwuMDczIDEuNzQ1Yy0xLjE2NC0uMTQ1LTEuOTY0LS40MzYtMi40NzMtLjcyN2wtLjA3My0xLjAxOHptLjI5MSAxLjZjLjU4Mi4yOTEgMS40NTUuNDM2IDIuMzI3LjU4Mi4xNDUuOTQ1LjQzNiAxLjgxOC44IDIuNC0xLjQ1NS0uNDM2LTIuNjE4LTEuNTI3LTMuMTI3LTIuOTgyem0yLjgzNi42NTVjLjU4Mi4wNzMgMS4wOTEuMDczIDEuNjczLjA3My41ODIgMCAxLjA5MSAwIDEuNjczLS4wNzMtLjIxOCAxLjE2NC0uNTgyIDIuMDM2LS45NDUgMi40NzNsLS42NTUuMDczYy0uMjE4IDAtLjQzNiAwLS42NTUtLjA3My0uNTA5LS41MDktLjg3My0xLjMwOS0xLjA5MS0yLjQ3M3oiLz4NCiA8L2c+DQo8L3N2Zz4NCg==',
                    title: 'TOKEN',
                    tokenType: TokenType.OUTPUTS,
                  },
                  value: 'TOKEN',
                },
                { id: guid(), type: ValueSegmentType.LITERAL, value: 'More Text' },
              ],
              value: [
                { id: guid(), type: ValueSegmentType.LITERAL, value: 'Value Text' },
                testTokenSegment,
                { id: guid(), type: ValueSegmentType.LITERAL, value: 'Additional Text' },
              ],
            },
            {
              key: [testTokenSegment, testTokenSegment, { id: guid(), type: ValueSegmentType.LITERAL, value: 'Key2 Text' }],
              value: [testTokenSegment, testTokenSegment, { id: guid(), type: ValueSegmentType.LITERAL, value: 'Value2 Text' }],
            },
            { key: [], value: [] },
          ]}
          initialValue={[
            { id: guid(), type: ValueSegmentType.LITERAL, value: '{\n    "' },
            testTokenSegment,
            {
              id: guid(),
              type: ValueSegmentType.TOKEN,
              token: {
                key: 'TOKEN',
                brandColor: '#0000FF',
                description: 'New token',
                icon: 'data:image/svg+xml;base64,PHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAzMiAzMiIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHBhdGggZD0ibTAgMGgzMnYzMmgtMzJ6IiBmaWxsPSIjMDA5ZGE1Ii8+DQogPGcgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Im0xMy45IDIxLjE2NGg0LjIxOHYxLjg5MWgtNC4yMTh6Ii8+DQogIDxwYXRoIGQ9Im0xOC40MDkgMjEuNjczaDEuNTI3djEuMzgyaC0xLjUyN3oiLz4NCiAgPHBhdGggZD0ibTEyLjAwOSAyMS42NzNoMS41Mjd2MS4zODJoLTEuNTI3eiIvPg0KICA8cGF0aCBkPSJNMTUuMjgyIDIzLjQxOGgxLjM4MnYuNTgyaC0xLjM4MnoiLz4NCiAgPHBhdGggZD0iTTI0Ljg4MiAxOC4xMDlsLTEuNjczLTEuNTI3aC0xLjAxOGwxLjIzNiAxLjE2NGgtMy43MDl2LjhoMy43MDlsLTEuMTY0IDEuMjM2aC45NDV6Ii8+DQogIDxwYXRoIGQ9Ik0xNS4yODIgMjAuODczaDEuMzgydi0xLjAxOGMuOC0uMDczIDEuNTI3LS4zNjQgMi4yNTUtLjcyN3YtMS4zODJjLS40MzYuMzY0LTEuMDE4LjY1NS0xLjYuOC4zNjQtLjU4Mi42NTUtMS40NTUuOC0yLjQuODczLS4xNDUgMS43NDUtLjI5MSAyLjMyNy0uNTgyLS4yMTguNTgyLS41MDkgMS4wMTgtLjg3MyAxLjQ1NWgxLjQ1NWMuNTgyLS44NzMuODczLTEuOTY0Ljg3My0zLjEyNyAwLTEuMDkxLS4yOTEtMi4xMDktLjgtMi45ODItMS4wMTgtMS43NDUtMi45MDktMi45MDktNS4wOTEtMi45MDktMi4xODIgMC00LjA3MyAxLjE2NC01LjA5MSAyLjkwOS0uNTA5Ljg3My0uOCAxLjg5MS0uOCAyLjk4MiAwIDMuMDU1IDIuMzI3IDUuNTI3IDUuMjM2IDUuODkxdjEuMDkxem0yLjQ3My01LjE2NGMtLjUwOS4wNzMtMS4wOTEuMDczLTEuNzQ1LjA3My0uNjU1IDAtMS4yMzYgMC0xLjc0NS0uMDczLS4wNzMtLjU4Mi0uMTQ1LTEuMTY0LS4xNDUtMS43NDUgMC0uNDM2IDAtLjg3My4wNzMtMS4zMDkuNTgyLjA3MyAxLjE2NC4xNDUgMS44MTguMTQ1LjY1NSAwIDEuMjM2LS4wNzMgMS44MTgtLjE0NS4wNzMuNDM2LjA3My44LjA3MyAxLjMwOSAwIC42NTUtLjA3MyAxLjIzNi0uMTQ1IDEuNzQ1em0yLjYxOC0zLjc4MmMuMjkxLjU4Mi40MzYgMS4zMDkuNDM2IDIuMDM2bC0uMDczIDEuMDE4Yy0uNTA5LjI5MS0xLjMwOS41ODItMi40NzMuNzI3LjA3My0uNTA5LjA3My0xLjA5MS4wNzMtMS43NDUgMC0uNDM2IDAtLjk0NS0uMDczLTEuMzgyLjgtLjE0NSAxLjUyNy0uMzY0IDIuMTA5LS42NTV6bS0uMjE4LS4zNjRjLS40MzYuMjE4LTEuMDkxLjQzNi0xLjg5MS41ODItLjE0NS0xLjE2NC0uNDM2LTIuMTA5LS44NzMtMi43NjQgMS4xNjQuMzY0IDIuMTA5IDEuMDkxIDIuNzY0IDIuMTgyem0tNC4xNDUtMi40Yy4yMTggMCAuNDM2IDAgLjY1NS4wNzMuNDM2LjUwOS44NzMgMS42IDEuMDkxIDIuOTgyLS41MDkuMDczLTEuMDkxLjE0NS0xLjc0NS4xNDUtLjY1NSAwLTEuMjM2LS4wNzMtMS43NDUtLjE0NS4yMTgtMS4zODIuNTgyLTIuNDczIDEuMDkxLTIuOTgyLjE0NS0uMDczLjQzNi0uMDczLjY1NS0uMDczem0tMS4zODIuMjE4Yy0uMzY0LjY1NS0uNzI3IDEuNi0uODczIDIuNzY0LS44LS4xNDUtMS40NTUtLjM2NC0xLjg5MS0uNTgyLjU4Mi0xLjA5MSAxLjYtMS44MTggMi43NjQtMi4xODJ6bS0zLjQxOCA0LjU4MmMwLS43MjcuMTQ1LTEuMzgyLjQzNi0yLjAzNi41MDkuMjkxIDEuMjM2LjUwOSAyLjEwOS42NTUtLjA3My40MzYtLjA3My44NzMtLjA3MyAxLjM4MmwuMDczIDEuNzQ1Yy0xLjE2NC0uMTQ1LTEuOTY0LS40MzYtMi40NzMtLjcyN2wtLjA3My0xLjAxOHptLjI5MSAxLjZjLjU4Mi4yOTEgMS40NTUuNDM2IDIuMzI3LjU4Mi4xNDUuOTQ1LjQzNiAxLjgxOC44IDIuNC0xLjQ1NS0uNDM2LTIuNjE4LTEuNTI3LTMuMTI3LTIuOTgyem0yLjgzNi42NTVjLjU4Mi4wNzMgMS4wOTEuMDczIDEuNjczLjA3My41ODIgMCAxLjA5MSAwIDEuNjczLS4wNzMtLjIxOCAxLjE2NC0uNTgyIDIuMDM2LS45NDUgMi40NzNsLS42NTUuMDczYy0uMjE4IDAtLjQzNiAwLS42NTUtLjA3My0uNTA5LS41MDktLjg3My0xLjMwOS0xLjA5MS0yLjQ3M3oiLz4NCiA8L2c+DQo8L3N2Zz4NCg==',
                title: 'TOKEN',
                tokenType: TokenType.OUTPUTS,
              },
              value: 'TOKEN',
            },
            { id: guid(), type: ValueSegmentType.LITERAL, value: 'More Text' },
            { id: guid(), type: ValueSegmentType.LITERAL, value: '" : "' },
            { id: guid(), type: ValueSegmentType.LITERAL, value: 'Value Text' },
            testTokenSegment,
            { id: guid(), type: ValueSegmentType.LITERAL, value: 'Additional Text' },
            { id: guid(), type: ValueSegmentType.LITERAL, value: '",\n  ' },
            { id: guid(), type: ValueSegmentType.LITERAL, value: '  "' },
            testTokenSegment,
            testTokenSegment,
            { id: guid(), type: ValueSegmentType.LITERAL, value: 'Key2 Text' },
            { id: guid(), type: ValueSegmentType.LITERAL, value: '" : "' },
            testTokenSegment,
            testTokenSegment,
            { id: guid(), type: ValueSegmentType.LITERAL, value: 'Value2 Text' },
            { id: guid(), type: ValueSegmentType.LITERAL, value: '"\n}' },
          ]}
          tokenPickerHandler={tokenPickerHandler}
          dictionaryType={DictionaryType.TABLE}
          keyTitle={'Header'}
          valueTitle={'Value'}
        /> */}
        {/* <DictionaryEditor initialValue={[testTokenSegment]} tokenPickerHandler={tokenPickerHandler} /> */}
        {/* <StringEditor
          initialValue={[
            testTokenSegment,
            { id: guid(), type: ValueSegmentType.LITERAL, value: 'Value2 Text' },
            testTokenSegment,
            testTokenSegment,
          ]}
          tokenPickerHandler={tokenPickerHandler}
        /> */}
        {/* <HTMLEditor initialValue={[]} placeholder="Specify the body of the mail" tokenPickerHandler={tokenPickerHandler} /> */}
        {
          <UntilEditor
            tokenPickerHandler={tokenPickerHandler}
            items={{ type: GroupType.ROW, operand1: [], operand2: [], operator: RowDropdownOptions.EQUALS }}
          />
        }
      </>
    );
  };
  return <Scratch> {children()} </Scratch>;
};

export const scratchTab: PanelTab = {
  title: 'Scratch',
  name: constants.PANEL_TAB_NAMES.SCRATCH,
  description: 'To be removed',
  visible: true,
  content: <ScratchTab />,
  order: 0,
  icon: 'Rerun',
};
