import type { RentalStayStage, RentalType } from '@shared/contracts/rental';

export const EXPERIENCE_TAGS = ['避坑', '推荐', '通勤友好', '隔音一般', '采光好', '费用争议', '同住友好', '服务谨慎'];

export const ROOM_TYPES = ['单人空间', '一居', '两居', '三居', '多人空间', '其他'];

export const RENTAL_TYPES: Array<{ label: string; value: RentalType }> = [
  { label: '独住', value: 'whole' },
  { label: '同住', value: 'shared' },
  { label: '单间', value: 'single' },
  { label: '转住', value: 'sublet' },
  { label: '短住', value: 'short' }
];

export const STAY_STAGES: Array<{ label: string; value: RentalStayStage }> = [
  { label: '正在体验', value: 'living' },
  { label: '已经离开', value: 'moved_out' },
  { label: '看过没住', value: 'viewing' },
  { label: '转给别人', value: 'subletting' }
];
