const trimTrailingSlash=(value:string)=>value.replace(/\/+$/,'')

export const env={
  apiBaseUrl:trimTrailingSlash(import.meta.env.VITE_API_URL||'http://localhost:3000/api/v1'),
  demoMode:import.meta.env.VITE_DEMO_MODE==='true',
  demoAdminPassword:import.meta.env.VITE_DEMO_ADMIN_PASSWORD||'',
} as const
