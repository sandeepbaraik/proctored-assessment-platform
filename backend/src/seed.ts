import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import mongoose, { Types } from 'mongoose';
import { AssessmentStatus } from './common/enums/assessment-status.enum';
import { AssignmentStatus } from './common/enums/assignment-status.enum';
import { QuestionType } from './common/enums/question-type.enum';
import { UserRole } from './common/enums/user-role.enum';
import {
  Assessment,
  AssessmentSchema,
} from './assessments/schemas/assessment.schema';
import {
  Assignment,
  AssignmentSchema,
} from './assignments/schemas/assignment.schema';
import { Question, QuestionSchema } from './questions/schemas/question.schema';
import { User, UserSchema } from './users/schemas/user.schema';

const mongoUri =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/proctored_assessment';

async function upsertUser(
  name: string,
  email: string,
  password: string,
  role: UserRole,
) {
  const passwordHash = await bcrypt.hash(password, 10);

  return mongoose.model(User.name, UserSchema).findOneAndUpdate(
    { email },
    { name, email, passwordHash, role },
    { new: true, upsert: true },
  );
}

async function seed() {
  await mongoose.connect(mongoUri);

  const AssessmentModel = mongoose.model(Assessment.name, AssessmentSchema);
  const AssignmentModel = mongoose.model(Assignment.name, AssignmentSchema);
  const QuestionModel = mongoose.model(Question.name, QuestionSchema);

  const admin = await upsertUser(
    'Admin User',
    'admin@example.com',
    'Admin@123',
    UserRole.ADMIN,
  );
  const candidate1 = await upsertUser(
    'Candidate One',
    'candidate1@example.com',
    'Candidate@123',
    UserRole.CANDIDATE,
  );
  const candidate2 = await upsertUser(
    'Candidate Two',
    'candidate2@example.com',
    'Candidate@123',
    UserRole.CANDIDATE,
  );

  const assessment = await AssessmentModel.findOneAndUpdate(
    { title: 'Sample Full-Stack Assessment' },
    {
      title: 'Sample Full-Stack Assessment',
      description: 'Seed assessment covering all supported question types.',
      durationMinutes: 30,
      status: AssessmentStatus.PUBLISHED,
      createdBy: admin._id,
      proctoringRules: {
        captureTabSwitch: true,
        captureWindowBlur: true,
        captureFullscreenExit: true,
        captureCopyPaste: true,
        captureRightClick: true,
        violationLimit: 5,
      },
    },
    { new: true, upsert: true },
  );

  await QuestionModel.deleteMany({ assessmentId: assessment._id });
  await QuestionModel.insertMany([
    {
      assessmentId: assessment._id,
      type: QuestionType.SINGLE_CHOICE,
      questionText: 'Which HTTP status code means Forbidden?',
      options: [
        { label: 'A', text: '200' },
        { label: 'B', text: '401' },
        { label: 'C', text: '403' },
        { label: 'D', text: '500' },
      ],
      correctAnswers: ['C'],
      marks: 2,
      order: 1,
    },
    {
      assessmentId: assessment._id,
      type: QuestionType.MULTIPLE_CHOICE,
      questionText: 'Which features are required for this platform?',
      options: [
        { label: 'A', text: 'JWT authentication' },
        { label: 'B', text: 'Autosave answers' },
        { label: 'C', text: 'Server-driven timer' },
        { label: 'D', text: 'Blockchain certificates' },
      ],
      correctAnswers: ['A', 'B', 'C'],
      marks: 3,
      order: 2,
    },
    {
      assessmentId: assessment._id,
      type: QuestionType.SHORT_ANSWER,
      questionText: 'Briefly explain why candidate ownership validation matters.',
      options: [],
      correctAnswers: [],
      marks: 0,
      order: 3,
    },
  ]);

  for (const candidateId of [candidate1._id, candidate2._id] as Types.ObjectId[]) {
    await AssignmentModel.updateOne(
      { assessmentId: assessment._id, candidateId },
      {
        assessmentId: assessment._id,
        candidateId,
        assignedAt: new Date(),
        status: AssignmentStatus.ASSIGNED,
      },
      { upsert: true },
    );
  }

  await mongoose.disconnect();
}

seed()
  .then(() => {
    console.log('Seed data created successfully');
  })
  .catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  });
