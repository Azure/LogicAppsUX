import type { RootState } from './state/store';
import { ProjectName, RouteName } from '@microsoft/vscode-extension-logic-apps';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

export const StateWrapper: React.FC = () => {
  const navigate = useNavigate();
  const projectState = useSelector((state: RootState) => state.project);
  const projectOverviewInitialized = useSelector((state: RootState) => state.projectOverview.initialized);

  useEffect(() => {
    if (projectOverviewInitialized) {
      navigate(`/${ProjectName.overview}`, { replace: true });
    } else if (projectState.initialized) {
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
        case ProjectName.createWorkspace: {
          navigate(`/${ProjectName.createWorkspace}`, { replace: true });
          break;
        }
        case ProjectName.createWorkspaceFromPackage: {
          navigate(`/${ProjectName.createWorkspaceFromPackage}`, { replace: true });
          break;
        }
        case ProjectName.createLogicApp: {
          navigate(`/${ProjectName.createLogicApp}`, { replace: true });
          break;
        }
        case ProjectName.createWorkflow: {
          navigate(`/${ProjectName.createWorkflow}`, { replace: true });
          break;
        }
        case ProjectName.createWorkspaceStructure: {
          navigate(`/${ProjectName.createWorkspaceStructure}`, { replace: true });
          break;
        }
        default: {
          break;
        }
      }
    }
  }, [projectOverviewInitialized, projectState, navigate]);

  return null;
};
