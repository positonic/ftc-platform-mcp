import fetch from 'node-fetch';
import type {
  ApiResponse,
  EventApplicationsData,
  EventEvaluationsData,
  EvaluationCriteriaData,
  ApplicationQuestionsData,
  TestConnectionData
} from '../types/index.js';

export class VercelApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.VERCEL_API_BASE_URL ?? 'http://localhost:3000/api/mastra';
    this.apiKey = process.env.MASTRA_API_KEY ?? '';
    
    if (!this.apiKey) {
      throw new Error('MASTRA_API_KEY environment variable is required');
    }
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'FTC-MCP-Server/1.0.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText}\nResponse: ${errorText}`);
    }

    const data = await response.json() as ApiResponse<T>;
    
    if (!data.success) {
      throw new Error(`API returned error: ${data.error ?? 'Unknown error'}\nDetails: ${data.details ?? 'No details'}`);
    }

    if (!data.data) {
      throw new Error('API returned success but no data');
    }

    return data.data;
  }

  /**
   * Test connection to the Vercel API
   */
  async testConnection(): Promise<TestConnectionData> {
    return this.makeRequest<TestConnectionData>('/test');
  }

  /**
   * Get all applications for a specific event
   */
  async getEventApplications(eventId: string): Promise<EventApplicationsData> {
    if (!eventId) {
      throw new Error('eventId is required');
    }
    return this.makeRequest<EventApplicationsData>(`/events/${eventId}/applications`);
  }

  /**
   * Get completed evaluations for applications in a specific event
   */
  async getEventEvaluations(eventId: string): Promise<EventEvaluationsData> {
    if (!eventId) {
      throw new Error('eventId is required');
    }
    return this.makeRequest<EventEvaluationsData>(`/events/${eventId}/evaluations`);
  }

  /**
   * Get evaluation criteria for a specific event
   */
  async getEvaluationCriteria(eventId: string): Promise<EvaluationCriteriaData> {
    if (!eventId) {
      throw new Error('eventId is required');
    }
    return this.makeRequest<EvaluationCriteriaData>(`/events/${eventId}/criteria`);
  }

  /**
   * Get application questions for a specific event
   */
  async getApplicationQuestions(eventId: string): Promise<ApplicationQuestionsData> {
    if (!eventId) {
      throw new Error('eventId is required');
    }
    return this.makeRequest<ApplicationQuestionsData>(`/events/${eventId}/questions`);
  }

  /**
   * Check if the API client is properly configured
   */
  getStatus(): { configured: boolean; baseUrl: string; hasApiKey: boolean } {
    return {
      configured: Boolean(this.baseUrl && this.apiKey),
      baseUrl: this.baseUrl,
      hasApiKey: Boolean(this.apiKey)
    };
  }
}