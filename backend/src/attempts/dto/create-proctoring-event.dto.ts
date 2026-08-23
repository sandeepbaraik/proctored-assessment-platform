import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { ProctoringEventType } from '../../common/enums/proctoring-event-type.enum';

export class CreateProctoringEventDto {
  @IsEnum(ProctoringEventType)
  eventType: ProctoringEventType;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
