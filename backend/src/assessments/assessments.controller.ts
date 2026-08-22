import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { CreateQuestionDto } from '../questions/dto/create-question.dto';
import { UpdateQuestionDto } from '../questions/dto/update-question.dto';
import { QuestionsService } from '../questions/questions.service';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';

@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AssessmentsController {
  constructor(
    private readonly assessmentsService: AssessmentsService,
    private readonly questionsService: QuestionsService,
  ) {}

  @Post()
  create(
    @Body() createAssessmentDto: CreateAssessmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assessmentsService.create(createAssessmentDto, user.id);
  }

  @Get()
  findAll() {
    return this.assessmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assessmentsService.findByIdOrThrow(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAssessmentDto: UpdateAssessmentDto,
  ) {
    return this.assessmentsService.update(id, updateAssessmentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assessmentsService.remove(id);
  }

  @Post(':assessmentId/questions')
  async createQuestion(
    @Param('assessmentId') assessmentId: string,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    await this.assessmentsService.findByIdOrThrow(assessmentId);
    return this.questionsService.create(assessmentId, createQuestionDto);
  }

  @Get(':assessmentId/questions')
  async findQuestions(@Param('assessmentId') assessmentId: string) {
    await this.assessmentsService.findByIdOrThrow(assessmentId);
    return this.questionsService.findForAssessment(assessmentId, true);
  }

  @Patch('questions/:id')
  updateQuestion(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(id, updateQuestionDto);
  }

  @Delete('questions/:id')
  removeQuestion(@Param('id') id: string) {
    return this.questionsService.remove(id);
  }
}
