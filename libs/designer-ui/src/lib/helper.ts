import { isFirefox } from '@microsoft/logic-apps-shared';

/**
 * Returns an "onDragStart" event handler to use on Firefox when draggable is set to false.
 * @return {React.DragEventHandler<HTMLElement> | undefined}
 */
export function getDragStartHandlerWhenDisabled(): React.DragEventHandler<HTMLElement> | undefined {
  return isFirefox() ? handleDragStartWhenDisabled : undefined;
}

function handleDragStartWhenDisabled(e: React.DragEvent<HTMLElement>): void {
  e.preventDefault();
}
