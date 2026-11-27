/**
 * Provides low-level helpers that safely read typed fields (strings, numbers, booleans, arrays, roles, and user objects) from raw backend JSON and map `ApiResponse` wrappers.
 *
 * Calls: isAccountRole
 * Used by:
 *   - shared/api/normalizers.ts
 *   - shared/api/normalizers/marketplace/hiring.ts
 *   - shared/api/normalizers/marketplace/jobs.ts
 *   - shared/api/normalizers/marketplace/recommendations.ts
 *   - shared/api/normalizers/social.ts
 */

import type { ApiResponse, Job } from '@/shared/schemas'
import { isAccountRole } from '@/shared/lib/roles'

export type ApiRecord = Record<string, unknown>;

export function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" ? (value as ApiRecord) : {};
}

export function pickString(record: ApiRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

export function pickNumber(record: ApiRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") return value;
  }
  return undefined;
}

export function pickStringArray(record: ApiRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
  }
  return [];
}

export function pickBoolean(record: ApiRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

export function pickRole(record: ApiRecord) {
  const role = pickString(record, "role");
  return isAccountRole(role) ? role : "user";
}

export function pickUser(
  record: ApiRecord,
  ...keys: string[]
): Job["user"] | undefined {
  for (const key of keys) {
    const value = record[key];
    if (value && typeof value === "object") return value as Job["user"];
  }
  return undefined;
}

export function mapApiResponse<T, U>(
  response: ApiResponse<T>,
  mapper: (content: T) => U,
): ApiResponse<U> {
  const { content, ...meta } = response
  return content === undefined ? meta : { ...meta, content: mapper(content) }
}
