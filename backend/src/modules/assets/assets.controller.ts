import { Body,Controller,Delete,Get,Param,ParseUUIDPipe,Patch,Post,Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AssetsService } from './assets.service'
import { CreateAssetDto,ListAssetsQuery,UpdateAssetDto } from './assets.dto'
@ApiTags('Assets') @Controller('assets')
export class AssetsController { constructor(private readonly assets:AssetsService){} @Get('summary') summary(){return this.assets.summary()} @Get() list(@Query() query:ListAssetsQuery){return this.assets.list(query)} @Get(':id/history') history(@Param('id',ParseUUIDPipe) id:string){return this.assets.history(id)} @Get(':id') get(@Param('id',ParseUUIDPipe) id:string){return this.assets.get(id)} @Post() create(@Body() body:CreateAssetDto){return this.assets.create(body)} @Patch(':id') update(@Param('id',ParseUUIDPipe) id:string,@Body() body:UpdateAssetDto){return this.assets.update(id,body)} @Delete(':id') remove(@Param('id',ParseUUIDPipe) id:string){return this.assets.remove(id)} }
