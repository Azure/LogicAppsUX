import { BlobServiceClient, newPipeline } from '@azure/storage-blob';

export function createAzuriteBlobClient(connectionString: string): BlobServiceClient {
  const client = BlobServiceClient.fromConnectionString(connectionString);
  const pipeline = newPipeline(client.credential, { retryOptions: { maxTries: 1 } });
  pipeline.factories.push({
    create(nextPolicy) {
      return {
        sendRequest(request) {
          // Preserve the legacy probe's API version before signing; SDK defaults can exceed Azurite support.
          request.headers.set('x-ms-version', '2018-03-28');
          return nextPolicy.sendRequest(request);
        },
      };
    },
  });
  return new BlobServiceClient(client.url, pipeline);
}
