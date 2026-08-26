import { BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateAssetModelDto,CreateManufacturerDto,UpdateAssetModelDto,UpdateManufacturerDto } from './catalog.dto'

type Actor={id:string;role:string}

const modelInclude={category:{select:{id:true,code:true,name:true}},manufacturer:{select:{id:true,name:true}},_count:{select:{assets:true}}} as const

@Injectable()
export class CatalogService{
  constructor(private readonly db:PrismaService){}

  assertAdmin(actor:Actor){if(actor.role!=='ADMIN')throw new ForbiddenException('Chỉ quản trị viên được quản lý hãng sản xuất và model')}

  private audit(tx:Prisma.TransactionClient,actor:Actor,action:string,entityType:string,entityId:string,oldValues:unknown,newValues:unknown){
    return tx.auditLog.create({data:{userId:actor.id,action,entityType,entityId,oldValues:(oldValues??undefined) as Prisma.InputJsonValue,newValues:(newValues??undefined) as Prisma.InputJsonValue}})
  }

  /** Retiring a record is a different event from renaming one, so it gets its own action. */
  private changeAction(prefix:string,previousStatus:string,nextStatus?:string){
    if(nextStatus&&nextStatus!==previousStatus)return `${prefix}_${nextStatus==='INACTIVE'?'DEACTIVATED':'REACTIVATED'}`
    return `${prefix}_UPDATED`
  }

  private manufacturerSnapshot(row:{name:string;website:string|null;supportUrl:string|null;supportPhone:string|null;status:string}){
    return {name:row.name,website:row.website,supportUrl:row.supportUrl,supportPhone:row.supportPhone,status:row.status}
  }

  private modelSnapshot(row:{name:string;modelNumber:string|null;manufacturerId:string;categoryId:string;status:string}){
    return {name:row.name,modelNumber:row.modelNumber,manufacturerId:row.manufacturerId,categoryId:row.categoryId,status:row.status}
  }

  listManufacturers(){
    return this.db.manufacturer.findMany({include:{_count:{select:{models:true,assets:true}}},orderBy:[{status:'asc'},{name:'asc'}]})
  }

  async createManufacturer(body:CreateManufacturerDto,actor:Actor){
    this.assertAdmin(actor)
    try{
      return await this.db.$transaction(async tx=>{
        const manufacturer=await tx.manufacturer.create({data:{name:body.name,website:body.website||null,supportUrl:body.supportUrl||null,supportPhone:body.supportPhone||null}})
        await this.audit(tx,actor,'MANUFACTURER_CREATED','Manufacturer',manufacturer.id,undefined,this.manufacturerSnapshot(manufacturer))
        return manufacturer
      })
    }catch(error:any){if(error?.code==='P2002')throw new ConflictException('Tên hãng sản xuất đã tồn tại');throw error}
  }

  async updateManufacturer(id:string,body:UpdateManufacturerDto,actor:Actor){
    this.assertAdmin(actor)
    const existing=await this.db.manufacturer.findUnique({where:{id}})
    if(!existing)throw new NotFoundException('Không tìm thấy hãng sản xuất')
    if(body.status==='INACTIVE'){
      const used=await this.db.asset.count({where:{manufacturerId:id,deletedAt:null}})
      if(used)throw new BadRequestException('Không thể ngừng hãng sản xuất đang được gán cho tài sản')
    }
    try{
      return await this.db.$transaction(async tx=>{
        const manufacturer=await tx.manufacturer.update({where:{id},data:{name:body.name,website:body.website,supportUrl:body.supportUrl,supportPhone:body.supportPhone,status:body.status}})
        await this.audit(tx,actor,this.changeAction('MANUFACTURER',existing.status,body.status),'Manufacturer',manufacturer.id,this.manufacturerSnapshot(existing),this.manufacturerSnapshot(manufacturer))
        return manufacturer
      })
    }catch(error:any){if(error?.code==='P2002')throw new ConflictException('Tên hãng sản xuất đã tồn tại');throw error}
  }

  listModels(){
    return this.db.assetModel.findMany({include:modelInclude,orderBy:[{status:'asc'},{name:'asc'}]})
  }

  private async assertModelRefs(manufacturerId?:string,categoryId?:string){
    if(manufacturerId){
      const manufacturer=await this.db.manufacturer.findFirst({where:{id:manufacturerId,status:'ACTIVE'}})
      if(!manufacturer)throw new BadRequestException('Hãng sản xuất không tồn tại hoặc đã ngừng hoạt động')
    }
    if(categoryId){
      const category=await this.db.assetCategory.findFirst({where:{id:categoryId,status:'ACTIVE'}})
      if(!category)throw new BadRequestException('Nhóm tài sản không tồn tại hoặc đã ngừng hoạt động')
    }
  }

  async createModel(body:CreateAssetModelDto,actor:Actor){
    this.assertAdmin(actor)
    await this.assertModelRefs(body.manufacturerId,body.categoryId)
    try{
      return await this.db.$transaction(async tx=>{
        const model=await tx.assetModel.create({data:{name:body.name,manufacturerId:body.manufacturerId,categoryId:body.categoryId,modelNumber:body.modelNumber||null,description:body.description||null},include:modelInclude})
        await this.audit(tx,actor,'ASSET_MODEL_CREATED','AssetModel',model.id,undefined,this.modelSnapshot(model))
        return model
      })
    }catch(error:any){if(error?.code==='P2002')throw new ConflictException('Model này đã tồn tại cho hãng sản xuất đã chọn');throw error}
  }

  async updateModel(id:string,body:UpdateAssetModelDto,actor:Actor){
    this.assertAdmin(actor)
    const existing=await this.db.assetModel.findUnique({where:{id}})
    if(!existing)throw new NotFoundException('Không tìm thấy model')
    await this.assertModelRefs(body.manufacturerId,body.categoryId)
    if(body.status==='INACTIVE'){
      const used=await this.db.asset.count({where:{modelId:id,deletedAt:null}})
      if(used)throw new BadRequestException('Không thể ngừng model đang được gán cho tài sản')
    }
    try{
      return await this.db.$transaction(async tx=>{
        const model=await tx.assetModel.update({where:{id},data:{name:body.name,manufacturerId:body.manufacturerId,categoryId:body.categoryId,modelNumber:body.modelNumber,description:body.description,status:body.status},include:modelInclude})
        await this.audit(tx,actor,this.changeAction('ASSET_MODEL',existing.status,body.status),'AssetModel',model.id,this.modelSnapshot(existing),this.modelSnapshot(model))
        return model
      })
    }catch(error:any){if(error?.code==='P2002')throw new ConflictException('Model này đã tồn tại cho hãng sản xuất đã chọn');throw error}
  }
}
