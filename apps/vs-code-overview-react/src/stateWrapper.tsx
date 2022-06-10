import { ProjectName } from './run-service';
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
        case ProjectName.export: {
          navigate(`/${ProjectName.export}`, { replace: true });
          break;
        }
        case ProjectName.overview: {
          navigate(`/${ProjectName.overview}`, { replace: true });
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
