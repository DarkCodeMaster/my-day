<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { Button, Input, Radio, Switch, Title, Modal, Table } from 'animal-island-vue';
import type { RadioOption } from 'animal-island-vue';
import { useMyDayStorage } from '@/composables/useMyDayStorage';
import { useTodayLog } from '@/composables/useTodayLog';
import { useDetailDrawers } from '@/composables/useDetailDrawers';
import { useDeleteConfirm } from '@/composables/useDeleteConfirm';
import { usePanelUiState } from '@/composables/usePanelUiState';
import { studyTypeText } from '@/utils/labels';
import type { StudyItem } from '@/types';

const { studyItems } = useMyDayStorage();
const { pushTodayLog } = useTodayLog();
const { openDetail } = useDetailDrawers();
const { openDelete } = useDeleteConfirm();
const { studyType, showCompletedStudy, studyPage } = usePanelUiState();

const studyRadio: RadioOption[] = [
  { label: '全部', value: 'all' },
  { label: '视频', value: 'video' },
  { label: '书籍', value: 'book' },
  { label: '技能', value: 'skill' },
];
const studyCols: any[] = [
  { title: '项目', dataIndex: 'name' },
  { title: '类型', dataIndex: 'type', width: '90px', align: 'center' },
  { title: '进度', dataIndex: 'progress', width: '150px' },
  { title: '详情', dataIndex: 'detail', width: '240px' },
  { title: '操作', dataIndex: 'action', width: '100px', align: 'center' },
];
const studyTypeOptions: RadioOption[] = [
  { label: '视频', value: 'video' },
  { label: '书籍', value: 'book' },
  { label: '技能', value: 'skill' },
];
const studyColorMap: Record<string, string> = { video: '#b77dee', book: '#f8a6b2', skill: '#82d5bb' };

const studyForm = reactive({
  type: 'video',
  name: '',
  progress: '',
  link: '',
  lesson: '',
  totalLesson: '',
  chapter: '',
  totalChapter: '',
  page: '',
  totalPage: '',
  notes: '',
});
const resetStudyForm = () => {
  studyForm.type = 'video';
  studyForm.name = '';
  studyForm.progress = '';
  studyForm.link = '';
  studyForm.lesson = '';
  studyForm.totalLesson = '';
  studyForm.chapter = '';
  studyForm.totalChapter = '';
  studyForm.page = '';
  studyForm.totalPage = '';
  studyForm.notes = '';
};
const computedBookProgress = computed(() => {
  const total = Number(studyForm.totalPage) || 0;
  const page = Number(studyForm.page) || 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((page / total) * 100));
});
const computedVideoProgress = computed(() => {
  const total = Number(studyForm.totalLesson) || 0;
  const lesson = Number(studyForm.lesson) || 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((lesson / total) * 100));
});

const filteredStudy = computed(() => {
  let list = studyType.value === 'all' ? studyItems : studyItems.filter((s: StudyItem) => s.type === studyType.value);
  if (!showCompletedStudy.value) {
    list = list.filter((s: StudyItem) => s.progress < 100);
  }
  return list;
});
const studyPageSize = 10;
const studyTotalPages = computed(() => Math.ceil(filteredStudy.value.length / studyPageSize) || 1);
const paginatedStudy = computed(() => {
  const start = (studyPage.value - 1) * studyPageSize;
  return filteredStudy.value.slice(start, start + studyPageSize);
});
watch([studyType, showCompletedStudy], () => { studyPage.value = 1; });
watch(studyTotalPages, (total) => { if (studyPage.value > total) studyPage.value = total || 1; });

