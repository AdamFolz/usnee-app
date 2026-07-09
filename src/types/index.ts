export interface Substance {
  id: string;
  name: string;
  category: SubstanceCategory;
  aliases?: string[];
  durationHours?: number;
  peakHours?: number;
  halfLifeHours?: number;
  color: string;
}

export type SubstanceCategory =
  | 'euphorics'
  | 'stimulants'
  | 'cannabinoids'
  | 'dissociatives'
  | 'benzodiazepines'
  | 'opioids'
  | 'alcohol'
  | 'custom';

export interface ConsumptionMethod {
  id: string;
  name: string;
  icon: string;
  fields: MethodField[];
  abbreviations: string[];
}

export interface MethodField {
  key: string;
  label: string;
  type: 'number' | 'select' | 'text' | 'boolean';
  options?: string[];
  placeholder?: string;
  unit?: string;
  optional?: boolean;
}

export interface Trigger {
  id: string;
  name: string;
  icon: string;
}

export interface ConsumptionEntry {
  id: string;
  substanceId: string;
  substanceName?: string;
  methodId: string;
  methodName?: string;
  timestamp: number;
  dose: number;
  doseUnit: string;
  methodDetails: Record<string, unknown>;
  triggerId?: string;
  triggerName?: string;
  customTrigger?: string;
  notes?: string;
  qualityNote?: string;
  pulse?: number;
  missedShot?: boolean;
  fentanylTestResult?: 'positive' | 'negative' | 'inconclusive' | null;
  batchId?: string;
  location?: string;
  alone: boolean;
  latitude?: number;
  longitude?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Batch {
  id: string;
  substanceId: string;
  name: string;
  totalWeight: number;
  weightUnit: string;
  solutionVolume: number;
  volumeUnit: string;
  concentration: number;
  createdAt: number;
  active: boolean;
  remaining: number;
}

export interface SleepEntry {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  quality?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export interface MoodEntry {
  id: string;
  timestamp: number;
  mood: 'euphoric' | 'good' | 'neutral' | 'irritable' | 'depressed' | 'anxious';
  intensity: number;
  notes?: string;
}

export interface FoodEntry {
  id: string;
  timestamp: number;
  ate: boolean;
  description?: string;
}

export interface WaterEntry {
  id: string;
  timestamp: number;
  amount: number;
  unit: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt?: number;
  condition: string;
}

export type AppScreen =
  | 'home'
  | 'add'
  | 'history'
  | 'stats'
  | 'calendar'
  | 'safety'
  | 'settings'
  | 'profile';

export interface UserSettings {
  pin?: string;
  useBiometrics?: boolean;
  darkTheme: boolean;
  dailyLimit?: number;
  limitSubstance?: string;
  notifications: boolean;
  reminderEat: boolean;
  reminderWater: boolean;
  reminderBreak: boolean;
  emergencyContact?: string;
  language: 'ru' | 'en';
  dataExportPassword?: string;
  onboardingCompleted: boolean;
}

export interface TimerState {
  id: string;
  type: 'usage' | 'break' | 'nors' | 'effect';
  substanceId?: string;
  startedAt: number;
  durationMinutes: number;
  alarmAt: number;
  active: boolean;
  label: string;
}

export interface NorsSession {
  id: string;
  startedAt: number;
  substanceId?: string;
  methodId?: string;
  checkInInterval: number;
  lastCheckIn: number;
  status: 'active' | 'checked' | 'overdue' | 'ended';
  emergencyContact?: string;
  notes?: string;
}
