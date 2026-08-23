import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { ProctoringEventType } from '../../common/enums/proctoring-event-type.enum';

export type ProctoringEventDocument = HydratedDocument<ProctoringEvent>;

@Schema({ timestamps: true })
export class ProctoringEvent {
  @Prop({ type: Types.ObjectId, ref: 'Attempt', required: true, index: true })
  attemptId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  candidateId: Types.ObjectId;

  @Prop({ required: true, enum: ProctoringEventType })
  eventType: ProctoringEventType;

  @Prop({ required: true, default: Date.now, index: true })
  timestamp: Date;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, unknown>;
}

export const ProctoringEventSchema =
  SchemaFactory.createForClass(ProctoringEvent);
ProctoringEventSchema.index({ attemptId: 1, timestamp: 1 });
