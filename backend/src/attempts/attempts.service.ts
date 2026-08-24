import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AssessmentsService } from '../assessments/assessments.service';
import { AssignmentsService } from '../assignments/assignments.service';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';
import { AttemptStatus } from '../common/enums/attempt-status.enum';
import { QuestionType } from '../common/enums/question-type.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { QuestionsService } from '../questions/questions.service';
import { CreateProctoringEventDto } from './dto/create-proctoring-event.dto';
import { SaveAnswersDto } from './dto/save-answers.dto';
import { ScoringService } from './scoring.service';
import { Attempt, AttemptDocument } from './schemas/attempt.schema';
import {
  ProctoringEvent,
  ProctoringEventDocument,
} from './schemas/proctoring-event.schema';
import { Submission, SubmissionDocument } from './schemas/submission.schema';

@Injectable()
export class AttemptsService {
  constructor(
    @InjectModel(Attempt.name)
    private readonly attemptModel: Model<AttemptDocument>,
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
    @InjectModel(ProctoringEvent.name)
    private readonly proctoringEventModel: Model<ProctoringEventDocument>,
    private readonly assessmentsService: AssessmentsService,
    private readonly assignmentsService: AssignmentsService,
    private readonly questionsService: QuestionsService,
    private readonly scoringService: ScoringService,
  ) {}

  async startAssignment(assignmentId: string, candidateId: string) {
    const assignment =
      await this.assignmentsService.findCandidateAssignmentOrThrow(
        assignmentId,
        candidateId,
      );

    if (assignment.status === AssignmentStatus.SUBMITTED) {
      throw new ConflictException('Assignment cannot be started');
    }

    const existingAttempt = await this.attemptModel
      .findOne({
        assignmentId: new Types.ObjectId(assignmentId),
        candidateId: new Types.ObjectId(candidateId),
        status: {
          $in: [
            AttemptStatus.IN_PROGRESS,
            AttemptStatus.SUBMITTED,
            AttemptStatus.EXPIRED,
          ],
        },
      })
      .exec();

    if (existingAttempt) {
      await this.submitAttemptIfExpired(existingAttempt);
      return this.buildAttemptState(existingAttempt);
    }

    const assessment = await this.assessmentsService.findByIdOrThrow(
      assignment.assessmentId._id.toString(),
    );
    const startedAt = new Date();
    const expiresAt = new Date(
      startedAt.getTime() + assessment.durationMinutes * 60 * 1000,
    );

    const attempt = await this.attemptModel.create({
      assignmentId: new Types.ObjectId(assignmentId),
      assessmentId: assessment._id,
      candidateId: new Types.ObjectId(candidateId),
      startedAt,
      expiresAt,
      status: AttemptStatus.IN_PROGRESS,
    });

    await this.assignmentsService.updateStatus(
      assignmentId,
      AssignmentStatus.IN_PROGRESS,
    );

    return this.buildAttemptState(attempt);
  }

  async getAttempt(attemptId: string, user: AuthenticatedUser) {
    const attempt = await this.findAttemptOrThrow(attemptId);
    this.assertAttemptAccess(attempt, user);
    await this.submitAttemptIfExpired(attempt);

    return this.buildAttemptState(attempt);
  }

  async saveAnswers(
    attemptId: string,
    saveAnswersDto: SaveAnswersDto,
    candidateId: string,
  ) {
    const attempt = await this.findCandidateAttemptOrThrow(
      attemptId,
      candidateId,
    );
    await this.assertAttemptCanChange(attempt);

    const questionIds = new Set(
      (
        await this.questionsService.findForAssessment(
          attempt.assessmentId.toString(),
        )
      ).map((question) => question._id.toString()),
    );

    for (const incomingAnswer of saveAnswersDto.answers) {
      if (!questionIds.has(incomingAnswer.questionId)) {
        throw new ForbiddenException(
          'Answer does not belong to this assessment',
        );
      }

      const existingAnswer = attempt.answers.find(
        (answer) => answer.questionId.toString() === incomingAnswer.questionId,
      );

      if (existingAnswer) {
        existingAnswer.answer = incomingAnswer.answer;
        existingAnswer.savedAt = new Date();
      } else {
        attempt.answers.push({
          questionId: new Types.ObjectId(incomingAnswer.questionId),
          answer: incomingAnswer.answer,
          savedAt: new Date(),
        });
      }
    }

    await attempt.save();
    return this.buildAttemptState(attempt);
  }

  async submit(attemptId: string, candidateId: string) {
    const attempt = await this.findCandidateAttemptOrThrow(
      attemptId,
      candidateId,
    );

    await this.assertAttemptCanChange(attempt);
    return this.createSubmissionForAttempt(attempt);
  }

