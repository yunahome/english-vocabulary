import type {
  LevelLearningItemDto,
  StageDto,
  WordWithSensesDto,
} from '@englis-vocabulary/shared'
import { request } from './request'

/** 课程树 Stage → Unit → Level */
export function getStages(): Promise<StageDto[]> {
  return request<StageDto[]>({ url: '/catalog/stages' })
}

/** 某关卡的学习项（词义 + 单词图片/音标/发音），驱动 New Word / Writing 页 */
export function getLevelWords(levelId: string): Promise<LevelLearningItemDto[]> {
  return request<LevelLearningItemDto[]>({
    url: `/catalog/levels/${encodeURIComponent(levelId)}/words`,
  })
}

/** 全部单词（带 senses），用于把 wordSenseId 反查成可展示的词义 */
export function getCatalogWords(): Promise<WordWithSensesDto[]> {
  return request<WordWithSensesDto[]>({ url: '/catalog/words' })
}
