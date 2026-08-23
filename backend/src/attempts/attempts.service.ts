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

    if (
      [AssignmentStatus.SUBMITTED, AssignmentStatus.EXPIRED].includes(
        assignment.status,
      )
    ) {
      throw new ConflictException('Assignment cannot be started');
    }

    const existingAttempt = await this.attemptModel
      .findOne({
        assignmentId,
        candidateId,
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
      await this.expireAttemptIfNeeded(existingAttempt);
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
    await this.expireAttemptIfNeeded(attempt);

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

    const existingSubmission = await this.submissionModel
      .findOne({ attemptId })
      .exec();

    if (existingSubmission) {
      return existingSubmission;
    }

    await this.assertAttemptCanChange(attempt);

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
        return this.submissionModel.findOne({ attemptId }).exec();
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
      .find({ attemptId })
      .sort({ timestamp: 1 })
      .exec();
  }

  findSubmissionsForAdmin() {
    return this.submissionModel
      .find()
      .populate('assessmentId', 'title durationMinutes')
      .populate('candidateId', 'name email')
      .sort({ submittedAt: -1 })
      .exec();
  }

  async findSubmissionForAdmin(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Submission not found');
    }

    const submission = await this.submissionModel
      .findById(id)
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
    await this.expireAttemptIfNeeded(attempt);

    if (attempt.status === AttemptStatus.SUBMITTED) {
      throw new ConflictException('Attempt is already submitted');
    }

    if (attempt.status === AttemptStatus.EXPIRED) {
      throw new ConflictException('Attempt has expired');
    }
  }

  private async expireAttemptIfNeeded(attempt: AttemptDocument) {
    if (
      attempt.status === AttemptStatus.IN_PROGRESS &&
      attempt.expiresAt.getTime() <= Date.now()
    ) {
      attempt.status = AttemptStatus.EXPIRED;
      await attempt.save();
      await this.assignmentsService.updateStatus(
        attempt.assignmentId.toString(),
        AssignmentStatus.EXPIRED,
      );
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

    const attempt = await this.attemptModel.findOne({ _id: id, candidateId });

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
