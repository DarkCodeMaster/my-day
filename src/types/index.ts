export interface WeightRecord {
  date: string;
  weight: number;
}

export interface StudyItem {
  id: number;
  type: 'video' | 'book' | 'skill';
  name: string;
  image: string;
  abbr: string;
  progress: number;
  link?: string;
  lesson?: number;
  totalLesson?: number;
  chapter?: number;
  totalChapter?: number;
  page?: number;
  totalPage?: number;
  notes?: string;
}

export interface MoneyItem {
  id: number;
  desc: string;
  amount: number;
  deadline: string;
  progress: number;
  status: 'pending' | 'done' | 'paused';
  description?: string;
}

export interface TodayLog {
  date: string;
  time: string;
  category: 'health' | 'study' | 'money' | 'inspiration';
  content: string;
}

export interface InspirationItem {
  id: number;
  content: string;
  date: string;
  time: string;
}

export interface TaskItem {
  id: number;
  title: string;
  description?: string;
  status: 'today' | 'todo' | 'doing' | 'done';
  deadline?: string;
  timeSlot?: 'dawn' | 'morning' | 'afternoon' | 'evening';
  completedAt?: string;
  linkType?: 'study' | 'money' | null;
  linkId?: number;
}

export interface MyDayState {
  version: number;
  activeTab: string;
  chartRange: string;
  moneyPlan: string;
  weights: WeightRecord[];
  studyItems: StudyItem[];
  moneyItems: MoneyItem[];
  todayLogs: TodayLog[];
  tasks: TaskItem[];
  inspirations: InspirationItem[];
}
