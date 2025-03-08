import { useState, useEffect } from 'react';
import { useDragDropManager } from 'react-dnd';

export const useIsDraggingNode = () => {
  const [dragging, setDragging] = useState(false);
  const dragDropManager = useDragDropManager();
  useEffect(() => {
    const monitor = dragDropManager.getMonitor();
    monitor.subscribeToStateChange(() => setDragging(monitor.isDragging()));
    setDragging(monitor.isDragging());
  }, [dragDropManager]);
  return dragging;
};
