import { BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { MasterDataDto } from './master-data.dto'

type Actor={id:string;role:string}
/** Only the fields worth keeping in the trail; everything else is noise or derived. */
const departmentSnapshot=(row:{code:string;name:string;status:string;isIncidentResponseTeam:boolean})=>({code:row.code,name:row.name,status:row.status,isIncidentResponseTeam:row.isIncidentResponseTeam})
const locationSnapshot=(row:{code:string;name:string;address:string|null;status:string})=>({code:row.code,name:row.name,address:row.address,status:row.status})

@Injectable()
export class MasterDataService{
  constructor(private readonly db:PrismaService){}
  private admin(actor:{role:string}){if(actor.role!=='ADMIN')throw new ForbiddenException('Chỉ Admin được quản lý danh mục hệ thống')}
  private fail(error:any):never{if(error?.code==='P2002')throw new ConflictException('Mã danh mục đã tồn tại');throw error}

  private audit(tx:Prisma.TransactionClient,actor:Actor,action:string,entityType:string,entityId:string,oldValues:unknown,newValues:unknown){
    return tx.auditLog.create({data:{userId:actor.id,action,entityType,entityId,oldValues:(oldValues??undefined) as Prisma.InputJsonValue,newValues:(newValues??undefined) as Prisma.InputJsonValue}})
  }

  async createDepartment(body:MasterDataDto,actor:Actor){
    this.admin(actor)
    try{
      return await this.db.$transaction(async tx=>{
        const department=await tx.department.create({data:{code:body.code.trim().toUpperCase(),name:body.name.trim(),isIncidentResponseTeam:body.isIncidentResponseTeam||false}})
        await this.audit(tx,actor,'DEPARTMENT_CREATED','Department',department.id,undefined,departmentSnapshot(department))
        return department
      })
    }catch(error){this.fail(error)}
  }

  async updateDepartment(id:string,body:MasterDataDto,actor:Actor){
    this.admin(actor)
    const existing=await this.db.department.findUnique({where:{id}})
    if(!existing)throw new NotFoundException()
    try{
      return await this.db.$transaction(async tx=>{
        const department=await tx.department.update({where:{id},data:{code:body.code.trim().toUpperCase(),name:body.name.trim(),isIncidentResponseTeam:body.isIncidentResponseTeam}})
        await this.audit(tx,actor,'DEPARTMENT_UPDATED','Department',department.id,departmentSnapshot(existing),departmentSnapshot(department))
        return department
      })
    }catch(error){this.fail(error)}
  }

  async removeDepartment(id:string,actor:Actor){
    this.admin(actor)
    const existing=await this.db.department.findUnique({where:{id}})
    if(!existing)throw new NotFoundException()
    if(await this.db.asset.count({where:{departmentId:id,deletedAt:null}})||await this.db.person.count({where:{departmentId:id,status:'ACTIVE'}}))
      throw new BadRequestException('Không thể ngừng phòng ban đang có người dùng hoặc tài sản')
    await this.db.$transaction(async tx=>{
      const department=await tx.department.update({where:{id},data:{status:'INACTIVE'}})
      await this.audit(tx,actor,'DEPARTMENT_DEACTIVATED','Department',id,departmentSnapshot(existing),departmentSnapshot(department))
    })
    return {success:true}
  }

  async createLocation(body:MasterDataDto,actor:Actor){
    this.admin(actor)
    try{
      return await this.db.$transaction(async tx=>{
        const location=await tx.location.create({data:{code:body.code.trim().toUpperCase(),name:body.name.trim(),address:body.address?.trim(),type:'SITE'}})
        const warehouse=await tx.warehouse.create({data:{code:`KHO-${body.code.trim().toUpperCase()}`.slice(0,50),name:`Kho ${body.name.trim()}`,locationId:location.id,description:'Kho mặc định của site'}})
        await this.audit(tx,actor,'LOCATION_CREATED','Location',location.id,undefined,{...locationSnapshot(location),defaultWarehouseCode:warehouse.code})
        return location
      })
    }catch(error){this.fail(error)}
  }

  async updateLocation(id:string,body:MasterDataDto,actor:Actor){
    this.admin(actor)
    const existing=await this.db.location.findUnique({where:{id}})
    if(!existing)throw new NotFoundException()
    try{
      return await this.db.$transaction(async tx=>{
        const location=await tx.location.update({where:{id},data:{code:body.code.trim().toUpperCase(),name:body.name.trim(),address:body.address?.trim()}})
        await this.audit(tx,actor,'LOCATION_UPDATED','Location',location.id,locationSnapshot(existing),locationSnapshot(location))
        return location
      })
    }catch(error){this.fail(error)}
  }

  async removeLocation(id:string,actor:Actor){
    this.admin(actor)
    const existing=await this.db.location.findUnique({where:{id}})
    if(!existing)throw new NotFoundException()
    if(await this.db.asset.count({where:{locationId:id,deletedAt:null}})||await this.db.warehouse.count({where:{locationId:id,assets:{some:{deletedAt:null}}}}))
      throw new BadRequestException('Không thể ngừng site đang có kho chứa tài sản')
    await this.db.$transaction(async tx=>{
      await tx.warehouse.updateMany({where:{locationId:id},data:{status:'INACTIVE'}})
      const location=await tx.location.update({where:{id},data:{status:'INACTIVE'}})
      await this.audit(tx,actor,'LOCATION_DEACTIVATED','Location',id,locationSnapshot(existing),locationSnapshot(location))
    })
    return {success:true}
  }
}
