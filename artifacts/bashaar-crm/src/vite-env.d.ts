/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute URL of the deployed API server (e.g. "https://api.example.com").
   * Leave unset for local dev — the Vite dev server proxies "/api" to
   * API_PROXY_TARGET instead. Required in production if the frontend and
   * API are hosted on different domains (e.g. frontend on InsForge Sites).
   */
  readonly VITE_API_BASE_URL?: string;
  /** InsForge project base URL, e.g. "https://8zep5bx5.ap-southeast.insforge.app" */
  readonly VITE_INSFORGE_URL: string;
  /** InsForge anon key (public, safe for the browser — not the CLI/service API key) */
  readonly VITE_INSFORGE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
