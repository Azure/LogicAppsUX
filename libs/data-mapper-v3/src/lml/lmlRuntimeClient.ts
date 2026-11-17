const apiVersion = '2019-10-01-edge-preview';
const managementPath = '/runtime/webhooks/workflow/api/management/';
const maxResponseBytes = 16 * 1024 * 1024;

export interface LmlTestMapResponse {
  statusCode: number;
  statusText: string;
  outputInstance?: { $content: string; '$content-type': string };
}

export class LmlRuntimeClient {
  constructor(
    private readonly baseUrl: string,
    private readonly authorize: () => void = () => {}
  ) {
    const url = new URL(baseUrl);
    if (
      url.protocol !== 'http:' ||
      url.hostname !== '127.0.0.1' ||
      !url.port ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      throw new Error('LML requests require the owned loopback runtime URL.');
    }
  }

  private segment(value: string): string {
    if (!value || value === '.' || value === '..' || /[\\/\0]/.test(value)) {
      throw new Error('LML runtime identifiers must be local filenames.');
    }
    return encodeURIComponent(value);
  }

  private async request(endpoint: string, body?: unknown, relativePath?: string): Promise<{ response: Response; data: any }> {
    if (!/^(mapTransformations|generateXslt|schemas\/[^/]+\/contents\/schemaTree|maps\/[^/]+\/testMap)$/.test(endpoint)) {
      throw new Error('Unsupported LML runtime endpoint.');
    }
    const url = new URL(`${managementPath}${endpoint}`, this.baseUrl);
    url.searchParams.set('api-version', apiVersion);
    if (relativePath) {
      url.searchParams.set('relativePath', relativePath);
    }
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 30000);
    try {
      this.authorize();
      const response = await fetch(url.href, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'api-version': apiVersion },
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'error',
        signal: controller.signal,
      });
      const chunks: Uint8Array[] = [];
      let size = 0;
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('LML runtime returned an empty response.');
      }
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) {
            break;
          }
          size += chunk.value.byteLength;
          if (size > maxResponseBytes) {
            controller.abort();
            throw new Error('LML runtime response exceeded 16 MiB.');
          }
          chunks.push(chunk.value);
        }
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      let data: unknown;
      try {
        data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        throw new Error(`LML runtime returned invalid JSON (HTTP ${response.status}).`);
      }
      return { response, data };
    } finally {
      clearTimeout(deadline);
    }
  }

  private error(response: Response, data: any): string {
    const detail = data?.error;
    return typeof detail?.code === 'string' && typeof detail?.message === 'string'
      ? `${response.status} - ${detail.code}: ${detail.message}`
      : `LML runtime request failed (HTTP ${response.status}).`;
  }

  async getFunctionsManifest(): Promise<unknown> {
    const { response, data } = await this.request('mapTransformations');
    if (!response.ok) {
      throw new Error(this.error(response, data));
    }
    return data;
  }

  async getSchemaFile(schemaName: string, schemaFilePath: string): Promise<unknown> {
    const filename = schemaName.slice(0, schemaName.lastIndexOf('.'));
    const relativePath = schemaFilePath.slice(0, -schemaName.length);
    const { response, data } = await this.request(`schemas/${this.segment(filename)}/contents/schemaTree`, undefined, relativePath);
    if (!response.ok) {
      throw new Error(this.error(response, data));
    }
    return data;
  }

  async generateDataMapXslt(dataMapDefinition: string): Promise<string> {
    const { response, data } = await this.request('generateXslt', { MapContent: dataMapDefinition });
    if (!response.ok) {
      throw new Error(this.error(response, data));
    }
    if (typeof data?.xsltContent !== 'string') {
      throw new Error('LML runtime did not return xsltContent.');
    }
    return data.xsltContent;
  }

  async testDataMap(xsltFilename: string, schemaInputValue: string): Promise<LmlTestMapResponse> {
    const mapName = xsltFilename.replace(/\.xslt$/i, '');
    const { response, data } = await this.request(`maps/${this.segment(mapName)}/testMap`, {
      InputInstanceMessage: { '$content-type': 'application/xml', $content: Buffer.from(schemaInputValue).toString('base64') },
    });
    if (!response.ok) {
      return { statusCode: response.status, statusText: this.error(response, data) };
    }
    if (typeof data?.outputInstance?.$content !== 'string') {
      throw new Error('Test Map error: Schema output instance not properly set on successful response');
    }
    return {
      statusCode: response.status,
      statusText: response.statusText,
      outputInstance: { ...data.outputInstance, $content: Buffer.from(data.outputInstance.$content, 'base64').toString('utf8') },
    };
  }
}
