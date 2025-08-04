import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  ValidateIf,
} from 'class-validator';
import { conversationIdPattern } from '../api.service';

export class IClearMemoryDTO {
  @IsString()
  @Length(1, 355)
  // @Matches(conversationIdPattern)
  conversationId: string;
}
