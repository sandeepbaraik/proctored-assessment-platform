import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CursorQueryDto } from '../common/dto/cursor-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { AttemptsService } from './attempts.service';
import { CreateProctoringEventDto } from './dto/create-proctoring-event.dto';
import { SaveAnswersDto } from './dto/save-answers.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post('assignments/:assignmentId/start')
  @Roles(UserRole.CANDIDATE)
  startAssignment(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attemptsService.startAssignment(assignmentId, user.id);
  }

  @Get('attempts/:attemptId')
  getAttempt(
    @Param('attemptId') attemptId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attemptsService.getAttempt(attemptId, user);
  }

  @Put('attempts/:attemptId/answers')
  @Roles(UserRole.CANDIDATE)
  saveAnswers(
    @Param('attemptId') attemptId: string,
    @Body() saveAnswersDto: SaveAnswersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attemptsService.saveAnswers(attemptId, saveAnswersDto, user.id);
  }

  @Post('attempts/:attemptId/submit')
  @Roles(UserRole.CANDIDATE)
  submit(
    @Param('attemptId') attemptId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attemptsService.submit(attemptId, user.id);
  }

  @Post('attempts/:attemptId/proctoring-events')
  @Roles(UserRole.CANDIDATE)
  createProctoringEvent(
    @Param('attemptId') attemptId: string,
    @Body() createEventDto: CreateProctoringEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attemptsService.createProctoringEvent(
      attemptId,
      createEventDto,
      user.id,
    );
  }

  @Get('attempts/:attemptId/proctoring-events')
  getProctoringEvents(
    @Param('attemptId') attemptId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attemptsService.getProctoringEvents(attemptId, user);
  }

  @Get('candidate/submission-scores')
  @Roles(UserRole.CANDIDATE)
  findCandidateSubmissionScores(@CurrentUser() user: AuthenticatedUser) {
    return this.attemptsService.findSubmissionScoresForCandidate(user.id);
  }

  @Get('submissions')
  @Roles(UserRole.ADMIN)
  findSubmissionsForAdmin(@Query() query: CursorQueryDto) {
    return this.attemptsService.findSubmissionsForAdmin(query.cursor, query.limit);
  }

  @Get('submissions/:id')
  @Roles(UserRole.ADMIN)
  findSubmissionForAdmin(@Param('id') id: string) {
    return this.attemptsService.findSubmissionForAdmin(id);
  }
}
