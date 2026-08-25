import { Controller,Get,Headers,ServiceUnavailableException,UnauthorizedException } from '@nestjs/common'
import { Header } from '@nestjs/common'
import { timingSafeEqual } from 'node:crypto'
import { PrismaService } from '../database/prisma.service'
import { Public } from '../auth/public.decorator'
import { MetricsService } from './metrics.service'

const constantTimeEquals=(a:string,b:string):boolean=>{const left=Buffer.from(a),right=Buffer.from(b);return left.length===right.length&&timingSafeEqual(left,right)}

@Public()
@Controller('metrics')
export class MetricsController{
  constructor(private readonly metrics:MetricsService,private readonly db:PrismaService){}
  @Get() @Header('Content-Type','text/plain; version=0.0.4; charset=utf-8')
  async read(@Headers('authorization') authorization?:string){const token=process.env.METRICS_TOKEN;if(process.env.NODE_ENV==='production'&&!token)throw new ServiceUnavailableException('METRICS_TOKEN is required in production');if(token&&!constantTimeEquals(authorization||'',`Bearer ${token}`))throw new UnauthorizedException();let ready=true;try{await this.db.$queryRaw`SELECT 1`}catch{ready=false}return this.metrics.render(ready)}
}
