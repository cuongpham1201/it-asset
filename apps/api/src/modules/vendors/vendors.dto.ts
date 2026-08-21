import { IsDateString,IsEmail,IsInt,IsNotEmpty,IsObject,IsOptional,IsString,Max,MaxLength,Min } from 'class-validator'
export class VendorDto{
  @IsString() @IsNotEmpty() @MaxLength(50) code!:string
  @IsString() @IsNotEmpty() @MaxLength(200) name!:string
  @IsOptional() @IsString() @MaxLength(50) taxCode?:string
  @IsString() @MaxLength(150) category!:string
  @IsString() @MaxLength(150) contact!:string
  @IsOptional() @IsEmail() email?:string
  @IsOptional() @IsString() @MaxLength(30) phone?:string
  @IsOptional() @IsString() address?:string
  @IsOptional() @IsString() certifications?:string
  @IsString() @MaxLength(30) status!:string
  @IsOptional() @IsDateString() lastEvaluation?:string
  @IsInt() @Min(0) @Max(100) score=0
  @IsObject() scores!:Record<string,number>
  @IsOptional() @IsString() notes?:string
}
