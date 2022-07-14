import { App } from './app/app';
import { FluentProvider, teamsLightTheme } from '@fluentui/react-components';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';

ReactDOM.render(
  <StrictMode>
    <FluentProvider theme={teamsLightTheme}>
      <App />
    </FluentProvider>
    ,
  </StrictMode>,
  document.getElementById('root')
);
