import { BadRequestException,Injectable,Logger,OnModuleInit,UnauthorizedException } from '@nestjs/common'
import { createHash,randomBytes } from 'node:crypto'
import { PrismaService } from '../database/prisma.service'
import { hashPassword,isPasswordPolicyValid,verifyPassword } from './password'

const INITIAL_ADMIN={
  employeeCode:'ADMIN-001',
  username:'admin',
  fullName:'Quản trị viên',
  email:'admin@localhost',
} as const

@Injectable()
export class AuthService implements OnModuleInit{
  private readonly logger=new Logger(AuthService.name)
  private readonly sessionHours=Math.max(1,Number(process.env.SESSION_TTL_HOURS||12))

  constructor(private readonly prisma:PrismaService){}

  async onModuleInit(){await this.ensureInitialAdmin()}

  private async ensureInitialAdmin(){
    const existing=await this.prisma.user.findUnique({where:{username:INITIAL_ADMIN.username},select:{id:true}})
    if(existing)return
    try{
      await this.prisma.user.create({data:{
        ...INITIAL_ADMIN,
        passwordHash:await hashPassword('admin123'),
        role:'ADMIN',
        authSource:'LOCAL',
        mustChangePassword:true,
      }})
      this.logger.warn('Initial local administrator created; password change is required at first sign-in.')
    }catch(error:any){
      if(error?.code!=='P2002')throw error
    }
  }

  private tokenHash(token:string){return createHash('sha256').update(token).digest('hex')}

  toClientUser(user:{id:string;username:string;fullName:string;email:string;role:string;mustChangePassword:boolean;departmentId:string|null}){
    const role=user.role==='ADMIN'?'Admin':user.role==='HCNS'?'HCNS':'IT'
    return {id:user.id,username:user.username,name:user.fullName,email:user.email,role,departmentScope:user.role==='ADMIN'?['*']:user.departmentId?[user.departmentId]:[],mustChangePassword:user.mustChangePassword}
  }

  async login(username:string,password:string){
    const user=await this.prisma.user.findUnique({where:{username:username.trim().toLowerCase()}})
    if(!user||user.status!=='ACTIVE'||user.authSource!=='LOCAL'||!user.passwordHash||!(await verifyPassword(password,user.passwordHash))){
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng')
    }
    const token=randomBytes(32).toString('base64url')
    const expiresAt=new Date(Date.now()+this.sessionHours*60*60*1000)
    await this.prisma.$transaction([
      this.prisma.authSession.create({data:{tokenHash:this.tokenHash(token),userId:user.id,expiresAt}}),
      this.prisma.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}}),
    ])
    return {token,expiresAt,user:this.toClientUser(user)}
  }

  async authenticate(token?:string){
    if(!token)return null
    const session=await this.prisma.authSession.findUnique({where:{tokenHash:this.tokenHash(token)},include:{user:true}})
    if(!session||session.revokedAt||session.expiresAt<=new Date()||session.user.status!=='ACTIVE')return null
    return session.user
  }

  async changePassword(userId:string,newPassword:string){
      if(!isPasswordPolicyValid(newPassword)){
      throw new BadRequestException('Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt')
    }
    const user=await this.prisma.user.findUnique({where:{id:userId}})
    if(!user)throw new UnauthorizedException()
    if(user.passwordHash&&await verifyPassword(newPassword,user.passwordHash))throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại')
    await this.prisma.user.update({where:{id:userId},data:{passwordHash:await hashPassword(newPassword),mustChangePassword:false,passwordChangedAt:new Date()}})
  }

  async logout(token?:string){
    if(!token)return
    await this.prisma.authSession.updateMany({where:{tokenHash:this.tokenHash(token),revokedAt:null},data:{revokedAt:new Date()}})
  }
}
