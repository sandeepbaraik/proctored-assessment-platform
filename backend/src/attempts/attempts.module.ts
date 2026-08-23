import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssessmentsModule } from '../assessments/assessments.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { QuestionsModule } from '../questions/questions.module';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { ScoringService } from './scoring.service';
import { Attempt, AttemptSchema } from './schemas/attempt.schema';
import {
  ProctoringEvent,
  ProctoringEventSchema,
} from './schemas/proctoring-event.schema';
import { Submission, SubmissionSchema } from './schemas/submission.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attempt.name, schema: AttemptSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: ProctoringEvent.name, schema: ProctoringEventSchema },
    ]),
    AssessmentsModule,
    AssignmentsModule,
    QuestionsModule,
  ],
  controllers: [AttemptsController],
  providers: [AttemptsService, ScoringService],
})
export class AttemptsModule {}
