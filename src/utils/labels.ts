export const studyTypeText = (type: string) =>
  type === 'video' ? '视频' : type === 'book' ? '书籍' : '技能';

export const statusText = (status: string) =>
  status === 'done' ? '完成' : status === 'pending' ? '未完成' : '暂停';

export const categoryName = (c: 'health' | 'study' | 'money' | 'inspiration') =>
  ({ health: '健康', study: '学习', money: '赚钱', inspiration: '灵感' })[c] as string;
