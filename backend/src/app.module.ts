import { MiddlewareConsumer,Module,NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health.controller'
import { AssetsModule } from './modules/assets/assets.module'
import { LookupsModule } from './modules/lookups/lookups.module'
import { RequestLoggerMiddleware } from './common/request-logger.middleware'

@Module({imports:[ConfigModule.forRoot({isGlobal:true}),DatabaseModule,AssetsModule,LookupsModule],controllers:[HealthController]})
export class AppModule implements NestModule{configure(consumer:MiddlewareConsumer){consumer.apply(RequestLoggerMiddleware).forRoutes('*')}}
