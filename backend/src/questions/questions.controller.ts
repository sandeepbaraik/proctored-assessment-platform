import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CursorQueryDto } from '../common/dto/cursor-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QuestionsService } from './questions.service';

@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  findPage(@Query() query: CursorQueryDto) {
    return this.questionsService.findPage(query.cursor, query.limit, true);
  }

  @Get('count')
  count() {
    return this.questionsService.count();
  }

  @Post()
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionsService.createBankQuestion(createQuestionDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionsService.findByIdOrThrow(id, true);
  }
}
