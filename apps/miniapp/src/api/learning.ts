import type {
  SubmitWritingInput,
  UserWordDto,
  WritingResultDto,
} from '@englis-vocabulary/shared'
import { request } from './request'

/** 提交一次拼写测试。后端判断是否为有效掌握尝试、7 天间隔、连续 3 次 */
export function submitWriting(input: SubmitWritingInput): Promise<WritingResultDto> {
  return request<WritingResultDto, SubmitWritingInput>({
    url: '/learning/writing',
    method: 'POST',
    data: input,
  })
}

export function getUserWords(userId: string): Promise<UserWordDto[]> {
  return request<UserWordDto[]>({
    url: `/learning/words?userId=${encodeURIComponent(userId)}`,
  })
}

export function getDueReviews(userId: string): Promise<UserWordDto[]> {
  return request<UserWordDto[]>({
    url: `/learning/due?userId=${encodeURIComponent(userId)}`,
  })
}

/** 主动标记遗忘：状态回退 learning，重新进入三次正确书写流程 */
export function markForgotten(userId: string, wordSenseId: string): Promise<UserWordDto> {
  return request<UserWordDto>({
    url: `/learning/words/${encodeURIComponent(wordSenseId)}/forgot?userId=${encodeURIComponent(userId)}`,
    method: 'PUT',
  })
}
