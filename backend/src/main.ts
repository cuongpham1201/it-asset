import 'reflect-metadata'
import { readFileSync } from 'node:fs'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder,SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { HttpErrorFilter } from './common/http-exception.filter'

function configureDatabaseUrlFromSecret(){
  if(process.env.DATABASE_URL)return
  const passwordFile=process.env.DATABASE_PASSWORD_FILE
  if(!passwordFile)return
  const password=encodeURIComponent(readFileSync(passwordFile,'utf8').trim())
  const user=encodeURIComponent(process.env.DATABASE_USER||'assetflow_app')
  const host=process.env.DATABASE_HOST||'db'
  const port=process.env.DATABASE_PORT||'5432'
  const database=encodeURIComponent(process.env.DATABASE_NAME||'assetflow')
  process.env.DATABASE_URL=`postgresql://${user}:${password}@${host}:${port}/${database}`
}

async function bootstrap(){
  configureDatabaseUrlFromSecret()
  const app=await NestFactory.create(AppModule,{cors:false})
  app.setGlobalPrefix('api/v1',{exclude:['api/docs']})
  app.enableCors({origin:(process.env.CORS_ORIGIN||'http://localhost:5173').split(','),credentials:true})
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}))
  app.useGlobalFilters(new HttpErrorFilter())
  const config=new DocumentBuilder().setTitle('AssetFlow API').setVersion('0.1.0').addCookieAuth('assetflow_session').build()
  SwaggerModule.setup('api/docs',app,SwaggerModule.createDocument(app,config))
  await app.listen(Number(process.env.PORT||3000),'0.0.0.0')
}
void bootstrap()
