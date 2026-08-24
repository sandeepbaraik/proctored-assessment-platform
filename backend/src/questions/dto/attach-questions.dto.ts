import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';

export class AttachQuestionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  questionIds: string[];
}
