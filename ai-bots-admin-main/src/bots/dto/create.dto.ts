import { IsOptional, IsString, Length } from 'class-validator';

export class CreateBotDTO {
  @IsString()
  @Length(0, 255)
  @IsOptional()
  test_url?: string;

  @IsString()
  @Length(0, 255)
  @IsOptional()
  production_url?: string;

  @IsString()
  @Length(0, 255)
  page_title: string;

  @IsString()
  @Length(0, 255)
  @IsOptional()
  page_meta_description?: string;

  @IsString()
  @Length(0, 255)
  @IsOptional()
  greeting_message_text?: string;

  @IsString()
  @Length(0, 3000)
  @IsOptional()
  prompt_prefix?: string;

  @IsString()
  @Length(0, 255)
  @IsOptional()
  prompt_placeholder?: string;

  @IsString()
  @Length(0, 255)
  @IsOptional()
  favicon_path?: string;

  @IsString()
  @Length(0, 255)
  @IsOptional()
  background_image_path?: string;

  @IsString()
  @Length(0, 255)
  @IsOptional()
  bot_name_label: string;

  @IsString()
  @Length(0, 255)
  @IsOptional()
  user_name_label: string;

  @IsString()
  @Length(0, 1024)
  @IsOptional()
  exists_responses_provider_url?: string;

  @IsString()
  @Length(0, 3000)
  @IsOptional()
  prompt_answer_pre_prefix?: string;
}
