export const testMetadata = {
  functionNodes: [
    {
      reactFlowGuid: 'Concat-E3760415-D996-42A7-A40C-51292669D430',
      functionKey: 'Concat-E3760415-D996-42A7-A40C-51292669D430',
      position: { x: 0, y: 0 },
      connections: [
        {
          name: 'target-/ns0:Root/DataTranslation/EmployeeName',
          inputOrder: 0,
        },
      ],
      connectionShorthand: '0-target-/ns0:Root/DataTranslation/EmployeeName,',
    },
    {
      reactFlowGuid: 'CurrentDate-D3210657-B443-433A-9F83-658119A37B26',
      functionKey: 'CurrentDate-D3210657-B443-433A-9F83-658119A37B26',
      position: { x: 0, y: 0 },
      connections: [{ name: 'target-/ns0:Root/ContentEnrich/DateOfDemo', inputOrder: 0 }],
      connectionShorthand: '0-target-/ns0:Root/ContentEnrich/DateOfDemo,',
    },
    {
      reactFlowGuid: 'ToString-0EF907BC-7B14-41B2-9621-AA737AC92D1D',
      functionKey: 'ToString-0EF907BC-7B14-41B2-9621-AA737AC92D1D',
      position: { x: 0, y: 0 },
      connections: [
        {
          name: 'target-/ns0:Root/CumulativeExpression/PopulationSummary/State/SexRatio',
          inputOrder: 0,
        },
      ],
      connectionShorthand: '0-target-/ns0:Root/CumulativeExpression/PopulationSummary/State/SexRatio,',
    },
    {
      reactFlowGuid: 'Divide-B91B3C2F-6BE0-4A32-B97C-72FDE127D1AE',
      functionKey: 'Divide-B91B3C2F-6BE0-4A32-B97C-72FDE127D1AE',
      position: { x: 0, y: 0 },
      connections: [
        { name: 'string', inputOrder: 0 },
        {
          name: 'target-/ns0:Root/CumulativeExpression/PopulationSummary/State/SexRatio',
          inputOrder: 0,
        },
      ],
      connectionShorthand: '0-string,0-target-/ns0:Root/CumulativeExpression/PopulationSummary/State/SexRatio,',
    },
    {
      reactFlowGuid: 'Count-759877D1-4671-4A7D-BF17-A025425E239B',
      functionKey: 'Count-759877D1-4671-4A7D-BF17-A025425E239B',
      position: { x: 0, y: 0 },
      connections: [
        { name: 'divide', inputOrder: 0 },
        { name: 'string', inputOrder: 0 },
        {
          name: 'target-/ns0:Root/CumulativeExpression/PopulationSummary/State/SexRatio',
          inputOrder: 0,
        },
      ],
      connectionShorthand: '0-divide,0-string,0-target-/ns0:Root/CumulativeExpression/PopulationSummary/State/SexRatio,',
    },
    {
      reactFlowGuid: 'Count-F5FB52DC-8C8C-4735-B59E-87D4D42392F5',
      functionKey: 'Count-F5FB52DC-8C8C-4735-B59E-87D4D42392F5',
      position: { x: 0, y: 0 },
      connections: [
        { name: 'divide', inputOrder: 1 },
        { name: 'string', inputOrder: 0 },
        {
          name: 'target-/ns0:Root/CumulativeExpression/PopulationSummary/State/SexRatio',
          inputOrder: 0,
        },
      ],
      connectionShorthand: '1-divide,0-string,0-target-/ns0:Root/CumulativeExpression/PopulationSummary/State/SexRatio,',
    },
    {
      reactFlowGuid: 'if',
      functionKey: 'if',
      position: { x: 0, y: 0 },
      connections: [],
      connectionShorthand: '',
    },
    {
      reactFlowGuid: 'IsGreater-C699A856-C5AF-4F21-AF78-D7D84B3F11F7',
      functionKey: 'IsGreater-C699A856-C5AF-4F21-AF78-D7D84B3F11F7',
      position: { x: 0, y: 0 },
      connections: [{ name: '$if', inputOrder: 0 }],
      connectionShorthand: '0-$if,',
    },
    {
      reactFlowGuid: 'Multiply-F4EE4415-8AC9-4B6A-A4FD-76FD02566F12',
      functionKey: 'Multiply-F4EE4415-8AC9-4B6A-A4FD-76FD02566F12',
      position: { x: 0, y: 0 },
      connections: [
        { name: 'is-greater-than', inputOrder: 0 },
        { name: '$if', inputOrder: 0 },
      ],
      connectionShorthand: '0-is-greater-than,0-$if,',
    },
    {
      reactFlowGuid: 'index-9BEF17FE-3E09-44F4-97CD-F9A348C9A3B8',
      functionKey: 'index',
      position: { x: 0, y: 0 },
      connections: [{ name: 'target-/ns0:Root/Looping/Trips/Trip', inputOrder: 0 }],
      connectionShorthand: '0-target-/ns0:Root/Looping/Trips/Trip,',
    },
    {
      reactFlowGuid: 'directAccess-423786B0-7330-4F5C-87F3-4D453E74D6CF',
      functionKey: 'directAccess-423786B0-7330-4F5C-87F3-4D453E74D6CF',
      position: { x: 0, y: 0 },
      connections: [
        {
          name: 'target-/ns0:Root/Looping/Trips/Trip/VehicleRegistration',
          inputOrder: 0,
        },
      ],
      connectionShorthand: '0-target-/ns0:Root/Looping/Trips/Trip/VehicleRegistration,',
    },
    {
      reactFlowGuid: 'IsEqual-ABE31418-4547-4063-90E9-E7274BFFAE9C',
      functionKey: 'IsEqual-ABE31418-4547-4063-90E9-E7274BFFAE9C',
      position: { x: 0, y: 0 },
      connections: [
        { name: '', inputOrder: 0 },
        {
          name: 'target-/ns0:Root/Looping/Trips/Trip/VehicleRegistration',
          inputOrder: 0,
        },
      ],
      connectionShorthand: '0-,0-target-/ns0:Root/Looping/Trips/Trip/VehicleRegistration,',
    },
    {
      reactFlowGuid: 'directAccess-CDE85F29-F5B3-4BA1-A3CE-96D9E0793B1B',
      functionKey: 'directAccess-CDE85F29-F5B3-4BA1-A3CE-96D9E0793B1B',
      position: { x: 0, y: 0 },
      connections: [
        { name: 'is-equal', inputOrder: 1 },
        { name: '', inputOrder: 0 },
        {
          name: 'target-/ns0:Root/Looping/Trips/Trip/VehicleRegistration',
          inputOrder: 0,
        },
      ],
      connectionShorthand: '1-is-equal,0-,0-target-/ns0:Root/Looping/Trips/Trip/VehicleRegistration,',
    },
    {
      reactFlowGuid: 'IsEqual-20EDEBDE-0431-491C-A0E2-F71C5F33DC1B',
      functionKey: 'IsEqual-20EDEBDE-0431-491C-A0E2-F71C5F33DC1B',
      position: { x: 0, y: 0 },
      connections: [{ name: '$if', inputOrder: 1 }],
      connectionShorthand: '1-$if,',
    },
    {
      reactFlowGuid: 'SubString-958BEFDA-0F65-4239-8DE4-143849F2CFC7',
      functionKey: 'SubString-958BEFDA-0F65-4239-8DE4-143849F2CFC7',
      position: { x: 0, y: 0 },
      connections: [
        { name: 'is-equal', inputOrder: 0 },
        { name: '$if', inputOrder: 1 },
      ],
      connectionShorthand: '0-is-equal,1-$if,',
    },
    {
      reactFlowGuid: 'IsEqual-F49743B6-365D-4C57-B8D7-B9C2F46C6105',
      functionKey: 'IsEqual-F49743B6-365D-4C57-B8D7-B9C2F46C6105',
      position: { x: 0, y: 0 },
      connections: [],
      connectionShorthand: '',
    },
    {
      reactFlowGuid: 'SubString-9CDA55AB-192D-44AD-9F1A-AABF6F05DA72',
      functionKey: 'SubString-9CDA55AB-192D-44AD-9F1A-AABF6F05DA72',
      position: { x: 0, y: 0 },
      connections: [{ name: 'is-equal', inputOrder: 0 }],
      connectionShorthand: '0-is-equal,',
    },
    {
      reactFlowGuid: 'SubString-A6DA0C65-6FA9-455C-B503-4031139EB79D',
      functionKey: 'SubString-A6DA0C65-6FA9-455C-B503-4031139EB79D',
      position: { x: 0, y: 0 },
      connections: [],
      connectionShorthand: '',
    },
    {
      reactFlowGuid: 'directAccess-F42A8467-B018-4A5E-A99C-A84FDE50D3F5',
      functionKey: 'directAccess-F42A8467-B018-4A5E-A99C-A84FDE50D3F5',
      position: { x: 0, y: 0 },
      connections: [
        {
          name: 'target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Pressure',
          inputOrder: 0,
        },
      ],
      connectionShorthand: '0-target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Pressure,',
    },
    {
      reactFlowGuid: 'directAccess-66ECF699-942A-4FF6-B5FE-457C8C96DFAD',
      functionKey: 'directAccess-66ECF699-942A-4FF6-B5FE-457C8C96DFAD',
      position: { x: 0, y: 0 },
      connections: [
        {
          name: 'target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/WindSpeed',
          inputOrder: 0,
        },
      ],
      connectionShorthand: '0-target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/WindSpeed,',
    },
    {
      reactFlowGuid: 'directAccess-DE7B5F69-B9D0-4738-8AE2-4CD068B924AF',
      functionKey: 'directAccess-DE7B5F69-B9D0-4738-8AE2-4CD068B924AF',
      position: { x: 0, y: 0 },
      connections: [
        {
          name: 'target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Temperature',
          inputOrder: 0,
        },
      ],
      connectionShorthand: '0-target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Temperature,',
    },
    {
      reactFlowGuid: 'directAccess-02B4F2A8-6440-4699-8E6A-83542FED468A',
      functionKey: 'directAccess-02B4F2A8-6440-4699-8E6A-83542FED468A',
      position: { x: 0, y: 0 },
      connections: [
        {
          name: 'target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Pressure',
          inputOrder: 0,
        },
      ],
      connectionShorthand: '0-target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Pressure,',
    },
    {
      reactFlowGuid: 'directAccess-59B38F28-ECD5-432F-A26B-95D1CA69C6B6',
      functionKey: 'directAccess-59B38F28-ECD5-432F-A26B-95D1CA69C6B6',
      position: { x: 0, y: 0 },
      connections: [
        {
          name: 'target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/WindSpeed',
          inputOrder: 0,
        },
      ],
      connectionShorthand: '0-target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/WindSpeed,',
    },
    {
      reactFlowGuid: 'directAccess-D47B91E9-FE73-40F5-A734-B57B09B2956C',
      functionKey: 'directAccess-D47B91E9-FE73-40F5-A734-B57B09B2956C',
      position: { x: 0, y: 0 },
      connections: [
        {
          name: 'target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Temperature',
          inputOrder: 0,
        },
      ],
      connectionShorthand: '0-target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Temperature,',
    },
    {
      reactFlowGuid: 'index-993A98A9-11DB-4BDA-96B7-2B3CE9B1861D',
      functionKey: 'index',
      position: { x: 0, y: 0 },
      connections: [{ name: 'is-greater-than', inputOrder: 0 }],
      connectionShorthand: '0-is-greater-than,',
    },
    {
      reactFlowGuid: 'IsGreater-55463273-19FD-457E-992A-5CB4C518C959',
      functionKey: 'IsGreater-55463273-19FD-457E-992A-5CB4C518C959',
      position: { x: 0, y: 0 },
      connections: [],
      connectionShorthand: '',
    },
    {
      reactFlowGuid: 'IsEqual-C504308A-39D3-4F2E-9D88-1F0C036A355F',
      functionKey: 'IsEqual-C504308A-39D3-4F2E-9D88-1F0C036A355F',
      position: { x: 0, y: 0 },
      connections: [],
      connectionShorthand: '',
    },
    {
      reactFlowGuid: 'IsEqual-D4D958C2-CA35-4EA0-B73A-B8DD305E1F2F',
      functionKey: 'IsEqual-D4D958C2-CA35-4EA0-B73A-B8DD305E1F2F',
      position: { x: 0, y: 0 },
      connections: [],
      connectionShorthand: '',
    },
    {
      reactFlowGuid: 'IsEqual-F105419C-3E3D-4B9E-9942-DA54084C48A9',
      functionKey: 'IsEqual-F105419C-3E3D-4B9E-9942-DA54084C48A9',
      position: { x: 0, y: 0 },
      connections: [],
      connectionShorthand: '',
    },
    {
      reactFlowGuid: 'IsEqual-C56E68F5-286E-44C0-B1F0-D93B2FBE07E8',
      functionKey: 'IsEqual-C56E68F5-286E-44C0-B1F0-D93B2FBE07E8',
      position: { x: 0, y: 0 },
      connections: [],
      connectionShorthand: '',
    },
    {
      reactFlowGuid: 'IsEqual-63F6BB54-A5B6-416D-B8FE-B3CFE2A5E2E8',
      functionKey: 'IsEqual-63F6BB54-A5B6-416D-B8FE-B3CFE2A5E2E8',
      position: { x: 0, y: 0 },
      connections: [],
      connectionShorthand: '',
    },
  ],
  canvasDimensions: { width: 1271, height: 914 },
};
