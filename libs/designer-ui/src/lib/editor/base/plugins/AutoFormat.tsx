// import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
// import { $getSelection, $isRangeSelection, TextNode } from 'lexical';
// import { useCallback, useEffect } from 'react';

// export default function FormatTextNode({ newStyles }: { newStyles: Record<string, string> }): JSX.Element | null {
//   const [editor] = useLexicalComposerContext();
//   const styleTextNode = useCallback(
//     (node: TextNode): null | TextNode => {
//       const currStyles = JSON.parse(JSON.stringify(newStyles));
//       const styles = node.__style.split(';');
//       for (let i = 0; i < styles.length - 1; i++) {
//         const prevProperty = styles[i].split(':');
//         if (!Object.hasOwn(newStyles, prevProperty[0])) {
//           currStyles[prevProperty[0]] = prevProperty[1];
//         }
//       }
//       const styles2 = Object.entries(currStyles ?? {}).map(([k, v]) => {
//         return `${k}:${v}`;
//       });
//       try {
//         const selection = $getSelection();
//         if (
//           $isRangeSelection(selection) &&
//           selection.anchor.key === selection.focus.key &&
//           selection.anchor.offset === selection.focus.offset
//         ) {
//           // eslint-disable-next-line no-param-reassign
//           node.__style = styles2.join(';');
//         }
//       } catch (e) {
//         return null;
//       }

//       return null;
//     },
//     [newStyles]
//   );
//   const textNodeTransform = useCallback(
//     (node: TextNode): void => {
//       let targetNode: TextNode | null = node;

//       while (targetNode !== null) {
//         if (!targetNode.isSimpleText()) {
//           return;
//         }

//         targetNode = styleTextNode(targetNode);
//       }
//     },
//     [styleTextNode]
//   );
//   useEffect(() => {
//     return editor.registerNodeTransform(TextNode, textNodeTransform);
//   }, [editor, textNodeTransform]);

//   return null;
// }
