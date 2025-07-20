import { IsOptional, IsString, Length } from "class-validator";
import { CreateBotDTO } from "./create.dto";

export class UpdateBotDTO extends CreateBotDTO {
	@IsString()
    @Length(1, 255)
    @IsOptional()
	id?: string;
}