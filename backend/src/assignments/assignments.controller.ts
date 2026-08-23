import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AssessmentsService } from '../assessments/assessments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { AssignmentsService } from './assignments.service';
import { AssignAssessmentDto } from './dto/assign-assessment.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly assessmentsService: AssessmentsService,
  ) {}

  @Post('assessments/:assessmentId/assign')
  @Roles(UserRole.ADMIN)
  async assignAssessment(
    @Param('assessmentId') assessmentId: string,
    @Body() assignAssessmentDto: AssignAssessmentDto,
  ) {
    await this.assessmentsService.findByIdOrThrow(assessmentId);
    return this.assignmentsService.assignAssessment(
      assessmentId,
      assignAssessmentDto,
    );
  }

  @Get('assignments')
  @Roles(UserRole.ADMIN)
  findAllForAdmin() {
    return this.assignmentsService.findAllForAdmin();
  }

  @Get('candidate/assignments')
  @Roles(UserRole.CANDIDATE)
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.assignmentsService.findForCandidate(user.id);
  }

  @Get('candidate/assignments/:id')
  @Roles(UserRole.CANDIDATE)
  findMyAssignment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assignmentsService.findCandidateAssignmentOrThrow(id, user.id);
  }
}
