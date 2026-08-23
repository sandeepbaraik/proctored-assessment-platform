import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AssignmentStatus } from '../../common/enums/assignment-status.enum';

export type AssignmentDocument = HydratedDocument<Assignment>;

@Schema({ timestamps: true })
export class Assignment {
  @Prop({ type: Types.ObjectId, ref: 'Assessment', required: true, index: true })
  assessmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  candidateId: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  assignedAt: Date;

  @Prop({
    required: true,
    enum: AssignmentStatus,
    default: AssignmentStatus.ASSIGNED,
  })
  status: AssignmentStatus;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);
AssignmentSchema.index({ assessmentId: 1, candidateId: 1 }, { unique: true });
