/// <reference types="vite/client" />

declare module '*.md?raw' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_DEFAULT_MODEL: string;
  readonly VITE_HAI_PROXY_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
