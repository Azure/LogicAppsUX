import { useSelector } from 'react-redux';
import { CreateConnectionModal } from './knowledge/editor/connection';
import type { RootState } from '../core/store';

export const DesignerDialog = ({ containerRef }: { containerRef: React.MutableRefObject<HTMLElement | null> }) => {
  const { isKnowledgeConnectionOpen } = useSelector((state: RootState) => ({
    isKnowledgeConnectionOpen: state.modal.isKnowledgeConnectionOpen,
  }));

  return isKnowledgeConnectionOpen ? <CreateConnectionModal mountNode={containerRef.current} /> : null;
};