const draggingStudyId = ref<number | null>(null);
const dragOverStudyId = ref<number | null>(null);
const handleStudyDragStart = (record: StudyItem) => {
  draggingStudyId.value = record.id;
};
const handleStudyDragOver = (record: StudyItem) => {
  dragOverStudyId.value = record.id;
};
const handleStudyDrop = (targetRecord: StudyItem) => {
  if (draggingStudyId.value == null) return;
  const fromItem = paginatedStudy.value.find((s: StudyItem) => s.id === draggingStudyId.value);
  if (!fromItem || fromItem.id === targetRecord.id) return;
  const fromGlobal = studyItems.findIndex((s: StudyItem) => s.id === fromItem.id);
  const toGlobal = studyItems.findIndex((s: StudyItem) => s.id === targetRecord.id);
  if (fromGlobal === -1 || toGlobal === -1) return;
  const [moved] = studyItems.splice(fromGlobal, 1);
  studyItems.splice(toGlobal, 0, moved);
  draggingStudyId.value = null;
  dragOverStudyId.value = null;
};
const handleStudyDragEnd = () => {
  draggingStudyId.value = null;
  dragOverStudyId.value = null;
};
const addStudy = () => {
  const name = studyForm.name.trim();
  if (!name) return;
  const item: StudyItem = {
    id: Date.now(),
    type: studyForm.type as StudyItem['type'],
    name,
    image: studyColorMap[studyForm.type],
    abbr: name.slice(0, 2),
    progress: 0,
  };
  if (studyForm.type === 'video') {
    item.link = studyForm.link.trim();
    item.lesson = Number(studyForm.lesson) || 0;
    item.totalLesson = Number(studyForm.totalLesson) || 0;
    if (item.totalLesson > 0) {
      item.progress = Math.min(100, Math.round((item.lesson / item.totalLesson) * 100));
    } else {
      item.progress = 0;
    }
  } else if (studyForm.type === 'book') {
    item.chapter = Number(studyForm.chapter) || 0;
    item.totalChapter = Number(studyForm.totalChapter) || 0;
    item.page = Number(studyForm.page) || 0;
    item.totalPage = Number(studyForm.totalPage) || 0;
    if (item.totalPage > 0) {
      item.progress = Math.min(100, Math.round((item.page / item.totalPage) * 100));
    } else {
      item.progress = 0;
    }
  } else {
    item.notes = studyForm.notes.trim();
    item.progress = Math.min(100, Math.max(0, Number(studyForm.progress) || 0));
  }
  studyItems.push(item);
  resetStudyForm();
  pushTodayLog('study', `添加学习项 ${item.name}，进度 ${item.progress}%`);
};

const studyModalOpen = ref(false);
const openStudyModal = () => {
  resetStudyForm();
  studyModalOpen.value = true;
};
const submitStudy = () => {
  if (!studyForm.name.trim()) return;
  addStudy();
  studyModalOpen.value = false;
};

const editStudyModalOpen = ref(false);
const editStudyTarget = ref<StudyItem | null>(null);
const editProgress = ref('');
const editBookChapter = ref('');
const editBookTotalChapter = ref('');
const editBookPage = ref('');
const editBookTotalPage = ref('');
const editVideoLesson = ref('');
const editVideoTotalLesson = ref('');
const openEditStudy = (record: StudyItem) => {
  editStudyTarget.value = record;
  editProgress.value = String(record.progress);
  editBookChapter.value = String(record.chapter ?? '');
  editBookTotalChapter.value = String(record.totalChapter ?? '');
  editBookPage.value = String(record.page ?? '');
  editBookTotalPage.value = String(record.totalPage ?? '');
  editVideoLesson.value = String(record.lesson ?? '');
  editVideoTotalLesson.value = String(record.totalLesson ?? '');
  editStudyModalOpen.value = true;
};
const submitEditStudy = () => {
  if (!editStudyTarget.value) return;
  const record = editStudyTarget.value;
  if (record.type === 'book') {
    record.chapter = Number(editBookChapter.value) || 0;
    record.totalChapter = Number(editBookTotalChapter.value) || 0;
    record.page = Number(editBookPage.value) || 0;
    record.totalPage = Number(editBookTotalPage.value) || 0;
    if (record.totalPage > 0) {
      record.progress = Math.min(100, Math.round((record.page / record.totalPage) * 100));
    }
  } else if (record.type === 'video') {
    record.lesson = Number(editVideoLesson.value) || 0;
    record.totalLesson = Number(editVideoTotalLesson.value) || 0;
    if (record.totalLesson > 0) {
      record.progress = Math.min(100, Math.round((record.lesson / record.totalLesson) * 100));
    }
  } else {
    record.progress = Math.min(100, Math.max(0, Number(editProgress.value) || 0));
  }
  pushTodayLog('study', `更新 ${record.name} 进度为 ${record.progress}%`);
  editStudyModalOpen.value = false;
};
</script>

