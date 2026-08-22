import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { QuestionType } from '../../common/enums/question-type.enum';

export type QuestionDocument = HydratedDocument<Question>;

@Schema({ _id: false })
export class QuestionOption {
  @Prop({ required: true, trim: true })
  label: string;

  @Prop({ required: true, trim: true })
  text: string;
}

const QuestionOptionSchema = SchemaFactory.createForClass(QuestionOption);

@Schema({ timestamps: true })
export class Question {
  @Prop({ type: Types.ObjectId, ref: 'Assessment', required: true, index: true })
  assessmentId: Types.ObjectId;

  @Prop({ required: true, enum: QuestionType })
  type: QuestionType;

  @Prop({ required: true, trim: true })
  questionText: string;

  @Prop({ type: [QuestionOptionSchema], default: [] })
  options: QuestionOption[];

  @Prop({ type: [String], default: [], select: false })
  correctAnswers: string[];

  @Prop({ required: true, min: 0, default: 1 })
  marks: number;

  @Prop({ required: true, min: 0, default: 0 })
  order: number;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
QuestionSchema.index({ assessmentId: 1, order: 1 });
