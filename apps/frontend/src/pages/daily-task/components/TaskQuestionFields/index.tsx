import type {
  DailyTaskAnswerValue,
  DailyTaskDetail,
  DailyTaskQuestion
} from '@shared/contracts/daily-task';
import { Input, Text, Textarea, View } from '@tarojs/components';

import type { DailyTaskDraft } from '../../task-form-state';

import './index.scss';

/** 任务问题控件的状态参数。 */
interface TaskQuestionFieldsProps {
  task: DailyTaskDetail;
  draft: DailyTaskDraft;
  onChange: (draft: DailyTaskDraft) => void;
}

/** 判断多选答案中是否已经包含指定选项。 */
function includesOption(value: DailyTaskAnswerValue | undefined, option: string): boolean {
  return Array.isArray(value) && value.includes(option);
}

/** 根据问题类型渲染稳定、可恢复的结构化输入控件。 */
export function TaskQuestionFields({ task, draft, onChange }: TaskQuestionFieldsProps) {
  /** 更新普通答案并保持草稿其他字段不变。 */
  function updateAnswer(questionId: string, value: DailyTaskAnswerValue) {
    onChange({ ...draft, answers: { ...draft.answers, [questionId]: value } });
  }

  /** 更新测量值并过滤无法转成有限数字的输入。 */
  function updateMeasurement(questionId: string, rawValue: string) {
    const value = Number(rawValue);
    const measurementValues = { ...draft.measurementValues };
    if (rawValue.trim() && Number.isFinite(value)) measurementValues[questionId] = value;
    else delete measurementValues[questionId];
    onChange({ ...draft, measurementValues });
  }

  /** 切换多选答案中的单个稳定选项值。 */
  function toggleMultiple(question: DailyTaskQuestion, optionValue: string) {
    const current = draft.answers[question.id];
    const values = Array.isArray(current) ? current : [];
    updateAnswer(
      question.id,
      values.includes(optionValue)
        ? values.filter((value) => value !== optionValue)
        : [...values, optionValue]
    );
  }

  return (
    <View className="daily-task-question-fields">
      {task.questions.map((question) => {
        if (question.kind === 'NUMBER') {
          const value = draft.measurementValues[question.id];
          return (
            <View key={question.id} className="daily-task-question-fields__group">
              <Text className="daily-task-question-fields__label">{question.label}</Text>
              <View className="daily-task-question-fields__number-row">
                <Input
                  className="daily-task-question-fields__number"
                  type="digit"
                  value={value === undefined ? '' : String(value)}
                  placeholder="填写实际数值"
                  onInput={(event) => updateMeasurement(question.id, event.detail.value)}
                />
                {question.unit && (
                  <Text className="daily-task-question-fields__unit">{question.unit}</Text>
                )}
              </View>
            </View>
          );
        }

        if (question.kind === 'SHORT_TEXT') {
          return (
            <View key={question.id} className="daily-task-question-fields__group">
              <Text className="daily-task-question-fields__label">{question.label}</Text>
              <Textarea
                className="daily-task-question-fields__textarea"
                value={String(draft.answers[question.id] ?? '')}
                maxlength={500}
                placeholder="写下今天真实发生的一件小事"
                onInput={(event) => updateAnswer(question.id, event.detail.value)}
              />
            </View>
          );
        }

        return (
          <View key={question.id} className="daily-task-question-fields__group">
            <Text className="daily-task-question-fields__label">{question.label}</Text>
            <View className="daily-task-question-fields__options">
              {(question.options ?? []).map((option) => {
                const selected = question.kind === 'MULTIPLE_CHOICE'
                  ? includesOption(draft.answers[question.id], option.value)
                  : draft.answers[question.id] === option.value;
                return (
                  <View
                    key={option.value}
                    className={`daily-task-question-fields__option${selected ? ' daily-task-question-fields__option--selected' : ''}`}
                    hoverClass="daily-task-question-fields__option--active"
                    onClick={() => {
                      if (question.kind === 'MULTIPLE_CHOICE') {
                        toggleMultiple(question, option.value);
                      } else {
                        updateAnswer(question.id, option.value);
                      }
                    }}
                  >
                    <View className="daily-task-question-fields__choice" />
                    <Text>{option.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
