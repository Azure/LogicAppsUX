import type { Operation } from '../models/operation';

export const MockSearchOperations: Operation[] = [
  {
    id: 'azureBlob1',
    brandColor: '#D40100',
    description: 'This operation triggers when a new asset is added to Creative Cloud.',
    iconUri: 'https://cpgeneralstore.blob.core.windows.net/icons/adobecreativecloud.png',
    title: 'When an asset is added',
  },
  {
    id: 'azureBlob2',
    brandColor: '#D40100',
    description: "This operation triggers when an asset's contents are updated in Creative Cloud.",
    iconUri: 'https://cpgeneralstore.blob.core.windows.net/icons/adobecreativecloud.png',
    title: 'When an asset is updated',
  },
  {
    id: 'azureBlob3',
    brandColor: '#F24B18',
    description: 'Fire an action when there is a new review',
    iconUri: 'https://cpgeneralstore.blob.core.windows.net/icons/appfigures.png',
    title: 'When there is a new review',
  },
  {
    id: 'azureBlob4',
    brandColor: '#273347',
    description: 'Triggers when a new project is created.',
    iconUri: 'https://cpgeneralstore.blob.core.windows.net/icons/asana.png',
    title: 'When a project is created',
  },
  {
    id: 'azureBlob5',
    brandColor: '#804998',
    description: 'This operation triggers a flow when one or more blobs are added or modified in a container.',
    iconUri: 'https://az818438.vo.msecnd.net/icons/azureblob.png',
    title: 'When one or more blobs are added or modified (metadata only)',
  },
  {
    id: 'azureBlob6',
    brandColor: '#0072C6',
    description:
      'Triggers any time there are messages in the queue, returning up to 32 messages. The messages will be hidden but remain on the queue until...',
    iconUri: 'https://cpgeneralstore.blob.core.windows.net/icons/azurequeues.png',
    title: 'When there are messages in a queue',
  },
  {
    id: 'azureBlob7',
    brandColor: '#1BAD4B',
    description: 'Trigger a flow when there is a new document in a project.',
    iconUri: 'https://cpgeneralstore.blob.core.windows.net/icons/basecamp2.png',
    title: 'When a document is created',
  },
  // {
  //     brandColor: '#3CB371',
  //     description: 'When a document is created',

  //     iconUri: 'https://cpgeneralstore.blob.core.windows.net/icons/basecamp.png',
  //     title: 'When a document is created',
  //     serviceKey: '/providers/Microsoft.PowerApps/apis/shared_basecamp',
  //     serviceTitle: 'Basecamp 3',
  //     trackEvent: undefined,
  //     tier: 'NotSpecified',
  //     visibility: 'important',
  //     which: 0,
  // },
  // {
  //     brandColor: '#4D4F4F',
  //     description: 'Compose',

  //     iconUri: null,
  //     operationKey: 'compose',
  //     title: 'Compose',
  //     serviceKey: 'connectionProviders/dataOperationsGroup',
  //     serviceTitle: 'Data Operations',
  //     trackEvent: undefined,
  //     which: 1,
  // },
  // {
  //     brandColor: '#C9C9C9',
  //     description: 'Triggers when a new booking is made in 10to8.',

  //     iconUri: 'https://cpgeneralstore.blob.core.windows.net/icons/10to8.png',
  //     operationKey: '/providers/Microsoft.PowerApps/apis/shared_10to8/apiOperations/GetAppointments',
  //     title: 'When a booking is made',
  //     serviceKey: '/providers/Microsoft.PowerApps/apis/shared_10to8',
  //     serviceTitle: '10to8 Appointment Scheduling',
  //     tier: 'NotSpecified',
  //     trackEvent: undefined,
  //     visibility: 'important',
  //     which: 0,
  // },
];
