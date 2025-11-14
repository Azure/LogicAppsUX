// Client-only environment variables
// This module should only be imported on the client side

if (typeof window === 'undefined') {
  throw new Error('env.client should only be imported on the client side');
}

import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_ENTRA_CLIENT_ID: z.string().min(1),
    VITE_ENTRA_TENANT_ID: z.string().min(1),
    VITE_ENTRA_REDIRECT_URI: z.string().url().optional(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
