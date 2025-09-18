export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface EventApplicationsData {
  eventId: string;
  applications: Application[];
  totalCount: number;
  metadata: {
    generatedAt: string;
    purpose: string;
  };
}

export interface Application {
  id: string;
  userId?: string;
  eventId: string;
  status: string;
  language: string;
  isComplete: boolean;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  applicant?: {
    id: string;
    name?: string;
    email?: string;
  };
  event?: {
    id: string;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
  };
  responses: ApplicationResponse[];
  responseCount: number;
  completionPercentage: number;
}

export interface ApplicationResponse {
  questionId: string;
  questionKey: string;
  questionText: string;
  questionType: string;
  required: boolean;
  answer: string;
  order: number;
}

export interface EventEvaluationsData {
  eventId: string;
  event: EventInfo;
  evaluations: Evaluation[];
  statistics: EvaluationStatistics;
  metadata: {
    generatedAt: string;
    purpose: string;
    usage: string;
  };
}

export interface Evaluation {
  id: string;
  applicationId: string;
  reviewerId: string;
  status: string;
  stage: string;
  overallScore?: number;
  overallComments?: string;
  recommendation?: string;
  confidence?: number;
  timeSpentMinutes?: number;
  completedAt?: string;
  application: {
    id: string;
    userId?: string;
    status: string;
    submittedAt?: string;
    applicant?: {
      id: string;
      name?: string;
      email?: string;
    };
  };
  reviewer: {
    id: string;
    name?: string;
    role?: string;
  };
  scores: EvaluationScore[];
  comments: EvaluationComment[];
  video: {
    watched: boolean;
    quality?: number;
    timestamps?: any;
  };
  metrics: {
    averageScore?: number;
    weightedScore?: number;
    categoryScores: Record<string, number[]>;
    completeness: {
      hasOverallScore: boolean;
      hasRecommendation: boolean;
      hasComments: boolean;
      scoreCount: number;
    };
  };
}

export interface EvaluationScore {
  criteriaId: string;
  criteriaName: string;
  criteriaCategory: string;
  criteriaWeight: number;
  scoreRange: {
    min: number;
    max: number;
  };
  score: number;
  reasoning?: string;
  normalizedScore: number;
}

export interface EvaluationComment {
  id: string;
  questionKey?: string;
  comment: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface EvaluationStatistics {
  totalEvaluations: number;
  uniqueApplications: number;
  uniqueReviewers: number;
  recommendations: {
    ACCEPT: number;
    REJECT: number;
    WAITLIST: number;
    NEEDS_MORE_INFO: number;
  };
  averageOverallScore: number;
  averageConfidence: number;
}

export interface EventInfo {
  id: string;
  name: string;
  description?: string;
  type: string;
  startDate: string;
  endDate: string;
}

export interface EvaluationCriteriaData {
  eventId: string;
  event: EventInfo;
  criteria: Criterion[];
  categorizedCriteria: {
    TECHNICAL: Criterion[];
    PROJECT: Criterion[];
    COMMUNITY_FIT: Criterion[];
    VIDEO: Criterion[];
    OVERALL: Criterion[];
  };
  totalCount: number;
  scoring: {
    totalMaxScore: number;
    weightedMaxScore: number;
    averageWeight: number;
    categoryWeights: {
      TECHNICAL: number;
      PROJECT: number;
      COMMUNITY_FIT: number;
      VIDEO: number;
      OVERALL: number;
    };
  };
  metadata: {
    generatedAt: string;
    purpose: string;
    usage: string;
  };
}

export interface Criterion {
  id: string;
  name: string;
  description: string;
  category: string;
  weight: number;
  scoreRange: {
    min: number;
    max: number;
    range: number;
  };
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  categoryDescription: string;
  scoringGuidance: string;
}

export interface ApplicationQuestionsData {
  eventId: string;
  event?: EventInfo;
  questions: Question[];
  totalCount: number;
  questionTypes: Record<string, number>;
  metadata: {
    generatedAt: string;
    purpose: string;
    totalRequired: number;
    totalOptional: number;
  };
}

export interface Question {
  id: string;
  eventId: string;
  order: number;
  questionKey: string;
  questionText: {
    en: string;
    es: string;
  };
  questionType: string;
  required: boolean;
  options?: string[];
  createdAt: string;
  updatedAt: string;
  isMultipleChoice: boolean;
  isTextInput: boolean;
  isContactInfo: boolean;
  maxOptions: number;
}

export interface TestConnectionData {
  success: boolean;
  message: string;
  timestamp: string;
}