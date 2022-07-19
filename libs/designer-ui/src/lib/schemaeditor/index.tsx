// import { MonacoEditor, EditorLanguage } from '../editor/monaco';
// import { isValidJSON } from '@microsoft-logic-apps/utils';
// import { PrimaryButton } from '@fluentui/react/lib/Button';
// import React, { useEffect, useState } from 'react';
// import { useIntl } from 'react-intl';

// export interface SchemaChangedEvent {
//   value: string;
// }

// export interface SchemaEditorProps {
//   ariaLabelledBy?: string;
//   disabled: boolean;
//   placeholder: string;
//   required?: boolean;
//   value: string;
//   onChange?(e: SchemaChangedEvent): void;
//   onFocus?(): void;
// }

// export function SchemaEditor({
//   ariaLabelledBy,
//   disabled,
//   placeholder,
//   required,
//   value,
//   onChange,
//   onFocus,
// }: SchemaEditorProps): JSX.Element {
//   const intl = useIntl();
//   const [errorMessage, setErrorMessage] = useState('');
//   const [modalOpen, setModalOpen] = useState(false);
//   const [value, setValue] = useState(value);

//   let prettyInput: string;
//   useEffect(() => {
//     // setEditorStyle(getEditorStyle(input));
//   }, [input]);

//   const parameterOptions = {
//     contextmenu: false,
//     fontSize: 13,
//     lineNumbers: 'off',
//     readOnly: false,
//     scrollBeyondLastLine: false,
//     wordWrap: 'on',
//     defaultValue: '',
//   };

//   const doneLabel = intl.formatMessage({ defaultMessage: 'Done', description: 'Done Label for button' });

//   return (
//     <div className="msla-schema-editor-body">
//       <MonacoEditor
//         defaultValue=""
//         value={input}
//         fontSize={parameterOptions.fontSize}
//         readOnly={parameterOptions.readOnly}
//         language={EditorLanguage.json}
//         height={editorStyle}
//       />
//       <div className="msla-card-config-button-container msla-code-view-done-button">
//         <PrimaryButton className="msla-card-button-primary" onClick={onOKClick}>
//           {doneLabel}
//         </PrimaryButton>
//       </div>
//     </div>
//   );
// }

// // Monaco should be at least 3 rows high (19*3 px) but no more than 20 rows high (19*20 px).
// function getEditorStyle(input = ''): number {
//   return Math.min(Math.max(input?.split('\n').length * 19, 57), 380);
// }
