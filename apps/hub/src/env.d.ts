/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHECKIN_URL: string
  readonly VITE_REGISTRATION_URL: string
  readonly VITE_FINANCE_URL: string
  readonly VITE_APPLY_URL: string
  readonly VITE_INVENTORY_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
