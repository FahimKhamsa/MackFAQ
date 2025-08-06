import { IsOptional, IsString, Length, IsUUID } from 'class-validator';

export class ICreateProjectDTO {
  @IsString()
  @Length(1, 255)
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  assistant_id?: string;

  @IsUUID()
  user_id: string;
}

export class IUpdateProjectDTO extends ICreateProjectDTO {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @Length(1, 3000)
  @IsOptional()
  prompt_prefix?: string;
}
export class IDeleteProjectDTO {
  @IsUUID()
  id: string;
}
