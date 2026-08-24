import {
  BadRequestException,
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

    const assignments = await Promise.all(
      uniqueCandidateIds.map((candidateId) =>
        this.assignmentModel.findOneAndUpdate(
          {
            assessmentId: new Types.ObjectId(assessmentId),
            candidateId: new Types.ObjectId(candidateId),
          },
          {
            $setOnInsert: {
              assessmentId: new Types.ObjectId(assessmentId),
              candidateId: new Types.ObjectId(candidateId),
              assignedAt: new Date(),
              status: AssignmentStatus.ASSIGNED,
            },
          },
          { new: true, upsert: true },
        ),
      ),
    );

    return {
      createdCount: assignments.length,
      assignments,
    };
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
    if (!Types.ObjectId.isValid(candidateId)) {
      return [];
    }

    return this.assignmentModel
      .find({ candidateId: new Types.ObjectId(candidateId) })
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

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Assignment not found');
    }

    const assignment = await this.assignmentModel.findByIdAndDelete(id).exec();
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return { deleted: true };
  }

  async findCandidateAssignmentOrThrow(id: string, candidateId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Assignment not found');
    }

    const assignment = await this.assignmentModel
      .findOne({ _id: id, candidateId: new Types.ObjectId(candidateId) })
      .populate('assessmentId', 'title description durationMinutes status')
      .exec();

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

}
