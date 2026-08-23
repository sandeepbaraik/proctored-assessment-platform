import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { AttemptStatus } from '../../common/enums/attempt-status.enum';

export type AttemptDocument = HydratedDocument<Attempt>;

@Schema({ _id: false })
export class AttemptAnswer {
  @Prop({ type: Types.ObjectId, ref: 'Question', required: true })
  questionId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  answer: string | string[] | null;

  @Prop({ required: true, default: Date.now })
  savedAt: Date;
}

const AttemptAnswerSchema = SchemaFactory.createForClass(AttemptAnswer);

@Schema({ timestamps: true })
export class Attempt {
  @Prop({ type: Types.ObjectId, ref: 'Assignment', required: true, index: true })
  assignmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Assessment', required: true, index: true })
  assessmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  candidateId: Types.ObjectId;

  @Prop({ required: true })
  startedAt: Date;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({
    required: true,
    enum: AttemptStatus,
    default: AttemptStatus.IN_PROGRESS,
  })
  status: AttemptStatus;

  @Prop({ type: [AttemptAnswerSchema], default: [] })
  answers: AttemptAnswer[];
}

export const AttemptSchema = SchemaFactory.createForClass(Attempt);
AttemptSchema.index(
  { assignmentId: 1, candidateId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [AttemptStatus.IN_PROGRESS, AttemptStatus.SUBMITTED] },
    },
  },
);
