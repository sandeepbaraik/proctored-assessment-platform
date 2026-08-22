import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentStatus } from '../../common/enums/assessment-status.enum';
import { ProctoringRulesDto } from './proctoring-rules.dto';

export class CreateAssessmentDto {
  @IsString()
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsInt()
  @Min(1)
  durationMinutes: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProctoringRulesDto)
  proctoringRules?: ProctoringRulesDto;

  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;
}
