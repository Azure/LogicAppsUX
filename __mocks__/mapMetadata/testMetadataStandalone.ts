export const testMetadata = {
  functionNodes: [
    {
      reactFlowGuid: 'Concat-3108F7BD-01FE-4342-8C6F-4F794504D6BF',
      functionKey: 'Concat',
      locations: [{ targetKey: '/ns0:CBRInputRecord/TestStuff/NCName', xPos: 0, yPos: 0 }],
      connections: [],
    },
    {
      reactFlowGuid: 'ToUpper-565A471E-6DB3-42A6-99AA-A4DFDF01DA02',
      functionKey: 'ToUpper',
      locations: [
        { targetKey: '/ns0:CBRInputRecord/TestStuff', xPos: 0, yPos: 0 },
        { targetKey: '/ns0:CBRInputRecord/TestStuff/NCName', xPos: 0, yPos: 0 },
      ],
      connections: ['ToUpper-565A471E-6DB3-42A6-99AA-A4DFDF01DA02', '/ns0:CBRInputRecord/TestStuff/NCName'],
    },
  ],
};
