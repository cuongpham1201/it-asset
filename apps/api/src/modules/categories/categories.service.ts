import { BadRequestException,ConflictException,ForbiddenException,Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateAssetCategoryDto,UpdateAssetCategoryDto } from './categories.dto'

type Actor={id:string;role:string}

@Injectable()
export class CategoriesService{
  constructor(private readonly db:PrismaService){}
  assertAdmin(actor:Actor){if(actor.role!=='ADMIN')throw new ForbiddenException('Chỉ quản trị viên được quản lý danh mục tài sản')}

  list(){return this.db.assetCategory.findMany({include:{parent:{select:{id:true,code:true,name:true}},_count:{select:{assets:true,children:true,models:true}}},orderBy:[{status:'asc'},{name:'asc'}]})}

  async create(body:CreateAssetCategoryDto,actor:Actor){
    if(body.parentId){
      const parent=await this.db.assetCategory.findFirst({where:{id:body.parentId,status:'ACTIVE'}})
      if(!parent)throw new BadRequestException('Nhóm tài sản cha không tồn tại hoặc đã ngừng hoạt động')
    }
    const duplicate=await this.db.assetCategory.findFirst({where:{OR:[{code:{equals:body.code,mode:'insensitive'}},{name:{equals:body.name,mode:'insensitive'}}]}})
    if(duplicate)throw new ConflictException('Mã hoặc tên nhóm tài sản đã tồn tại')
    try{
      return await this.db.$transaction(async tx=>{
        const category=await tx.assetCategory.create({data:{code:body.code,name:body.name,parentId:body.parentId||null,description:body.description||null}})
        await tx.auditLog.create({data:{userId:actor.id,action:'ASSET_CATEGORY_CREATED',entityType:'AssetCategory',entityId:category.id,newValues:{code:category.code,name:category.name,parentId:category.parentId} as Prisma.InputJsonValue}})
        return category
      })
    }catch(error:any){if(error?.code==='P2002')throw new ConflictException('Mã nhóm tài sản đã tồn tại');throw error}
  }

  async update(id:string,body:UpdateAssetCategoryDto,actor:Actor){
    const existing=await this.db.assetCategory.findUnique({where:{id}})
    if(!existing)throw new BadRequestException('Không tìm thấy nhóm tài sản')
    if(body.parentId){
      if(body.parentId===id)throw new BadRequestException('Nhóm tài sản không thể là cha của chính nó')
      const parent=await this.db.assetCategory.findFirst({where:{id:body.parentId,status:'ACTIVE'}})
      if(!parent)throw new BadRequestException('Nhóm tài sản cha không tồn tại hoặc đã ngừng hoạt động')
    }
    if(body.status==='INACTIVE'){
      const used=await this.db.asset.count({where:{categoryId:id,deletedAt:null}})
      if(used)throw new BadRequestException('Không thể ngừng nhóm tài sản đang có tài sản')
    }
    try{
      return await this.db.$transaction(async tx=>{
        const category=await tx.assetCategory.update({where:{id},data:{code:body.code,name:body.name,parentId:body.parentId,description:body.description,status:body.status}})
        const action=body.status&&body.status!==existing.status
          ?`ASSET_CATEGORY_${body.status==='INACTIVE'?'DEACTIVATED':'REACTIVATED'}`
          :'ASSET_CATEGORY_UPDATED'
        await tx.auditLog.create({data:{userId:actor.id,action,entityType:'AssetCategory',entityId:category.id,oldValues:{code:existing.code,name:existing.name,parentId:existing.parentId,status:existing.status} as Prisma.InputJsonValue,newValues:{code:category.code,name:category.name,parentId:category.parentId,status:category.status} as Prisma.InputJsonValue}})
        return category
      })
    }catch(error:any){if(error?.code==='P2002')throw new ConflictException('Mã nhóm tài sản đã tồn tại');throw error}
  }
}
