export const testTemplateManifest = {
  title: 'Test Template',
  description: 'This workflow template is a sample for testing dynamic data in parameters.',
  tags: ['XML', 'IManage'],
  skus: ['consumption', 'standard'],
  kinds: ['stateful', 'stateless'],
  details: {
    By: 'Microsoft',
    Type: 'Workflow',
    Trigger: 'Recurrence',
  },
  artifacts: [
    {
      type: 'workflow',
      file: 'workflow.json',
    },
  ],
  images: {
    light: 'snapshot-light.png',
    dark: 'snapshot-dark.png',
  },
  parameters: [
    {
      name: 'mapname_#workflowname#',
      displayName: 'Map Name',
      type: 'String',
      description: 'The map file name in IA.',
      required: true,
      dynamicData: {
        type: 'list',
        workflow: 'default',
        operation: 'Transform_XML',
      },
    },
    {
      name: 'LibraryId_#workflowname#',
      displayName: 'IManage Library Id',
      type: 'String',
      description: 'Library Id for Test.',
      required: true,
      dynamicData: {
        type: 'list',
        workflow: 'default',
        operation: 'Create_alias_for_custom_or_property_lookup',
        connection: 'imanageworkforadmins_#workflowname#',
      },
    },
    {
      name: 'LookupField_#workflowname#',
      displayName: 'Lookup Field',
      type: 'String',
      description: 'Lookup field name for test.',
      required: true,
      dynamicData: {
        type: 'list',
        workflow: 'default',
        operation: 'Create_alias_for_custom_or_property_lookup',
        connection: 'imanageworkforadmins_#workflowname#',
      },
    },
  ],
  connections: {
    'imanageworkforadmins_#workflowname#': {
      connectorId: '/subscriptions/#subscription#/providers/Microsoft.Web/locations/#location#/managedApis/imanageworkforadmins',
      kind: 'shared',
    },
  },
};

export const testWorkflowJson = {
  $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
  contentVersion: '1.0.0.0',
  triggers: {
    Recurrence: {
      type: 'Recurrence',
      recurrence: {
        interval: 3,
        frequency: 'Month',
      },
    },
  },
  actions: {
    Transform_XML: {
      type: 'Xslt',
      inputs: {
        content: '<xml>hello</xml>',
        integrationAccount: {
          map: {
            name: "@parameters('mapname_#workflowname#')",
          },
        },
      },
      runAfter: {},
    },
    Create_alias_for_custom_or_property_lookup: {
      type: 'ApiConnection',
      inputs: {
        host: {
          connection: {
            name: "@parameters('$connections')['imanageworkforadmins_#workflowname#']['connectionId']",
          },
        },
        method: 'post',
        body: {
          libraryId: "@parameters('LibraryId_#workflowname#')",
          lookupFieldId: "@parameters('LookupField_#workflowname#')",
          aliasInfo: {
            lookupAlias: 'aa',
            lookupDescription: 'aaa',
            enabled: true,
            hipaa: false,
          },
        },
        headers: {
          'x-im-connector-id': 'imanage-work-for-admins',
        },
        path: '/createCustomOrPropertyLookup',
      },
      runAfter: {
        Transform_XML: ['SUCCEEDED'],
      },
    },
  },
  outputs: {},
  parameters: {
    mapname: {
      type: 'String',
      defaultValue: '',
    },
    LibraryId: {
      type: 'String',
      defaultValue: '',
    },
    LookupField: {
      type: 'String',
      defaultValue: '',
    },
    $connections: {
      type: 'Object',
      defaultValue: {},
    },
  },
};
