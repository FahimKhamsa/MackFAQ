import { IsNumber, IsOptional, IsString, Length } from "class-validator";

export class ICreateLocalStorageDTO {
    @IsString()
    @Length(1, 255)
    @IsOptional()
	name?: string;

    @IsNumber()
    bot_id: number;
}

export class IUpdateLocalStorageDTO extends ICreateLocalStorageDTO {
    @IsNumber()
    @IsOptional()
	id?: number;

    @IsString()
    @Length(1, 3000)
    @IsOptional()
	prompt_prefix?: string;

}