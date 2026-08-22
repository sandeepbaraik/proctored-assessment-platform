import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AssessmentStatus } from '../../common/enums/assessment-status.enum';

export type AssessmentDocument = HydratedDocument<Assessment>;

@Schema({ _id: false })
export class ProctoringRules {
  @Prop({ default: true })
  captureTabSwitch: boolean;

  @Prop({ default: true })
  captureWindowBlur: boolean;

  @Prop({ default: true })
  captureFullscreenExit: boolean;

  @Prop({ default: true })
  captureCopyPaste: boolean;

  @Prop({ default: true })
  captureRightClick: boolean;

  @Prop({ min: 0 })
  violationLimit?: number;
}

const ProctoringRulesSchema = SchemaFactory.createForClass(ProctoringRules);

@Schema({ timestamps: true })
export class Assessment {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true, default: '' })
  description: string;

  @Prop({ required: true, min: 1 })
  durationMinutes: number;

  @Prop({ type: ProctoringRulesSchema, default: () => ({}) })
  proctoringRules: ProctoringRules;

  @Prop({
    required: true,
    enum: AssessmentStatus,
    default: AssessmentStatus.DRAFT,
  })
  status: AssessmentStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;
}

export const AssessmentSchema = SchemaFactory.createForClass(Assessment);
