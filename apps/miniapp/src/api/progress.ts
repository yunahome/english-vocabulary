import type {
  DailyTasksResultDto,
  UserLevelDto,
  UserStageDto,
} from '@englis-vocabulary/shared'
import { request } from './request'

export function getDailyTasks(date?: string): Promise<DailyTasksResultDto> {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  return request<DailyTasksResultDto>({
    url: `/progress/daily-tasks${query}`,
  })
}

export function completeDailyTask(
  taskId: string,
  date?: string,
): Promise<DailyTasksResultDto> {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  return request<DailyTasksResultDto>({
    url: `/progress/daily-tasks/${encodeURIComponent(taskId)}/complete${query}`,
    method: 'POST',
  })
}

export function getUserStages(): Promise<UserStageDto[]> {
  return request<UserStageDto[]>({
    url: '/progress/stages',
  })
}

export function getUserLevels(): Promise<UserLevelDto[]> {
  return request<UserLevelDto[]>({
    url: '/progress/levels',
  })
}
