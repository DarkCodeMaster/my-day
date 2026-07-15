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
}

export interface TodayLog {
  time: string;
  category: 'health' | 'study' | 'money';
  content: string;
}

export interface MyDayState {
  version: number;
  activeTab: string;
  chartRange: string;
  weights: WeightRecord[];
  studyItems: StudyItem[];
  moneyItems: MoneyItem[];
  todayLogs: TodayLog[];
}
