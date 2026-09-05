import { CanActivate,ExecutionContext,ForbiddenException,Injectable,UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { AuthService } from './auth.service'
import { IS_PUBLIC_KEY } from './public.decorator'

/** The only endpoints an authenticated but non-operational account may reach. */
export const SELF_SERVICE_PATHS=['/auth/change-password','/auth/logout','/auth/me'] as const

export function readSessionCookie(request:Request){
  const raw=request.headers.cookie||''
  for(const item of raw.split(';')){
    const [name,...value]=item.trim().split('=')
    if(name==='assetflow_session'||name==='__Host-assetflow_session')try{return decodeURIComponent(value.join('='))}catch{return undefined}
  }
  return undefined
}

@Injectable()
export class AuthGuard implements CanActivate{
  constructor(private readonly reflector:Reflector,private readonly auth:AuthService){}
  async canActivate(context:ExecutionContext){
    if(this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY,[context.getHandler(),context.getClass()]))return true
    const request=context.switchToHttp().getRequest<Request&{authUser?:any;sessionToken?:string}>()
    const token=readSessionCookie(request)
    const user=await this.auth.authenticate(token)
    if(!user)throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn')
    request.authUser=user
    request.sessionToken=token
    if(user.mustChangePassword&&!SELF_SERVICE_PATHS.some(path=>request.path.endsWith(path))){
      throw new ForbiddenException('Phải đổi mật khẩu khởi tạo trước khi sử dụng hệ thống')
    }
    // AssetFlow is operated exclusively by the IT team, and ADMIN is the only supported
    // operational role (P1C product decision). Accounts still carrying a legacy role
    // (IT / HCNS / USER) keep just enough access to see who they are, change their
    // password and sign out — every business endpoint is denied here, in one place,
    // so no controller can be forgotten. Service-level asserts remain as defense in depth.
    if(user.role!=='ADMIN'&&!SELF_SERVICE_PATHS.some(path=>request.path.endsWith(path))){
      throw new ForbiddenException('AssetFlow chỉ dành cho quản trị viên IT. Tài khoản của bạn không có quyền vận hành hệ thống.')
    }
    return true
  }
}
