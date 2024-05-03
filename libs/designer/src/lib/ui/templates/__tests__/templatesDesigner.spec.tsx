// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, beforeAll, afterEach } from 'vitest';
import type { RootState } from '../../../core/state/templates/store';

describe('ui/settings/settingsection', () => {
  let minimal: Partial<RootState>;
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeAll(() => {
    minimal = {
      manifest: {
        availableTemplateNames: ['template1'],
        availableTemplates: {
          template1: {
            title: 'Template 1',
            description: 'Template 1 Description',
            skus: ['standard'],
            kinds: ['stateful'],
            artifacts: [
              {
                type: 'workflow',
                file: 'workflow.json',
              },
              {
                type: 'description',
                file: 'description.md',
              },
            ],
            connections: [],
            parameters: [],
          },
        },
      },
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });
});
