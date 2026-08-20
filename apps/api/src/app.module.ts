import { MiddlewareConsumer,Module,NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health.controller'
import { AssetsModule } from './modules/assets/assets.module'
import { LookupsModule } from './modules/lookups/lookups.module'
import { RequestLoggerMiddleware } from './common/request-logger.middleware'
import { AuthModule } from './auth/auth.module'
import { DirectoryModule } from './modules/directory/directory.module'
import { UsersModule } from './modules/users/users.module'
import { PeopleModule } from './modules/people/people.module'
import { CategoriesModule } from './modules/categories/categories.module'
import { LifecycleModule } from './modules/lifecycle/lifecycle.module'

@Module({imports:[ConfigModule.forRoot({isGlobal:true}),DatabaseModule,AuthModule,AssetsModule,LookupsModule,DirectoryModule,UsersModule,PeopleModule,CategoriesModule,LifecycleModule],controllers:[HealthController]})
export class AppModule implements NestModule{configure(consumer:MiddlewareConsumer){consumer.apply(RequestLoggerMiddleware).forRoutes('*')}}
