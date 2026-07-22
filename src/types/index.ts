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
  status: string;
  boardId: string;
  deadline?: string;
  timeSlot?: 'dawn' | 'morning' | 'afternoon' | 'evening';
  completedAt?: string;
  linkType?: 'study' | 'money' | null;
  linkId?: number;
}

export type KanbanColorKey =
  | 'red' | 'yellow' | 'blue' | 'green'
  | 'pink' | 'teal' | 'purple' | 'orange';

export interface KanbanColumn {
  id: string;
  label: string;
  color: KanbanColorKey;
  /** 今日列语义标记：时段图统计、赚钱自动同步、新建任务分配的目标列（每看板恰好一个） */
  isToday?: boolean;
  /** 完成列语义标记：拖入记录 completedAt，拖出清除（至多一个，可无） */
  isDone?: boolean;
}

export interface KanbanBoard {
  id: string;
  name: string;
  columns: KanbanColumn[];
}

export interface CardDisplayConfig {
  description: boolean;
  deadline: boolean;
  link: boolean;
}

export interface MyDayState {
  version: number;
  activeTab: string;
  chartRange: string;
  weightUnit: 'kg' | 'jin';
  moneyPlan: string;
  weights: WeightRecord[];
  studyItems: StudyItem[];
  moneyItems: MoneyItem[];
  todayLogs: TodayLog[];
  tasks: TaskItem[];
  inspirations: InspirationItem[];
  boards: KanbanBoard[];
  activeBoardId: string;
  cardDisplay: CardDisplayConfig;
}
