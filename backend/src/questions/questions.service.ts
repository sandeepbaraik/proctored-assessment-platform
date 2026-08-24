import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QuestionType } from '../common/enums/question-type.enum';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { Question, QuestionDocument } from './schemas/question.schema';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel(Question.name)
    private readonly questionModel: Model<QuestionDocument>,
  ) {}

  create(assessmentId: string, createQuestionDto: CreateQuestionDto) {
    this.validateQuestionPayload(createQuestionDto);

    return this.questionModel.create({
      ...createQuestionDto,
      assessmentId: new Types.ObjectId(assessmentId),
      assessmentIds: [new Types.ObjectId(assessmentId)],
    });
  }

  createBankQuestion(createQuestionDto: CreateQuestionDto) {
    this.validateQuestionPayload(createQuestionDto);
    return this.questionModel.create(createQuestionDto);
  }

  async findPage(cursor?: string, limit = 10, includeCorrectAnswers = true) {
    const query = cursor && Types.ObjectId.isValid(cursor) ? { _id: { $lt: cursor } } : {};
    const dbQuery = this.questionModel.find(query).sort({ _id: -1 }).limit(limit + 1);
    if (includeCorrectAnswers) dbQuery.select('+correctAnswers');
    const items = await dbQuery.exec();
    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    return { data, nextCursor: hasMore ? data[data.length - 1]._id.toString() : null };
  }

  async findByIdOrThrow(id: string, includeCorrectAnswers = true) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Question not found');
    }

    const query = this.questionModel.findById(id);
    if (includeCorrectAnswers) query.select('+correctAnswers');
    const question = await query.exec();

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return question;
  }

  findForAssessment(assessmentId: string, includeCorrectAnswers = false) {
    const query = this.questionModel
      .find({
        $or: [
          { assessmentId },
          { assessmentIds: new Types.ObjectId(assessmentId) },
        ],
      })
      .sort({ order: 1, createdAt: 1 });

    if (includeCorrectAnswers) {
      query.select('+correctAnswers');
    }

    return query.exec();
  }

  async update(id: string, updateQuestionDto: UpdateQuestionDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Question not found');
    }

    this.validateQuestionPayload(updateQuestionDto);

    const question = await this.questionModel
      .findByIdAndUpdate(id, updateQuestionDto, { new: true })
      .select('+correctAnswers')
      .exec();

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return question;
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Question not found');
    }

    const question = await this.questionModel.findByIdAndDelete(id).exec();

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return { deleted: true };
  }

  async attachToAssessment(assessmentId: string, questionIds: string[]) {
    await this.questionModel.updateMany(
      { _id: { $in: questionIds.map((id) => new Types.ObjectId(id)) } },
      { $addToSet: { assessmentIds: new Types.ObjectId(assessmentId) } },
    );
    return this.findForAssessment(assessmentId, true);
  }

  private validateQuestionPayload(
    questionDto: CreateQuestionDto | UpdateQuestionDto,
  ) {
    if (!questionDto.type) {
      return;
    }

    const options = questionDto.options ?? [];
    const correctAnswers = questionDto.correctAnswers ?? [];

    if (
      [QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE].includes(
        questionDto.type,
      ) &&
      options.length < 1
    ) {
      throw new BadRequestException(
        'Objective questions must include at least one option',
      );
    }

    if (
      [QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE].includes(
        questionDto.type,
      ) &&
      correctAnswers.length < 1
    ) {
      throw new BadRequestException(
        'Objective questions must include correct answers',
      );
    }

    if (
      questionDto.type === QuestionType.SINGLE_CHOICE &&
      correctAnswers.length !== 1
    ) {
      throw new BadRequestException(
        'Single choice questions must have exactly one correct answer',
      );
    }

    if (
      questionDto.type === QuestionType.SHORT_ANSWER &&
      correctAnswers.length > 0
    ) {
      throw new BadRequestException(
        'Short answer questions should not include automatic correct answers',
      );
    }

    const optionLabels = new Set(options.map((option) => option.label));
    const invalidCorrectAnswer = correctAnswers.some(
      (answer) => !optionLabels.has(answer),
    );

    if (invalidCorrectAnswer) {
      throw new BadRequestException(
        'Correct answers must match one of the option labels',
      );
    }
  }
}
