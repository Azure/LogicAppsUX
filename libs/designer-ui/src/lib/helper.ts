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

export function isEdge(): boolean {
  return /Edge\/\d+/.test(navigator.userAgent);
}

export function isFirefox(): boolean {
  return /Firefox\/\d+/.test(navigator.userAgent);
}

export function isInternetExplorer(): boolean {
  return /(?:MSIE |Trident\/)/.test(navigator.userAgent);
}
