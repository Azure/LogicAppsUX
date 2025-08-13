import type { RootState } from './state/store';
import { ProjectName, RouteName } from '@microsoft/vscode-extension-logic-apps';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

export const StateWrapper: React.FC = () => {
  const navigate = useNavigate();
  const projectState = useSelector((state: RootState) => state.project);

  useEffect(() => {
    if (projectState.initialized) {
      switch (projectState.project) {
        case ProjectName.export: {
          navigate(`/${ProjectName.export}/${RouteName.instance_selection}`, { replace: true });
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
        case ProjectName.unitTest: {
          navigate(`/${ProjectName.unitTest}`, { replace: true });
          break;
        }
        case ProjectName.languageServer: {
          switch (projectState.route) {
            case RouteName.connectionView: {
              navigate(`/${RouteName.languageServer}/${RouteName.connectionView}`, { replace: true });
              break;
            }
            default: {
              break;
            }
          }
          break;
        }
        default: {
          break;
        }
      }
    }
  }, [projectState, navigate]);

  return null;
};
