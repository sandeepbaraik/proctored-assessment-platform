import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { SubmissionStatus } from '../../common/enums/submission-status.enum';

export type SubmissionDocument = HydratedDocument<Submission>;

@Schema({ _id: false })
export class SubmissionAnswer {
  @Prop({ type: Types.ObjectId, ref: 'Question', required: true })
  questionId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  answer: string | string[] | null;
}

const SubmissionAnswerSchema = SchemaFactory.createForClass(SubmissionAnswer);

@Schema({ timestamps: true })
export class Submission {
  @Prop({ type: Types.ObjectId, ref: 'Attempt', required: true, unique: true })
  attemptId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Assignment', required: true, index: true })
  assignmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Assessment', required: true, index: true })
  assessmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  candidateId: Types.ObjectId;

  @Prop({ type: [SubmissionAnswerSchema], default: [] })
  answers: SubmissionAnswer[];

  @Prop({ required: true, default: 0 })
  score: number;

  @Prop({ required: true, default: Date.now })
  submittedAt: Date;

  @Prop({
    required: true,
    enum: SubmissionStatus,
    default: SubmissionStatus.SUBMITTED,
  })
  status: SubmissionStatus;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);
