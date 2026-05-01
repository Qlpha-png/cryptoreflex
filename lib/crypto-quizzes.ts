/**
 * lib/crypto-quizzes.ts — Quiz éducatifs par crypto.
 *
 * Data 100% statique (data/crypto-quizzes.json). 8 questions par crypto pour
 * les top 20 par market cap. Pas de question YMYL ("Faut-il acheter ?" interdit).
 */
import data from "@/data/crypto-quizzes.json";

export interface QuizQuestion {
  q: string;
  choices: string[];
  correctIdx: number;
  explanation: string;
}

export interface CryptoQuiz {
  questions: QuizQuestion[];
}

interface QuizzesFile {
  quizzes: Record<string, CryptoQuiz>;
}

const FILE = data as QuizzesFile;
const QUIZZES = FILE.quizzes ?? {};

/** Renvoie le quiz d'une crypto, ou null si pas de quiz éditorial. */
export function getQuizFor(cryptoId: string): CryptoQuiz | null {
  const q = QUIZZES[cryptoId];
  if (!q || !q.questions || q.questions.length === 0) return null;
  return q;
}
