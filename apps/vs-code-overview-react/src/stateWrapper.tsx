import type { RootState } from './state/store';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

export const StateWrapper: React.FC = () => {
  const navigate = useNavigate();
  const overviewState = useSelector((state: RootState) => state.overview);

  useEffect(() => {
    if (overviewState.initialized) {
      switch (overviewState.project) {
        case 'export': {
          navigate('/export', { replace: true });
          break;
        }
        case 'overview': {
          navigate('/overview', { replace: true });
          break;
        }
        default: {
          break;
        }
      }
    }
  }, [overviewState]);

  return null;
};
