import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';

export class AssignAssessmentDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  candidateIds: string[];
}
