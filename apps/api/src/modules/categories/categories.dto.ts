import { Transform } from 'class-transformer'
import { IsOptional,IsString,IsUUID,Matches,MaxLength,MinLength } from 'class-validator'

const trim=({value}:{value:unknown})=>typeof value==='string'?value.trim():value
const upper=({value}:{value:unknown})=>typeof value==='string'?value.trim().toUpperCase():value

export class CreateAssetCategoryDto{
  @IsString() @Transform(upper) @Matches(/^[A-Z0-9._-]{2,50}$/) code!:string
  @IsString() @Transform(trim) @MinLength(2) @MaxLength(150) name!:string
  @IsOptional() @IsUUID() parentId?:string
  @IsOptional() @IsString() @Transform(trim) @MaxLength(500) description?:string
}
