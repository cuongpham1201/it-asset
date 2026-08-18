import { Controller,Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('health')
@Controller('health')
export class HealthController{
  @Get('live') live(){return {status:'ok'}}
  @Get('version') version(){return {name:'AssetFlow',version:process.env.APP_VERSION||'development'}}
}
