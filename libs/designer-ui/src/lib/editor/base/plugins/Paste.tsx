import { FxBrandColor, FxIcon } from '../../../constants';
import { getExpressionTokenTitle } from '../../../tokenpicker/util';
import { ValueSegmentType, type ValueSegment, TokenType } from '../../models/parameter';
import type { TokenNode } from '../nodes/tokenNode';
import { $createTokenNode } from '../nodes/tokenNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { Expression } from '@microsoft/logic-apps-shared';
import { ExpressionParser } from '@microsoft/logic-apps-shared';
import { $createParagraphNode, $createTextNode, $getSelection, COMMAND_PRIORITY_LOW, PASTE_COMMAND } from 'lexical';
import { useEffect } from 'react';

interface PastePluginProps {
  segmentMapping?: Record<string, ValueSegment>;
  loadParameterValueFromString?: (value: string) => ValueSegment[];
}

export const PastePlugin = ({ segmentMapping, loadParameterValueFromString }: PastePluginProps) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const clipboardData = event instanceof InputEvent || event instanceof KeyboardEvent ? null : event.clipboardData;
        const lexicalString = clipboardData?.getData('text/plain').replace(/\r\n/g, '\n');
        if (lexicalString && segmentMapping && loadParameterValueFromString) {
          // normally we can overwrite default paste behavior by returning true
          // however on firefox this doesn't happen, so we've manually called preventDefault
          event.preventDefault();
          const valueSegments = loadParameterValueFromString(lexicalString);
          editor.update(() => {
            // Get the selection from the EditorState
            const selection = $getSelection();

            // Create a new ParagraphNode
            const paragraphNode = $createParagraphNode();

            valueSegments.forEach((segment) => {
              if (segment.type === ValueSegmentType.TOKEN && segment.token) {
                let tokenNode: TokenNode;
                const tokenSegment = segmentMapping[segment.value];
                // get token from available tokens in the segment mapping
                if (tokenSegment?.token) {
                  const { brandColor, icon, title, name, value } = tokenSegment.token;
                  tokenNode = $createTokenNode({
                    title: title ?? name,
                    data: tokenSegment,
                    brandColor,
                    icon,
                    value,
                    readonly: false,
                  });
                } else {
                  // otherwise create an expressionToken
                  const expressionValue: Expression = ExpressionParser.parseExpression(segment.value);
                  tokenNode = $createTokenNode({
                    title: getExpressionTokenTitle(expressionValue),
                    data: { ...segment, token: { ...segment.token, tokenType: TokenType.FX } },
                    brandColor: FxBrandColor,
                    icon: FxIcon,
                    value: segment.value,
                    readonly: false,
                  });
                }
                paragraphNode.append(tokenNode);
              } else {
                const textNode = $createTextNode(segment.value);
                paragraphNode.append(textNode);
              }
            });
            selection?.insertNodes([paragraphNode]);
          });
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, loadParameterValueFromString, segmentMapping]);
  return null;
};
