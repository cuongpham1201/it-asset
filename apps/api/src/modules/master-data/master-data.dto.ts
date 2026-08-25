import { IsBoolean,IsNotEmpty,IsOptional,IsString,MaxLength } from 'class-validator'
export class MasterDataDto{
  @IsString() @IsNotEmpty() @MaxLength(50) code!:string
  @IsString() @IsNotEmpty() @MaxLength(150) name!:string
  @IsOptional() @IsString() @MaxLength(1000) address?:string
  @IsOptional() @IsBoolean() isIncidentResponseTeam?:boolean
}
