import { createClient } from '@insforge/sdk';

/**
 * Single InsForge SDK client for the app. Uses the public anon key only —
 * never the CLI/service API key (that one stays server-side / in the CLI,
 * not in a browser bundle).
 *
 * Get the anon key with: npx @insforge/cli secrets get ANON_KEY
 */
export const insforge = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_URL || 'https://x6ijk4nb.ap-southeast.insforge.app',
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY || 'anon_ac1eb3542a3f12fca46343ffc8daf280fd3570ac65a9ac95c623785e1cfa9733',
});
