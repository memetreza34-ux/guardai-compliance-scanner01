export type ViewState = 'dashboard' | 'scans' | 'ai-governance';

export interface ScanResult {
  id: string;
  target: string;
  type: 'website' | 'repository' | 'browser';
  status: 'passed' | 'failed' | 'warning' | 'pending';
  score: number | null;
  date: string;
  findings: number;
}

export interface Metric {
  label: string;
  value: string | number;
  trend?: string;
  status?: 'good' | 'neutral' | 'bad';
}
