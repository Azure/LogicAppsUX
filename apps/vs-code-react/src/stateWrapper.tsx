import { ProjectName } from './run-service';
import type { RootState } from './state/store';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

export const StateWrapper: React.FC = () => {
  const navigate = useNavigate();
  const vscodeState = useSelector((state: RootState) => state.vscode);

  useEffect(() => {
    if (vscodeState.initialized) {
      switch (vscodeState.project) {
        case ProjectName.export: {
          navigate(`/${ProjectName.export}/instance-selection`, { replace: true });
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
  }, [vscodeState, navigate]);

  return null;
};
