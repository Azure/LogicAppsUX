import '../../../libs/data-mapper/src/lib/styles.less';
import { initializeIcons } from '@fluentui/react';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';

initializeIcons();
ReactDOM.render(
  <StrictMode>
    <DataMapperDesignerWrapper />
  </StrictMode>,
  document.getElementById('root')
);
