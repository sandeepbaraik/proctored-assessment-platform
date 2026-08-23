import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole } from '../common/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { AssignAssessmentDto } from './dto/assign-assessment.dto';
import { Assignment, AssignmentDocument } from './schemas/assignment.schema';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectModel(Assignment.name)
    private readonly assignmentModel: Model<AssignmentDocument>,
    private readonly usersService: UsersService,
  ) {}

  async assignAssessment(
    assessmentId: string,
    assignAssessmentDto: AssignAssessmentDto,
  ) {
    const uniqueCandidateIds = [...new Set(assignAssessmentDto.candidateIds)];
    const candidates = await Promise.all(
      uniqueCandidateIds.map((candidateId) =>
        this.usersService.findById(candidateId),
      ),
    );

    const invalidCandidate = candidates.some(
      (candidate) => !candidate || candidate.role !== UserRole.CANDIDATE,
    );

    if (invalidCandidate) {
      throw new BadRequestException('All assignees must be valid candidates');
    }

    try {
      const assignments = await this.assignmentModel.insertMany(
        uniqueCandidateIds.map((candidateId) => ({
          assessmentId: new Types.ObjectId(assessmentId),
          candidateId: new Types.ObjectId(candidateId),
        })),
        { ordered: false },
      );

      return {
        createdCount: assignments.length,
        assignments,
      };
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'One or more candidates are already assigned to this assessment',
        );
      }

      throw error;
    }
  }

  findAllForAdmin() {
    return this.assignmentModel
      .find()
      .populate('assessmentId', 'title durationMinutes status')
      .populate('candidateId', 'name email role')
      .sort({ assignedAt: -1 })
      .exec();
  }

  findForCandidate(candidateId: string) {
    return this.assignmentModel
      .find({ candidateId })
      .populate('assessmentId', 'title description durationMinutes status')
      .sort({ assignedAt: -1 })
      .exec();
  }

  async findByIdOrThrow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Assignment not found');
    }

    const assignment = await this.assignmentModel.findById(id).exec();

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

  async updateStatus(id: string, status: AssignmentStatus) {
    await this.assignmentModel.findByIdAndUpdate(id, { status }).exec();
  }

  async findCandidateAssignmentOrThrow(id: string, candidateId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Assignment not found');
    }

    const assignment = await this.assignmentModel
      .findOne({ _id: id, candidateId })
      .populate('assessmentId', 'title description durationMinutes status')
      .exec();

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
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
