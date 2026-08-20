import { Body,Controller,Get,Post,Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { CreateAssetCategoryDto } from './categories.dto'
import { CategoriesService } from './categories.service'

type AuthRequest=Request&{authUser:{id:string;role:string}}

@ApiTags('Asset categories')
@Controller('admin/categories')
export class CategoriesController{
  constructor(private readonly categories:CategoriesService){}
  @Get() list(@Req() req:AuthRequest){this.categories.assertAdmin(req.authUser);return this.categories.list()}
  @Post() create(@Body() body:CreateAssetCategoryDto,@Req() req:AuthRequest){this.categories.assertAdmin(req.authUser);return this.categories.create(body,req.authUser)}
}