<template>
  <div class="section">
    <div class="section-head">
      <div style="display:flex;align-items:center;gap:16px;">
        <Title color="app-blue" size="middle">学习进度表</Title>
        <Switch v-model="showCompletedStudy" class="study-switch">
          <template #checked>显示已完成</template>
          <template #unchecked>隐藏已完成</template>
        </Switch>
      </div>
      <div class="form-row">
        <Radio v-model="studyType" :options="studyRadio" size="middle" direction="horizontal" />
        <Button type="primary" size="middle" @click="openStudyModal">添加学习项</Button>
      </div>
    </div>
    <Table
      :columns="studyCols"
      :data-source="paginatedStudy"
      row-key="id"
      :striped="true"
      :onRow="(record: StudyItem) => ({
        onClick: () => openDetail(record),
        style: { cursor: 'pointer' },
        draggable: true,
        onDragstart: () => handleStudyDragStart(record),
        onDragover: (e: DragEvent) => { e.preventDefault(); handleStudyDragOver(record); },
        onDrop: (e: DragEvent) => { e.preventDefault(); handleStudyDrop(record); },
        onDragend: handleStudyDragEnd,
        class: draggingStudyId === record.id ? 'study-row-dragging' : dragOverStudyId === record.id ? 'study-row-drag-over' : '',
      })"
    >
      <template #cell-name="{ record }">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="cell-thumb"
            :style="{ background: record.image, color: '#fff', textShadow: '0 1px 1px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px' }"
          >
            {{ record.abbr }}
          </div>
          <div>
            <div class="cell-title">{{ record.name }}</div>
          </div>
        </div>
      </template>
      <template #cell-type="{ record }">
        <span class="study-type-badge" :class="record.type">{{ studyTypeText(record.type) }}</span>
      </template>
      <template #cell-progress="{ record }">
        <div style="font-weight:700;color:var(--text);">{{ record.progress }}%</div>
        <div class="progress-bar">
          <div class="progress-bar-fill" :style="{ width: record.progress + '%' }"></div>
        </div>
      </template>
      <template #cell-detail="{ record }">
        <div v-if="record.type === 'video'" class="cell-meta">第 {{ record.lesson }} / {{ record.totalLesson }} 课</div>
        <div v-else-if="record.type === 'book'" class="cell-meta">第 {{ record.chapter }} / {{ record.totalChapter }} 章 · 第 {{ record.page }} / {{ record.totalPage }} 页</div>
        <div v-else class="cell-meta">{{ record.notes }}</div>
      </template>
      <template #cell-action="{ record }">
        <div style="display:flex;gap:8px;justify-content:center;">
          <Button type="text" size="middle" @click.stop="openEditStudy(record)">编辑</Button>
          <Button type="text" size="middle" @click.stop="openDelete('study', record.id)">删除</Button>
        </div>
      </template>
    </Table>
    <div v-if="filteredStudy.length > studyPageSize" class="table-pagination">
      <Button type="default" size="small" :disabled="studyPage === 1" @click="studyPage--">上一页</Button>
      <span class="table-pagination-info">{{ studyPage }} / {{ studyTotalPages }}</span>
      <Button type="default" size="small" :disabled="studyPage === studyTotalPages" @click="studyPage++">下一页</Button>
    </div>

    <Modal
      v-model:open="studyModalOpen"
      title="添加学习项"
      :typewriter="false"
      :show-footer="true"
    >
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="form-field">
          <label class="form-field-label">类型</label>
          <Radio v-model="studyForm.type" :options="studyTypeOptions" direction="horizontal" size="middle" />
        </div>
        <div class="form-field">
          <label class="form-field-label">学习项目名称</label>
          <Input v-model="studyForm.name" placeholder="学习项目名称" style="width:100%;" />
        </div>

        <template v-if="studyForm.type === 'video'">
          <div class="form-field">
            <label class="form-field-label">课程链接</label>
            <Input v-model="studyForm.link" placeholder="课程链接" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">总课程数</label>
            <Input v-model="studyForm.totalLesson" placeholder="总课程数" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">当前第几课</label>
            <Input v-model="studyForm.lesson" placeholder="当前第几课" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">进度</label>
            <div style="display:flex;align-items:center;gap:8px;justify-content:center;background:var(--bg-content);border:2px solid var(--border);border-radius:50px;height:44px;padding:0 16px;">
              <span style="font-weight:800;color:var(--text);">{{ computedVideoProgress }}</span>
              <span style="font-size:13px;color:var(--text-secondary);">%</span>
            </div>
          </div>
        </template>

        <template v-else-if="studyForm.type === 'book'">
          <div class="form-field">
            <label class="form-field-label">第几章</label>
            <Input v-model="studyForm.chapter" placeholder="第几章" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">总章节数</label>
            <Input v-model="studyForm.totalChapter" placeholder="总章节数" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">当前页</label>
            <Input v-model="studyForm.page" placeholder="当前页" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">总页数</label>
            <Input v-model="studyForm.totalPage" placeholder="总页数" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">进度</label>
            <div style="display:flex;align-items:center;gap:8px;justify-content:center;background:var(--bg-content);border:2px solid var(--border);border-radius:50px;height:44px;padding:0 16px;">
              <span style="font-weight:800;color:var(--text);">{{ computedBookProgress }}</span>
              <span style="font-size:13px;color:var(--text-secondary);">%</span>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="form-field">
            <label class="form-field-label">进度</label>
            <Input v-model="studyForm.progress" placeholder="进度 0-100" style="width:100%;">
              <template #suffix>%</template>
            </Input>
          </div>
          <div class="form-field">
            <label class="form-field-label">备注</label>
            <Input v-model="studyForm.notes" placeholder="备注，例如练习目标" style="width:100%;" />
          </div>
        </template>
      </div>
      <template #footer>
        <div style="display:flex;justify-content:flex-end;gap:12px;">
          <Button type="primary" size="middle" @click="studyModalOpen = false">取消</Button>
          <Button type="primary" size="middle" @click="submitStudy">添加</Button>
        </div>
      </template>
    </Modal>

    <Modal
      v-model:open="editStudyModalOpen"
      title="更新进度"
      :typewriter="false"
      :show-footer="true"
    >
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="form-field">
          <label class="form-field-label">项目名称</label>
          <div style="font-weight:700;color:var(--text);">{{ editStudyTarget?.name }}</div>
        </div>

        <template v-if="editStudyTarget?.type === 'video'">
          <div class="form-field">
            <label class="form-field-label">总课程数</label>
            <Input v-model="editVideoTotalLesson" placeholder="总课程数" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">当前第几课</label>
            <Input v-model="editVideoLesson" placeholder="当前第几课" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">进度</label>
            <div style="display:flex;align-items:center;gap:8px;justify-content:center;background:var(--bg-content);border:2px solid var(--border);border-radius:50px;height:44px;padding:0 16px;">
              <span style="font-weight:800;color:var(--text);">{{ Math.min(100, Math.round((Number(editVideoLesson)||0) / (Number(editVideoTotalLesson)||1) * 100)) }}</span>
              <span style="font-size:13px;color:var(--text-secondary);">%</span>
            </div>
          </div>
        </template>

        <div v-else-if="editStudyTarget?.type !== 'book'" class="form-field">
          <label class="form-field-label">进度</label>
          <Input v-model="editProgress" placeholder="进度 0-100" style="width:100%;">
            <template #suffix>%</template>
          </Input>
        </div>

        <template v-else>
          <div class="form-field">
            <label class="form-field-label">第几章</label>
            <Input v-model="editBookChapter" placeholder="第几章" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">总章节数</label>
            <Input v-model="editBookTotalChapter" placeholder="总章节数" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">当前页</label>
            <Input v-model="editBookPage" placeholder="当前页" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">总页数</label>
            <Input v-model="editBookTotalPage" placeholder="总页数" style="width:100%;" />
          </div>
          <div class="form-field">
            <label class="form-field-label">进度</label>
            <div style="display:flex;align-items:center;gap:8px;justify-content:center;background:var(--bg-content);border:2px solid var(--border);border-radius:50px;height:44px;padding:0 16px;">
              <span style="font-weight:800;color:var(--text);">{{ Math.min(100, Math.round((Number(editBookPage)||0) / (Number(editBookTotalPage)||1) * 100)) }}</span>
              <span style="font-size:13px;color:var(--text-secondary);">%</span>
            </div>
          </div>
        </template>
      </div>
      <template #footer>
        <div style="display:flex;justify-content:flex-end;gap:12px;">
          <Button type="primary" size="middle" @click="editStudyModalOpen = false">取消</Button>
          <Button type="primary" size="middle" @click="submitEditStudy">保存</Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
:deep(.study-row-dragging) {
  opacity: 0.5;
}
:deep(.study-row-drag-over) {
  background: rgba(25, 200, 185, 0.18) !important;
}
</style>
