import { registerPlugin } from '@capacitor/core';

import type { CorsBypassPlugin } from './definitions.js';

const CorsBypass = registerPlugin<CorsBypassPlugin>('CorsBypass', {
  web: () => import('./web.js').then(m => new m.CorsBypassWeb()),
});

export * from './definitions.js';
export { CorsBypass };
