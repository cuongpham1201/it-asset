import { Body,Controller,Get,Param,ParseUUIDPipe,Patch,Post,Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { CreateAssetModelDto,CreateManufacturerDto,UpdateAssetModelDto,UpdateManufacturerDto } from './catalog.dto'
import { CatalogService } from './catalog.service'

type AuthRequest=Request&{authUser:{id:string;role:string}}

@ApiTags('Asset catalog') @Controller('admin')
export class CatalogController{
  constructor(private readonly catalog:CatalogService){}

  @Get('manufacturers') listManufacturers(@Req() req:AuthRequest){this.catalog.assertAdmin(req.authUser);return this.catalog.listManufacturers()}
  @Post('manufacturers') createManufacturer(@Body() body:CreateManufacturerDto,@Req() req:AuthRequest){return this.catalog.createManufacturer(body,req.authUser)}
  @Patch('manufacturers/:id') updateManufacturer(@Param('id',ParseUUIDPipe) id:string,@Body() body:UpdateManufacturerDto,@Req() req:AuthRequest){return this.catalog.updateManufacturer(id,body,req.authUser)}

  @Get('models') listModels(@Req() req:AuthRequest){this.catalog.assertAdmin(req.authUser);return this.catalog.listModels()}
  @Post('models') createModel(@Body() body:CreateAssetModelDto,@Req() req:AuthRequest){return this.catalog.createModel(body,req.authUser)}
  @Patch('models/:id') updateModel(@Param('id',ParseUUIDPipe) id:string,@Body() body:UpdateAssetModelDto,@Req() req:AuthRequest){return this.catalog.updateModel(id,body,req.authUser)}
}
