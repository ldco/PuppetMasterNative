import { describe, expect, it } from 'vitest'

import {
  cloneExportFilterDraft,
  createEmptyExportFilterDraft,
  summarizeExportFilters,
  validateExportDateFilters
} from '@/app/(admin)/logs.exportFilters'

describe('admin logs export filter helpers', () => {
  it('returns null summary when no filters are active', () => {
    expect(summarizeExportFilters(createEmptyExportFilterDraft())).toBeNull()
  })

  it('builds a readable summary from active filters', () => {
    const summary = summarizeExportFilters({
      query: '  queue lag  ',
      from: '2026-02-24T00:00:00.000Z',
      to: '2026-02-24T23:59:59.999Z',
      levels: ['warning', 'error']
    })

    expect(summary).toBe(
      'Query: "queue lag" • Levels: warning, error • From: 2026-02-24T00:00:00.000Z • To: 2026-02-24T23:59:59.999Z'
    )
  })

  it('clones export filter drafts so retry snapshots are isolated from later edits', () => {
    const draft = {
      query: 'auth',
      from: '2026-02-24T00:00:00.000Z',
      to: '2026-02-24T23:59:59.999Z',
      levels: ['error'] as const
    }

    const snapshot = cloneExportFilterDraft(draft)
    snapshot.levels.push('warning')

    expect(draft.levels).toEqual(['error'])
    expect(snapshot.levels).toEqual(['error', 'warning'])
  })

  it('reports invalid from/to timestamp values', () => {
    const result = validateExportDateFilters({
      query: '',
      from: '2026-02-24',
      to: 'bad-date',
      levels: []
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual({
      from: 'Use RFC3339 with timezone, e.g. 2026-02-24T00:00:00.000Z or 2026-02-23T19:00:00-05:00',
      to: 'Use RFC3339 with timezone, e.g. 2026-02-24T23:59:59.999Z or 2026-02-24T18:59:59-05:00',
      range: null
    })
    expect(result.normalized).toEqual({
      from: null,
      to: null
    })
  })

  it('rejects ranges where from is later than to', () => {
    const result = validateExportDateFilters({
      query: '',
      from: '2026-02-24T23:59:59.999Z',
      to: '2026-02-24T00:00:00.000Z',
      levels: []
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual({
      from: null,
      to: null,
      range: '"From" must be earlier than or equal to "To".'
    })
    expect(result.normalized).toEqual({
      from: '2026-02-24T23:59:59.999Z',
      to: '2026-02-24T00:00:00.000Z'
    })
  })

  it('accepts empty dates and valid ISO bounds', () => {
    const noDateResult = validateExportDateFilters({
      query: 'auth',
      from: '',
      to: '',
      levels: ['audit']
    })
    expect(noDateResult.isValid).toBe(true)
    expect(noDateResult.errors).toEqual({
      from: null,
      to: null,
      range: null
    })
    expect(noDateResult.normalized).toEqual({
      from: null,
      to: null
    })

    const validRangeResult = validateExportDateFilters({
      query: '',
      from: '2026-02-24T00:00:00.000Z',
      to: '2026-02-24T23:59:59.999Z',
      levels: []
    })
    expect(validRangeResult.isValid).toBe(true)
    expect(validRangeResult.errors).toEqual({
      from: null,
      to: null,
      range: null
    })
    expect(validRangeResult.normalized).toEqual({
      from: '2026-02-24T00:00:00.000Z',
      to: '2026-02-24T23:59:59.999Z'
    })
  })

  it('rejects timestamps without timezone', () => {
    const result = validateExportDateFilters({
      query: '',
      from: '2026-02-24T00:00:00',
      to: '2026-02-24T23:59:59',
      levels: []
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.from).toContain('Use RFC3339 with timezone')
    expect(result.errors.to).toContain('Use RFC3339 with timezone')
    expect(result.normalized).toEqual({
      from: null,
      to: null
    })
  })

  it('accepts timezone offsets and normalizes them to UTC', () => {
    const result = validateExportDateFilters({
      query: '',
      from: '2026-02-23T19:00:00-05:00',
      to: '2026-02-24T18:59:59-05:00',
      levels: ['warning']
    })

    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({
      from: null,
      to: null,
      range: null
    })
    expect(result.normalized).toEqual({
      from: '2026-02-24T00:00:00.000Z',
      to: '2026-02-24T23:59:59.000Z'
    })
  })
})
