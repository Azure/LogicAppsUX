/* eslint-disable */
import { Link } from '@fluentui/react/lib/Link';
import * as React from 'react';

// import Resources from 'resources';
// import Constants from '../constants';
// import ButtonIcon from './images/button.generated';

export const TokenPickerNoDynamicContent = () => {
  return (
    <div className="msla-token-picker-no-content">
      <div className="msla-token-picker-no-content-header">
        <span>NO DYNAMIC CONTENT AVAILABLE</span>
      </div>
      <div>
        {/* <img src={ButtonIcon} alt="" height="13" /> */}
        <span>There is no content available</span>
      </div>
      <hr />
      <div className="msla-token-picker-no-content-header">
        <span>INCLUDING DYNAMIC CONTENT</span>
      </div>
      <div>
        <span>If available, dynamic content is automatically generated from the connectors and actions you choose for your flow.</span>
        <Link href={'https://aka.ms/logicapps-dynamiccontent'} target="_blank" rel="noopener">
          Dynamic content may also be added from other sources.
        </Link>
      </div>
    </div>
  );
};
