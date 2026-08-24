import { Injectable,Logger,NestMiddleware } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { NextFunction,Request,Response } from 'express'
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware{
  private readonly logger=new Logger('HTTP')
  use(req:Request&{authUser?:{id?:string}},res:Response,next:NextFunction){const started=Date.now(),requestId=(req.get('x-request-id')||randomUUID()).slice(0,100);res.setHeader('X-Request-Id',requestId);res.on('finish',()=>this.logger.log(JSON.stringify({requestId,method:req.method,path:req.path,status:res.statusCode,durationMs:Date.now()-started,actorId:req.authUser?.id||null})));next()}
}
