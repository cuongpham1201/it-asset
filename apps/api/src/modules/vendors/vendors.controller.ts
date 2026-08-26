import { Body,ConflictException,Controller,Delete,ForbiddenException,Get,NotFoundException,Param,ParseUUIDPipe,Patch,Post,Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Prisma } from '@prisma/client'
import type { Request } from 'express'
import { PrismaService } from '../../database/prisma.service'
import { VendorDto } from './vendors.dto'

type AuthRequest=Request&{authUser:{id:string;role:string}}

/** The fields worth keeping in the audit trail; scores and notes are noise for a change log. */
const snapshot=(row:{code:string;name:string;category:string;contact:string;status:string;taxCode:string|null;email:string|null;phone:string|null})=>
  ({code:row.code,name:row.name,category:row.category,contact:row.contact,status:row.status,taxCode:row.taxCode,email:row.email,phone:row.phone})

@ApiTags('Vendors') @Controller('vendors')
export class VendorsController{
  constructor(private readonly db:PrismaService){}
  private manage(req:AuthRequest){if(!['ADMIN','IT'].includes(req.authUser.role))throw new ForbiddenException('Chỉ Admin hoặc IT được quản lý nhà cung cấp')}
  private data(body:VendorDto){return {...body,code:body.code.trim().toUpperCase(),lastEvaluation:body.lastEvaluation?new Date(body.lastEvaluation):null,scores:body.scores as Prisma.InputJsonValue}}
  private audit(tx:Prisma.TransactionClient,actorId:string,action:string,entityId:string,oldValues:unknown,newValues:unknown){
    return tx.auditLog.create({data:{userId:actorId,action,entityType:'Vendor',entityId,oldValues:(oldValues??undefined) as Prisma.InputJsonValue,newValues:(newValues??undefined) as Prisma.InputJsonValue}})
  }

  @Get() list(){return this.db.vendor.findMany({orderBy:{name:'asc'}})}

  @Post() async create(@Body() body:VendorDto,@Req() req:AuthRequest){
    this.manage(req)
    try{
      return await this.db.$transaction(async tx=>{
        const vendor=await tx.vendor.create({data:this.data(body)})
        await this.audit(tx,req.authUser.id,'VENDOR_CREATED',vendor.id,undefined,snapshot(vendor))
        return vendor
      })
    }catch(error:any){if(error?.code==='P2002')throw new ConflictException('Mã nhà cung cấp đã tồn tại');throw error}
  }

  @Patch(':id') async update(@Param('id',ParseUUIDPipe) id:string,@Body() body:VendorDto,@Req() req:AuthRequest){
    this.manage(req)
    const existing=await this.db.vendor.findUnique({where:{id}})
    if(!existing)throw new NotFoundException('Không tìm thấy nhà cung cấp')
    try{
      return await this.db.$transaction(async tx=>{
        const vendor=await tx.vendor.update({where:{id},data:this.data(body)})
        await this.audit(tx,req.authUser.id,'VENDOR_UPDATED',vendor.id,snapshot(existing),snapshot(vendor))
        return vendor
      })
    }catch(error:any){if(error?.code==='P2002')throw new ConflictException('Mã nhà cung cấp đã tồn tại');throw error}
  }

  @Delete(':id') async remove(@Param('id',ParseUUIDPipe) id:string,@Req() req:AuthRequest){
    this.manage(req)
    const existing=await this.db.vendor.findUnique({where:{id}})
    if(!existing)throw new NotFoundException('Không tìm thấy nhà cung cấp')
    await this.db.$transaction(async tx=>{
      await tx.vendor.delete({where:{id}})
      await this.audit(tx,req.authUser.id,'VENDOR_DELETED',id,snapshot(existing),undefined)
    })
    return {success:true}
  }
}
