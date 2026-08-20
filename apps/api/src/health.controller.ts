import { Controller,Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Public } from './auth/public.decorator'

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController{
  @Get('live') live(){return {status:'ok'}}
  @Get('version') version(){return {name:'AssetFlow',version:process.env.APP_VERSION||'development'}}
}
