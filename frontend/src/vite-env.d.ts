/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** Dev only: prefill login — exposed in bundle; ใช้เฉพาะเครื่อง dev */
  readonly VITE_DEV_AUTH_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