  private async createSubmissionForAttempt(attempt: AttemptDocument) {
    const existingSubmission = await this.submissionModel
      .findOne({ attemptId: attempt._id })
      .exec();

    if (existingSubmission) {
      return existingSubmission;
    }

    const questions = await this.questionsService.findForAssessment(
      attempt.assessmentId.toString(),
      true,
    );
    const score = this.scoringService.calculateTotalScore(
      questions,
      attempt.answers,
    );

    try {
      const submission = await this.submissionModel.create({
        attemptId: attempt._id,
        assignmentId: attempt.assignmentId,
        assessmentId: attempt.assessmentId,
        candidateId: attempt.candidateId,
        answers: attempt.answers.map((answer) => ({
          questionId: answer.questionId,
          answer: answer.answer,
        })),
        score,
      });

      attempt.status = AttemptStatus.SUBMITTED;
      await attempt.save();
      await this.assignmentsService.updateStatus(
        attempt.assignmentId.toString(),
        AssignmentStatus.SUBMITTED,
      );

      return submission;
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        return this.submissionModel
          .findOne({ attemptId: attempt._id })
          .exec();
      }

      throw error;
    }
  }

  async createProctoringEvent(
    attemptId: string,
    createEventDto: CreateProctoringEventDto,
    candidateId: string,
  ) {
    const attempt = await this.findCandidateAttemptOrThrow(
      attemptId,
      candidateId,
    );

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ConflictException('Proctoring event cannot be added now');
    }

    return this.proctoringEventModel.create({
      attemptId: attempt._id,
      candidateId: attempt.candidateId,
      eventType: createEventDto.eventType,
      metadata: createEventDto.metadata ?? {},
      timestamp: new Date(),
    });
  }

  async getProctoringEvents(attemptId: string, user: AuthenticatedUser) {
    const attempt = await this.findAttemptOrThrow(attemptId);
    this.assertAttemptAccess(attempt, user);

    return this.proctoringEventModel
      .find({ attemptId: new Types.ObjectId(attemptId) })
      .sort({ timestamp: 1 })
      .exec();
  }

  async findSubmissionsForAdmin(cursor?: string, limit = 10) {
    const query = cursor && Types.ObjectId.isValid(cursor) ? { _id: { $lt: cursor } } : {};
    const items = await this.submissionModel
      .find(query)
      .populate('attemptId', '_id')
      .populate('assessmentId', 'title durationMinutes')
      .populate('candidateId', 'name email')
      .sort({ _id: -1 })
      .limit(limit + 1)
      .exec();
    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    return { data, nextCursor: hasMore ? data[data.length - 1]._id.toString() : null };
  }

  async countSubmissionsForAdmin() {
    return { total: await this.submissionModel.countDocuments().exec() };
  }

  async findSubmissionScoresForCandidate(candidateId: string) {
    const submissions = await this.submissionModel
      .find({ candidateId: new Types.ObjectId(candidateId) })
      .exec();

    return Promise.all(
      submissions.map(async (submission) => {
        const questions = await this.questionsService.findForAssessment(
          submission.assessmentId.toString(),
          true,
        );
        const totalMarks = questions.reduce(
          (total, question) => total + question.marks,
          0,
        );
        const objectiveTotalMarks = questions
          .filter((question) => question.type !== QuestionType.SHORT_ANSWER)
          .reduce((total, question) => total + question.marks, 0);
        const requiresManualReview = questions.some(
          (question) => question.type === QuestionType.SHORT_ANSWER,
        );

        return {
          assignmentId: submission.assignmentId.toString(),
          assessmentId: submission.assessmentId.toString(),
          score: submission.score,
          totalMarks,
          objectiveTotalMarks,
          requiresManualReview,
          percentage:
            objectiveTotalMarks > 0
              ? Math.round((submission.score / objectiveTotalMarks) * 100)
              : 0,
        };
      }),
    );
  }

  async findSubmissionForAdmin(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Submission not found');
    }

    const submission = await this.submissionModel
      .findById(id)
      .populate('attemptId', '_id')
      .populate('assessmentId', 'title durationMinutes')
      .populate('candidateId', 'name email')
      .exec();

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }

  private async buildAttemptState(attempt: AttemptDocument) {
    const questions = await this.questionsService.findForAssessment(
      attempt.assessmentId.toString(),
    );
    const assessment = await this.assessmentsService.findByIdOrThrow(
      attempt.assessmentId.toString(),
    );

    return {
      attempt,
      assessment,
      questions,
    };
  }

  private async assertAttemptCanChange(attempt: AttemptDocument) {
    await this.submitAttemptIfExpired(attempt);

    if (attempt.status === AttemptStatus.SUBMITTED) {
      throw new ConflictException('Attempt is already submitted');
    }

    if (attempt.status === AttemptStatus.EXPIRED) {
      throw new ConflictException('Attempt has expired');
    }
  }

  private async submitAttemptIfExpired(attempt: AttemptDocument) {
    if (
      attempt.status === AttemptStatus.IN_PROGRESS &&
      attempt.expiresAt.getTime() <= Date.now()
    ) {
      await this.createSubmissionForAttempt(attempt);
    }
  }

  private async findAttemptOrThrow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Attempt not found');
    }

    const attempt = await this.attemptModel.findById(id).exec();

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    return attempt;
  }

  private async findCandidateAttemptOrThrow(
    id: string,
    candidateId: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Attempt not found');
    }

    const attempt = await this.attemptModel.findOne({
      _id: new Types.ObjectId(id),
      candidateId: new Types.ObjectId(candidateId),
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    return attempt;
  }

  private assertAttemptAccess(
    attempt: AttemptDocument,
    user: AuthenticatedUser,
  ) {
    const ownsAttempt = attempt.candidateId.toString() === user.id;
    if (user.role !== UserRole.ADMIN && !ownsAttempt) {
      throw new ForbiddenException('You do not have access to this attempt');
    }
  }

  private isDuplicateKeyError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}
