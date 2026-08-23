import { Injectable } from '@nestjs/common';
import { QuestionType } from '../common/enums/question-type.enum';
import { QuestionDocument } from '../questions/schemas/question.schema';
import { AttemptAnswer } from './schemas/attempt.schema';

@Injectable()
export class ScoringService {
  calculateTotalScore(
    questions: QuestionDocument[],
    answers: AttemptAnswer[],
  ): number {
    const answersByQuestion = new Map(
      answers.map((answer) => [answer.questionId.toString(), answer.answer]),
    );

    return questions.reduce((total, question) => {
      const answer = answersByQuestion.get(question._id.toString());

      if (question.type === QuestionType.SINGLE_CHOICE) {
        return total + this.scoreSingleChoice(question, answer);
      }

      if (question.type === QuestionType.MULTIPLE_CHOICE) {
        return total + this.scoreMultipleChoice(question, answer);
      }

      return total;
    }, 0);
  }

  private scoreSingleChoice(
    question: QuestionDocument,
    answer: string | string[] | null | undefined,
  ) {
    return answer === question.correctAnswers[0] ? question.marks : 0;
  }

  private scoreMultipleChoice(
    question: QuestionDocument,
    answer: string | string[] | null | undefined,
  ) {
    if (!Array.isArray(answer)) {
      return 0;
    }

    const expected = [...question.correctAnswers].sort();
    const actual = [...answer].sort();
    const isCorrect =
      expected.length === actual.length &&
      expected.every((value, index) => value === actual[index]);

    return isCorrect ? question.marks : 0;
  }
}
