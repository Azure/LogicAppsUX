import { ExportTest } from './exportTest';
import { StateWrapper } from './stateWrapper';
import { MemoryRouter, Route, Switch } from 'react-router-dom';

export const Router: React.FC = () => {
  return (
    <MemoryRouter>
      <Switch>
        <Route path="/export" component={ExportTest} />
        <Route path="/overview" component={StateWrapper} />
      </Switch>
    </MemoryRouter>
  );
};
