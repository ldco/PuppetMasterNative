import type { AdminLogLevel } from '@/services/admin.service'

export const EXPORT_FILTER_LEVELS: readonly Exclude<AdminLogLevel, 'unknown'>[] = [
  'debug',
  'info',
  'warning',
  'error',
  'audit'
]

export interface ExportFilterDraft {
  query: string
  from: string
  to: string
  levels: Exclude<AdminLogLevel, 'unknown'>[]
}

export interface ExportFilterValidationState {
  from: string | null
  to: string | null
  range: string | null
}

export interface NormalizedExportDateFilters {
  from: string | null
  to: string | null
}

export const createEmptyExportFilterDraft = (): ExportFilterDraft => ({
  query: '',
  from: '',
  to: '',
  levels: []
})

export const cloneExportFilterDraft = (draft: ExportFilterDraft): ExportFilterDraft => ({
  query: draft.query,
  from: draft.from,
  to: draft.to,
  levels: [...draft.levels]
})

export const summarizeExportFilters = (draft: ExportFilterDraft): string | null => {
  const summary = [
    draft.query.trim() ? `Query: "${draft.query.trim()}"` : null,
    draft.levels.length > 0 ? `Levels: ${draft.levels.join(', ')}` : null,
    draft.from.trim() ? `From: ${draft.from.trim()}` : null,
    draft.to.trim() ? `To: ${draft.to.trim()}` : null
  ]
    .filter(Boolean)
    .join(' • ')

  return summary.length > 0 ? summary : null
}

export const emptyExportFilterValidationState = (): ExportFilterValidationState => ({
  from: null,
  to: null,
  range: null
})

const RFC3339_TIMESTAMP_WITH_TIMEZONE_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+\-]\d{2}:\d{2})$/

const isValidRfc3339TimestampWithTimezone = (value: string): boolean => {
  if (!RFC3339_TIMESTAMP_WITH_TIMEZONE_PATTERN.test(value)) {
    return false
  }

  return Number.isFinite(Date.parse(value))
}

const normalizeTimestampToUtc = (value: string): string => {
  return new Date(value).toISOString()
}

export const validateExportDateFilters = (
  draft: ExportFilterDraft
): {
  isValid: boolean
  errors: ExportFilterValidationState
  normalized: NormalizedExportDateFilters
} => {
  const errors = emptyExportFilterValidationState()
  const trimmedFrom = draft.from.trim()
  const trimmedTo = draft.to.trim()
  let normalizedFrom: string | null = null
  let normalizedTo: string | null = null

  if (trimmedFrom && !isValidRfc3339TimestampWithTimezone(trimmedFrom)) {
    errors.from =
      'Use RFC3339 with timezone, e.g. 2026-02-24T00:00:00.000Z or 2026-02-23T19:00:00-05:00'
  } else if (trimmedFrom) {
    normalizedFrom = normalizeTimestampToUtc(trimmedFrom)
  }

  if (trimmedTo && !isValidRfc3339TimestampWithTimezone(trimmedTo)) {
    errors.to =
      'Use RFC3339 with timezone, e.g. 2026-02-24T23:59:59.999Z or 2026-02-24T18:59:59-05:00'
  } else if (trimmedTo) {
    normalizedTo = normalizeTimestampToUtc(trimmedTo)
  }

  if (!errors.from && !errors.to && normalizedFrom && normalizedTo) {
    const fromTime = Date.parse(normalizedFrom)
    const toTime = Date.parse(normalizedTo)
    if (fromTime > toTime) {
      errors.range = '"From" must be earlier than or equal to "To".'
    }
  }

  return {
    isValid: !errors.from && !errors.to && !errors.range,
    errors,
    normalized: {
      from: normalizedFrom,
      to: normalizedTo
    }
  }
}
