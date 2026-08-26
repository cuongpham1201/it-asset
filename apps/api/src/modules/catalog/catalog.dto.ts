import { Transform } from 'class-transformer'
import { IsEnum,IsOptional,IsString,IsUUID,MaxLength,MinLength } from 'class-validator'
import { RecordStatus } from '@prisma/client'

const trim=({value}:{value:unknown})=>typeof value==='string'?value.trim():value

export class CreateManufacturerDto{
  @IsString() @Transform(trim) @MinLength(2) @MaxLength(150) name!:string
  @IsOptional() @IsString() @Transform(trim) @MaxLength(1000) website?:string
  @IsOptional() @IsString() @Transform(trim) @MaxLength(1000) supportUrl?:string
  @IsOptional() @IsString() @Transform(trim) @MaxLength(30) supportPhone?:string
}

export class UpdateManufacturerDto{
  @IsOptional() @IsString() @Transform(trim) @MinLength(2) @MaxLength(150) name?:string
  @IsOptional() @IsString() @Transform(trim) @MaxLength(1000) website?:string
  @IsOptional() @IsString() @Transform(trim) @MaxLength(1000) supportUrl?:string
  @IsOptional() @IsString() @Transform(trim) @MaxLength(30) supportPhone?:string
  @IsOptional() @IsEnum(RecordStatus) status?:RecordStatus
}

export class CreateAssetModelDto{
  @IsString() @Transform(trim) @MinLength(2) @MaxLength(150) name!:string
  @IsUUID() manufacturerId!:string
  @IsUUID() categoryId!:string
  @IsOptional() @IsString() @Transform(trim) @MaxLength(100) modelNumber?:string
  @IsOptional() @IsString() @Transform(trim) @MaxLength(1000) description?:string
}

export class UpdateAssetModelDto{
  @IsOptional() @IsString() @Transform(trim) @MinLength(2) @MaxLength(150) name?:string
  @IsOptional() @IsUUID() manufacturerId?:string
  @IsOptional() @IsUUID() categoryId?:string
  @IsOptional() @IsString() @Transform(trim) @MaxLength(100) modelNumber?:string
  @IsOptional() @IsString() @Transform(trim) @MaxLength(1000) description?:string
  @IsOptional() @IsEnum(RecordStatus) status?:RecordStatus
}
