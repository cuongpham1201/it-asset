import { Transform,Type } from 'class-transformer'
import { IsDateString,IsInt,IsOptional,IsString,IsUUID,Matches,Max,MaxLength,Min } from 'class-validator'

const trim=({value}:{value:unknown})=>typeof value==='string'?value.trim():value

export class ListAuditLogsQuery{
  /** Free text over action, entity type and entity id. */
  @IsOptional() @IsString() @Transform(trim) @MaxLength(200) search?:string
  @IsOptional() @IsString() @Transform(trim) @Matches(/^[A-Z0-9_]{2,60}$/) action?:string
  @IsOptional() @IsString() @Transform(trim) @MaxLength(60) entityType?:string
  @IsOptional() @IsUUID() entityId?:string
  @IsOptional() @IsUUID() userId?:string
  /** Inclusive lower bound on createdAt. */
  @IsOptional() @IsDateString() from?:string
  /** Inclusive upper bound on createdAt; a bare date covers the whole day. */
  @IsOptional() @IsDateString() to?:string
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) page=1
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(200) limit=25
}
