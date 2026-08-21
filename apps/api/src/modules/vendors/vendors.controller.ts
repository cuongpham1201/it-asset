import { Body,ConflictException,Controller,Delete,ForbiddenException,Get,Param,ParseUUIDPipe,Patch,Post,Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Prisma } from '@prisma/client'
import type { Request } from 'express'
import { PrismaService } from '../../database/prisma.service'
import { VendorDto } from './vendors.dto'
type AuthRequest=Request&{authUser:{id:string;role:string}}
@ApiTags('Vendors') @Controller('vendors')
export class VendorsController{
  constructor(private readonly db:PrismaService){}
  private manage(req:AuthRequest){if(!['ADMIN','IT'].includes(req.authUser.role))throw new ForbiddenException('Chỉ Admin hoặc IT được quản lý nhà cung cấp')}
  private data(body:VendorDto){return {...body,code:body.code.trim().toUpperCase(),lastEvaluation:body.lastEvaluation?new Date(body.lastEvaluation):null,scores:body.scores as Prisma.InputJsonValue}}
  @Get() list(){return this.db.vendor.findMany({orderBy:{name:'asc'}})}
  @Post() async create(@Body() body:VendorDto,@Req() req:AuthRequest){this.manage(req);try{return await this.db.vendor.create({data:this.data(body)})}catch(error:any){if(error?.code==='P2002')throw new ConflictException('Mã nhà cung cấp đã tồn tại');throw error}}
  @Patch(':id') update(@Param('id',ParseUUIDPipe) id:string,@Body() body:VendorDto,@Req() req:AuthRequest){this.manage(req);return this.db.vendor.update({where:{id},data:this.data(body)})}
  @Delete(':id') async remove(@Param('id',ParseUUIDPipe) id:string,@Req() req:AuthRequest){this.manage(req);await this.db.vendor.delete({where:{id}});return {success:true}}
}
