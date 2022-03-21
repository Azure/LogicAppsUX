import { About } from './../../about';
import React from 'react';

export const AboutTab = () => {
  // TODO: Retrieve logic from a redux store?
  const descriptionDocumentation = { url: 'www.example.com', description: 'more info' };
  const headerIcons = [
    { title: 'Tag1', badgeText: 'test' },
    { title: 'Tag2', badgeText: 'more' },
  ];
  return (
    <About
      connectorDisplayName="Node Name"
      description="description "
      descriptionDocumentation={descriptionDocumentation}
      headerIcons={headerIcons}
    />
  );
};
