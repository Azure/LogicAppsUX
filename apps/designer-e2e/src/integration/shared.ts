export const DATA_CY_ATTR = 'data-testid';

export const excludedRulesForComponents = [
  // removing full-page related rules bc we are testing lib components
  {
    id: 'landmark-one-main',
    enabled: false,
  },
  {
    id: 'page-has-heading-one',
    enabled: false,
  },
  {
    id: 'region',
    enabled: false,
  },
];
