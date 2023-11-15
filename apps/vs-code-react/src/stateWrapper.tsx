import { ProjectName } from './run-service';
import type { RootState } from './state/store';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

export const StateWrapper: React.FC = () => {
  const navigate = useNavigate();
  const workflowState = useSelector((state: RootState) => state.workflow);

  useEffect(() => {
    if (workflowState.initialized) {
      switch (workflowState.project) {
        case ProjectName.export: {
          navigate(`/${ProjectName.export}/instance-selection`, { replace: true });
          break;
        }
        case ProjectName.review: {
          navigate(`/${ProjectName.review}`, { replace: true });
          break;
        }
        case ProjectName.overview: {
          navigate(`/${ProjectName.overview}`, { replace: true });
          break;
        }
        case ProjectName.designer: {
          navigate(`/${ProjectName.designer}`, { replace: true });
          break;
        }
        case ProjectName.dataMapper: {
          navigate(`/${ProjectName.dataMapper}`, { replace: true });
          break;
        }
        default: {
          break;
        }
      }
    }
  }, [workflowState, navigate]);

  return null;
};
