import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
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

type CandidateSeed = {
  name: string;
  email: string;
};

type AssessmentSeed = {
  title: string;
  track: string;
  durationMinutes: number;
  questionCount: number;
};

type QuestionSeed = {
  track: string;
  type: QuestionType;
  questionText: string;
  options: string[];
  correctAnswers: string[];
  marks: number;
};

const mongoUri =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/proctored_assessment';

function readSeedJson<T>(filename: string): T {
  const filePath = path.join(__dirname, 'seed-data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

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

function buildOptions(optionTexts: string[]) {
  return optionTexts.map((text, index) => ({
    label: String.fromCharCode(65 + index),
    text,
  }));
}

function pickQuestions(
  assessment: AssessmentSeed,
  questionBank: QuestionSeed[],
): QuestionSeed[] {
  const exactTrack = questionBank.filter(
    (question) => question.track === assessment.track,
  );
  const sharedTracks = questionBank.filter((question) =>
    ['backend', 'frontend', 'database', 'cloud', 'fullstack'].includes(
      question.track,
    ),
  );
  const pool = [...exactTrack, ...sharedTracks];

  return Array.from({ length: assessment.questionCount }, (_, index) => {
    const baseQuestion = pool[index % pool.length];
    return {
      ...baseQuestion,
      questionText: `${baseQuestion.questionText} (${assessment.title} - Q${index + 1})`,
    };
  });
}

async function seed() {
  await mongoose.connect(mongoUri);

  const AssessmentModel = mongoose.model(Assessment.name, AssessmentSchema);
  const AssignmentModel = mongoose.model(Assignment.name, AssignmentSchema);
  const QuestionModel = mongoose.model(Question.name, QuestionSchema);

  const candidatesSeed = readSeedJson<CandidateSeed[]>('candidates.json');
  const assessmentsSeed = readSeedJson<AssessmentSeed[]>('assessments.json');
  const questionBank = readSeedJson<QuestionSeed[]>('question-bank.json');

  const admin = await upsertUser(
    'Admin User',
    'admin@example.com',
    'Admin@123',
    UserRole.ADMIN,
  );

  const candidates = await Promise.all(
    candidatesSeed.map((candidate) =>
      upsertUser(
        candidate.name,
        candidate.email,
        'Candidate@123',
        UserRole.CANDIDATE,
      ),
    ),
  );

  for (const [assessmentIndex, assessmentSeed] of assessmentsSeed.entries()) {
    const assessment = await AssessmentModel.findOneAndUpdate(
      { title: assessmentSeed.title },
      {
        title: assessmentSeed.title,
        description: `${assessmentSeed.track.toUpperCase()} assessment covering MERN/MEAN, AWS, MySQL, MongoDB, API design, security, and practical web development topics.`,
        durationMinutes: assessmentSeed.durationMinutes,
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

    await QuestionModel.deleteMany({
      $or: [{ assessmentId: assessment._id }, { assessmentIds: assessment._id }],
    });

    const assessmentQuestions = pickQuestions(assessmentSeed, questionBank);
    await QuestionModel.insertMany(
      assessmentQuestions.map((question, index) => ({
        assessmentId: assessment._id,
        assessmentIds: [assessment._id],
        type: question.type,
        questionText: question.questionText,
        options: buildOptions(question.options),
        correctAnswers: question.correctAnswers,
        marks: question.marks,
        order: index + 1,
      })),
    );

    const assignedCandidates = candidates.slice(
      assessmentIndex % candidates.length,
      assessmentIndex % candidates.length + 5,
    );
    const wrappedCandidates =
      assignedCandidates.length === 5
        ? assignedCandidates
        : [
            ...assignedCandidates,
            ...candidates.slice(0, 5 - assignedCandidates.length),
          ];

    for (const candidate of wrappedCandidates) {
      await AssignmentModel.updateOne(
        {
          assessmentId: assessment._id,
          candidateId: candidate._id as Types.ObjectId,
        },
        {
          assessmentId: assessment._id,
          candidateId: candidate._id,
          assignedAt: new Date(),
          status: AssignmentStatus.ASSIGNED,
        },
        { upsert: true },
      );
    }
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
