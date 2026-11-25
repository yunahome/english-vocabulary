import type { CreateWordInput, WordDto } from '@englis-vocabulary/shared'
import { request } from './request'

export function listWords(): Promise<WordDto[]> {
  return request<WordDto[]>({ url: '/words' })
}

export function createWord(input: CreateWordInput): Promise<WordDto> {
  return request<WordDto, CreateWordInput>({
    url: '/words',
    method: 'POST',
    data: input,
  })
}
