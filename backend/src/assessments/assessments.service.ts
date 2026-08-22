import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { Assessment, AssessmentDocument } from './schemas/assessment.schema';

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectModel(Assessment.name)
    private readonly assessmentModel: Model<AssessmentDocument>,
  ) {}

  create(createAssessmentDto: CreateAssessmentDto, adminId: string) {
    return this.assessmentModel.create({
      ...createAssessmentDto,
      createdBy: new Types.ObjectId(adminId),
    });
  }

  findAll() {
    return this.assessmentModel.find().sort({ createdAt: -1 }).exec();
  }

  async findByIdOrThrow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Assessment not found');
    }

    const assessment = await this.assessmentModel.findById(id).exec();

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    return assessment;
  }

  async update(id: string, updateAssessmentDto: UpdateAssessmentDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Assessment not found');
    }

    const assessment = await this.assessmentModel
      .findByIdAndUpdate(id, updateAssessmentDto, { new: true })
      .exec();

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    return assessment;
  }

  async remove(id: string) {
    const assessment = await this.findByIdOrThrow(id);
    await assessment.deleteOne();

    return { deleted: true };
  }
}
