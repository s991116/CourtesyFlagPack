/// <reference types="vite/client" />

declare module "*.ttf?inline" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_GOATCOUNTER_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
