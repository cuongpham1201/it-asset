import { env } from '../config/env'

export class ApiError extends Error {
  constructor(public status:number,public code:string,message:string,public details?:unknown){super(message)}
}

/** True when the failure means "your session is gone", not "this request was wrong". */
export const isUnauthorized=(error:unknown)=>error instanceof ApiError&&error.status===401

/** True when the request was cancelled by an AbortController rather than failing. */
export const isAborted=(error:unknown)=>(error as {name?:string})?.name==='AbortError'

type UnauthorizedHandler=()=>void
let onUnauthorized:UnauthorizedHandler|undefined

/**
 * Registers the single place that reacts to an expired session. The whole app shares it so
 * that no screen has to detect 401 on its own, and stale data is never left on screen.
 */
export function setUnauthorizedHandler(handler:UnauthorizedHandler|undefined){onUnauthorized=handler}

type RequestOptions=Omit<RequestInit,'body'>&{body?:unknown}

/** Endpoints where a 401 is an expected answer rather than a lost session. */
const AUTH_PROBES=['/auth/login','/auth/me']

async function request<T>(path:string,options:RequestOptions={}):Promise<T>{
  const response=await fetch(`${env.apiBaseUrl}${path}`,{
    ...options,
    credentials:'include',
    headers:{'Accept':'application/json',...(options.body===undefined?{}:{'Content-Type':'application/json'}),...options.headers},
    body:options.body===undefined?undefined:JSON.stringify(options.body),
  })
  const contentType=response.headers.get('content-type')||''
  const payload=contentType.includes('application/json')?await response.json():undefined
  if(!response.ok){
    if(response.status===401&&!AUTH_PROBES.some(probe=>path.startsWith(probe)))onUnauthorized?.()
    throw new ApiError(response.status,payload?.code||'HTTP_ERROR',payload?.message||`HTTP ${response.status}`,payload?.details)
  }
  return payload as T
}

export const api={
  get:<T>(path:string,signal?:AbortSignal)=>request<T>(path,{method:'GET',signal}),
  post:<T>(path:string,body?:unknown)=>request<T>(path,{method:'POST',body}),
  put:<T>(path:string,body?:unknown)=>request<T>(path,{method:'PUT',body}),
  patch:<T>(path:string,body?:unknown)=>request<T>(path,{method:'PATCH',body}),
  delete:<T>(path:string)=>request<T>(path,{method:'DELETE'}),
}

/** Turns any thrown value into a message safe to show a user. */
export const apiErrorMessage=(error:unknown)=>error instanceof Error&&error.message?error.message:'Không thể xử lý yêu cầu'
