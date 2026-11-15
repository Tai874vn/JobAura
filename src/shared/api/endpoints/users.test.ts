import { afterEach, describe, expect, it } from 'vitest'
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { apiClient } from '../client'
import { usersApi } from './users'

const originalAdapter = apiClient.defaults.adapter

function failWith(status: number): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig) => {
    throw new AxiosError('Request failed', String(status), config, null, {
      data: { message: 'failed' }, status, statusText: '', headers: {}, config,
    })
  }
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

describe('usersApi.myResume', () => {
  it('treats 404 as "no resume yet" so a new candidate gets the empty form', async () => {
    apiClient.defaults.adapter = failWith(404)

    await expect(usersApi.myResume()).resolves.toEqual({ message: 'No resume yet', content: null })
  })

  it('still reports other failures', async () => {
    apiClient.defaults.adapter = failWith(500)

    await expect(usersApi.myResume()).rejects.toBeInstanceOf(AxiosError)
  })
})
