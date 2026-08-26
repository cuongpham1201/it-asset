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

  private audit(tx:Prisma.TransactionClient,actor:Actor,action:string,entityType:string,entityId:string,values:Record<string,unknown>){
    return tx.auditLog.create({data:{userId:actor.id,action,entityType,entityId,newValues:values as Prisma.InputJsonValue}})
  }

  listManufacturers(){
    return this.db.manufacturer.findMany({include:{_count:{select:{models:true,assets:true}}},orderBy:[{status:'asc'},{name:'asc'}]})
  }

  async createManufacturer(body:CreateManufacturerDto,actor:Actor){
    this.assertAdmin(actor)
    try{
      return await this.db.$transaction(async tx=>{
        const manufacturer=await tx.manufacturer.create({data:{name:body.name,website:body.website||null,supportUrl:body.supportUrl||null,supportPhone:body.supportPhone||null}})
        await this.audit(tx,actor,'MANUFACTURER_CREATED','Manufacturer',manufacturer.id,{name:manufacturer.name})
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
        await this.audit(tx,actor,'MANUFACTURER_UPDATED','Manufacturer',manufacturer.id,{name:manufacturer.name,status:manufacturer.status})
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
        await this.audit(tx,actor,'ASSET_MODEL_CREATED','AssetModel',model.id,{name:model.name,manufacturerId:model.manufacturerId,categoryId:model.categoryId})
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
        await this.audit(tx,actor,'ASSET_MODEL_UPDATED','AssetModel',model.id,{name:model.name,status:model.status})
        return model
      })
    }catch(error:any){if(error?.code==='P2002')throw new ConflictException('Model này đã tồn tại cho hãng sản xuất đã chọn');throw error}
  }
}
