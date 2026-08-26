import { Controller,Get,Query,Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { ListAuditLogsQuery } from './audit.dto'
import { AuditService } from './audit.service'

type AuthRequest=Request&{authUser:{id:string;role:string}}

@ApiTags('Audit log') @Controller('admin/audit-logs')
export class AuditController{
  constructor(private readonly audit:AuditService){}
  @Get() list(@Query() query:ListAuditLogsQuery,@Req() req:AuthRequest){return this.audit.list(query,req.authUser)}
  @Get('filters') filters(@Req() req:AuthRequest){return this.audit.filterOptions(req.authUser)}
}
