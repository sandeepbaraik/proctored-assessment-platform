import { IsString, MaxLength } from 'class-validator';

export class QuestionOptionDto {
  @IsString()
  @MaxLength(20)
  label: string;

  @IsString()
  @MaxLength(1000)
  text: string;
}
