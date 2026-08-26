const trimTrailingSlash=(value:string)=>value.replace(/\/+$/,'')

// Vite injects `import.meta.env` at build time. Under plain Node (unit tests) it is absent,
// so read it defensively instead of throwing at module load.
const viteEnv=(import.meta as ImportMeta&{env?:Record<string,string|undefined>}).env??{}

export const env={
  apiBaseUrl:trimTrailingSlash(viteEnv.VITE_API_URL||'http://localhost:3000/api/v1'),
  demoMode:viteEnv.VITE_DEMO_MODE==='true',
  demoAdminPassword:viteEnv.VITE_DEMO_ADMIN_PASSWORD||'',
} as const
