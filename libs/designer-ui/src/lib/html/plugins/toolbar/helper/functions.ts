/* eslint-disable no-param-reassign */
import type { ListNode } from '@lexical/list';
import { $isListNode, $createListNode } from '@lexical/list';
import type { HeadingNode } from '@lexical/rich-text';
import { $isHeadingNode, $createHeadingNode } from '@lexical/rich-text';
import { $isAtNodeEnd } from '@lexical/selection';
import { $createParagraphNode, $isParagraphNode } from 'lexical';
import type { ElementNode, ParagraphNode, RangeSelection, TextNode, LexicalNode } from 'lexical';

export function getSelectedNode(selection: RangeSelection): TextNode | ElementNode {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  const isBackward = selection.isBackward();
  const atEnd = $isAtNodeEnd(isBackward ? focus : anchor);
  return atEnd ? anchorNode : focusNode;
}

const SUPPORTED_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'sms:', 'tel:']);

export function sanitizeUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    // eslint-disable-next-line no-script-url
    if (!SUPPORTED_URL_PROTOCOLS.has(parsedUrl.protocol)) {
      return 'about:blank';
    }
  } catch {
    return url;
  }
  return url;
}

export const processNodeType = (currNode: LexicalNode): ListNode | HeadingNode | ParagraphNode => {
  if ($isHeadingNode(currNode)) {
    const headingNodeType = currNode.getTag();
    return $createHeadingNode(headingNodeType);
  } else if ($isListNode(currNode)) {
    const listNodeType = currNode.getListType();
    return $createListNode(listNodeType);
  } else if ($isParagraphNode(currNode)) {
    return $createParagraphNode();
  } else {
    return $createParagraphNode();
  }
};

const VERTICAL_GAP = 10;
const HORIZONTAL_OFFSET = 5;

export function setFloatingElemPositionForLinkEditor(
  targetRect: ClientRect | null,
  floatingElem: HTMLElement,
  anchorElem: HTMLElement,
  verticalGap: number = VERTICAL_GAP,
  horizontalOffset: number = HORIZONTAL_OFFSET
): void {
  const scrollerElem = anchorElem.parentElement;

  if (targetRect === null || !scrollerElem) {
    floatingElem.style.opacity = '0';
    floatingElem.style.transform = 'translate(-10000px, -10000px)';
    return;
  }

  const floatingElemRect = floatingElem.getBoundingClientRect();
  const anchorElementRect = anchorElem.getBoundingClientRect();
  const editorScrollerRect = scrollerElem.getBoundingClientRect();

  let top = targetRect.top - verticalGap;
  let left = targetRect.left - horizontalOffset;

  if (top < editorScrollerRect.top) {
    top += floatingElemRect.height + targetRect.height + verticalGap * 2;
  }

  if (left + floatingElemRect.width > editorScrollerRect.right) {
    left = editorScrollerRect.right - floatingElemRect.width - horizontalOffset;
  }

  top -= anchorElementRect.top;
  left -= anchorElementRect.left;

  floatingElem.style.opacity = '1';
  floatingElem.style.transform = `translate(${left}px, ${top}px)`;
}
