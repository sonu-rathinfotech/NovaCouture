/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  /** Either name works — Supabase renamed "anon" to "publishable". */
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_ENQUIRY_EMAIL?: string
  readonly VITE_FEATURE_ENQUIRY_FOR_REGISTERED?: string
  readonly VITE_FEATURE_OTP_LOGIN?: string
  readonly VITE_FEATURE_COLLECTION_PRODUCT_VIEWS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
