import type {
  DailyTasksResultDto,
  UserLevelDto,
  UserStageDto,
} from '@englis-vocabulary/shared'
import { request } from './request'

export function getDailyTasks(userId: string, date?: string): Promise<DailyTasksResultDto> {
  const query = date ? `&date=${encodeURIComponent(date)}` : ''
  return request<DailyTasksResultDto>({
    url: `/progress/daily-tasks?userId=${encodeURIComponent(userId)}${query}`,
  })
}

export function completeDailyTask(
  userId: string,
  taskId: string,
  date?: string,
): Promise<DailyTasksResultDto> {
  const query = date ? `&date=${encodeURIComponent(date)}` : ''
  return request<DailyTasksResultDto>({
    url: `/progress/daily-tasks/${encodeURIComponent(taskId)}/complete?userId=${encodeURIComponent(userId)}${query}`,
    method: 'POST',
  })
}

export function getUserStages(userId: string): Promise<UserStageDto[]> {
  return request<UserStageDto[]>({
    url: `/progress/stages?userId=${encodeURIComponent(userId)}`,
  })
}

export function getUserLevels(userId: string): Promise<UserLevelDto[]> {
  return request<UserLevelDto[]>({
    url: `/progress/levels?userId=${encodeURIComponent(userId)}`,
  })
}
