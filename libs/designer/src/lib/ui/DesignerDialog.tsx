import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { CreateConnectionModal } from './knowledge/editor/connection';
import type { AppDispatch, RootState } from '../core/store';
import { closeKnowledgeConnectionModal } from '../core/state/modal/modalSlice';

export const DesignerDialog = ({ containerRef }: { containerRef: React.MutableRefObject<HTMLElement | null> }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isKnowledgeConnectionOpen } = useSelector((state: RootState) => ({
    isKnowledgeConnectionOpen: state.modal.isKnowledgeConnectionOpen,
  }));

  const onDismiss = useCallback(() => {
    if (isKnowledgeConnectionOpen) {
      dispatch(closeKnowledgeConnectionModal());
    }
  }, [dispatch, isKnowledgeConnectionOpen]);

  return isKnowledgeConnectionOpen ? <CreateConnectionModal mountNode={containerRef.current} onDismiss={onDismiss} /> : null;
};
