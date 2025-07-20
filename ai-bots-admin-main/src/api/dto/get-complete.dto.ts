import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsBooleanString, IsDateString, IsEnum, IsInt, IsOptional, IsString, Length, Matches, Max, ValidateIf, ValidateNested, isArray, isInt } from "class-validator";
import { MessageTypes, conversationIdPattern } from "../api.service";

export class IProjectIdentification {
    @Type(() => Number)
    @IsInt()
    @IsOptional()
    bot_id: number;

    @Type(() => Number)
    @IsInt()
    @IsOptional()
    project_id: number;

    @IsString()
    @IsOptional()
    project_link: string;
}

export class IConversationId {
    @IsString()
    @Length(1, 355)
    // @Matches(conversationIdPattern)
    @ValidateIf((_, value) => value === '0' || !!value)
    conversationId: string;
}

export class IConversationIds {
    @IsArray()
    @IsString({ each: true })
    @Type(() => String)
    conversationIds: string[];
}

export class IRecompleteDTO extends IConversationId {
    @IsString()
    @Length(1, 355)
    messageId: string
}

export class IGetCompleteDTO extends IProjectIdentification {
    @IsString()
    @Length(1, 2500)
    prompt: string;

    @IsString()
    @IsOptional()
    @Length(1, 355)
    // @Matches(conversationIdPattern)
    @ValidateIf((_, value) => value === '0' || !!value)
    conversationId?: string;

    @IsString()
    @IsOptional()
    @Length(1, 355)
    lang?: string;

    @IsString()
    @Length(1, 355)
    @IsOptional()
    conversationName?: string;

    @IsDateString({ strict: true })
    @Length(1, 1000)
    @IsOptional()
    createdAt?: string;

    @IsString()
    @Length(1, 5000)
    @IsOptional()
    promptPrefix?: string;

    @IsBoolean()
    @Transform(({ value} ) => value === true || value === 'true')
    @IsOptional()
    forceDisableDocsData?: boolean = false;

    @IsOptional()
    @IsInt({ each: true })
    @Transform(({ value }) => value.map(v => v ? +v : ''))
    filesToUse?: number[];
}

export class ICreateConversationDTO extends IProjectIdentification {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => IMessage)
    messages: IMessage[];

    @IsString()
    @Length(1, 355)
    // @Matches(conversationIdPattern)
    conversationId?: string;

    @IsString()
    @Length(1, 355)
    @IsOptional()
    name?: string;
}

export class IMessage { 
    @IsString()
    @IsEnum(MessageTypes)
    type: MessageTypes;
    
    @IsString()
    @Length(1, 2500)
    message: string;
    
    @IsString()
    @Length(1, 1000)
    @IsOptional()
    previousMessageId?: string;
        
    @IsString()
    @Length(1, 1000)
    messageId: string;

    @IsDateString({ strict: true })
    @Length(1, 1000)
    @IsOptional()
    createdAt?: string;
};
