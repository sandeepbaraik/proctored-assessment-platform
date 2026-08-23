import { IsArray, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @IsMongoId()
  questionId: string;

  @IsOptional()
  answer: string | string[] | null;
}

export class SaveAnswersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
