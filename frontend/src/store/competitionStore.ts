import { create } from 'zustand';
import type { Competition, Round, MCQQuestion, CodingProblem } from '@/types';

interface CompetitionStore {
  competitions: Competition[];
  currentCompetition: Competition | null;
  currentRound: Round | null;
  rounds: Round[];
  mcqQuestions: MCQQuestion[];
  codingProblems: CodingProblem[];
  isLoading: boolean;
  error: string | null;

  setCompetitions: (competitions: Competition[]) => void;
  setCurrentCompetition: (competition: Competition | null) => void;
  setCurrentRound: (round: Round | null) => void;
  setRounds: (rounds: Round[]) => void;
  setMcqQuestions: (questions: MCQQuestion[]) => void;
  setCodingProblems: (problems: CodingProblem[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useCompetitionStore = create<CompetitionStore>((set) => ({
  competitions: [],
  currentCompetition: null,
  currentRound: null,
  rounds: [],
  mcqQuestions: [],
  codingProblems: [],
  isLoading: false,
  error: null,

  setCompetitions: (competitions) => set({ competitions }),
  setCurrentCompetition: (currentCompetition) => set({ currentCompetition }),
  setCurrentRound: (currentRound) => set({ currentRound }),
  setRounds: (rounds) => set({ rounds }),
  setMcqQuestions: (mcqQuestions) => set({ mcqQuestions }),
  setCodingProblems: (codingProblems) => set({ codingProblems }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({
    competitions: [], currentCompetition: null, currentRound: null,
    rounds: [], mcqQuestions: [], codingProblems: [], isLoading: false, error: null,
  }),
}));
