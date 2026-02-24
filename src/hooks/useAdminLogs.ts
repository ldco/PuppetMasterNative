import { useCallback, useEffect, useRef, useState } from 'react'

import type { AdminProviderCapabilities } from '@/services/admin.provider.types'
import {
  adminService,
  type AdminExportLogsResult,
  type AdminLogEntry,
  type AdminLogExportFilters,
  type AdminLogExportJobResult,
  type AdminLogExportFormat
} from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'

interface AdminLogMutationState {
  isAcknowledging: boolean
  isResolving: boolean
  isRetrying: boolean
  error: string | null
}

interface UseAdminLogsResult {
  logs: AdminLogEntry[]
  isLoading: boolean
  isRefreshing: boolean
  isClearing: boolean
  isExporting: boolean
  isCheckingExportJob: boolean
  error: string | null
  clearError: string | null
  exportError: string | null
  exportJobError: string | null
  logMutations: Record<string, AdminLogMutationState | undefined>
  hasActiveLogMutation: boolean
  source: 'remote' | 'local-fallback'
  sourceDetail: string
  lastExport: AdminExportLogsResult | null
  lastExportJob: AdminLogExportJobResult | null
  capability: AdminProviderCapabilities
  refresh: () => Promise<void>
  clear: () => Promise<number | null>
  exportLogs: (
    format?: AdminLogExportFormat,
    filters?: AdminLogExportFilters
  ) => Promise<AdminExportLogsResult | null>
  checkExportJob: (jobId?: string) => Promise<AdminLogExportJobResult | null>
  acknowledge: (logId: string) => Promise<void>
  resolve: (logId: string) => Promise<void>
  retry: (logId: string) => Promise<void>
  clearLogMutationError: (logId: string) => void
  clearExportError: () => void
  clearExportJobError: () => void
}

export const useAdminLogs = (limit = 50): UseAdminLogsResult => {
  const activeUser = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.token)
  const [logs, setLogs] = useState<AdminLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(activeUser))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isCheckingExportJob, setIsCheckingExportJob] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clearError, setClearError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportJobError, setExportJobError] = useState<string | null>(null)
  const [logMutations, setLogMutations] = useState<Record<string, AdminLogMutationState | undefined>>({})
  const [source, setSource] = useState<'remote' | 'local-fallback'>('local-fallback')
  const [sourceDetail, setSourceDetail] = useState('Not loaded yet')
  const [lastExport, setLastExport] = useState<AdminExportLogsResult | null>(null)
  const [lastExportJob, setLastExportJob] = useState<AdminLogExportJobResult | null>(null)
  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)
  const logMutationsRef = useRef<Record<string, AdminLogMutationState | undefined>>({})
  const capability = adminService.getCapabilities()
  const hasActiveLogMutation = Object.values(logMutations).some(
    (state) => state?.isAcknowledging || state?.isResolving || state?.isRetrying
  )

  const setLogMutationState = useCallback((logId: string, next: Partial<AdminLogMutationState>) => {
    setLogMutations((prev) => {
      const nextMap = {
        ...prev,
        [logId]: {
          isAcknowledging: prev[logId]?.isAcknowledging ?? false,
          isResolving: prev[logId]?.isResolving ?? false,
          isRetrying: prev[logId]?.isRetrying ?? false,
          error: prev[logId]?.error ?? null,
          ...next
        }
      }
      logMutationsRef.current = nextMap
      return nextMap
    })
  }, [])

  const clearLogMutationError = useCallback((logId: string) => {
    setLogMutationState(logId, { error: null })
  }, [setLogMutationState])

  const clearExportError = useCallback(() => {
    setExportError(null)
  }, [])

  const clearExportJobError = useCallback(() => {
    setExportJobError(null)
  }, [])

  const applyLogMutationResult = useCallback(
    (
      logId: string,
      result: { log: AdminLogEntry; source: 'remote'; sourceDetail: string }
    ) => {
      setLogs((prev) => prev.map((entry) => (entry.id === logId ? { ...entry, ...result.log } : entry)))
      setSource(result.source)
      setSourceDetail(result.sourceDetail)
    },
    []
  )

  const isLogMutationBusy = useCallback((logId: string) => {
    const mutationState = logMutationsRef.current[logId]
    return Boolean(
      mutationState?.isAcknowledging || mutationState?.isResolving || mutationState?.isRetrying
    )
  }, [])

  const hasAnyLogMutationBusy = useCallback(() => {
    return Object.values(logMutationsRef.current).some(
      (state) => state?.isAcknowledging || state?.isResolving || state?.isRetrying
    )
  }, [])

  const runLogMutation = useCallback(
    async (
      logId: string,
      key: 'isAcknowledging' | 'isResolving' | 'isRetrying',
      fallbackMessage: string,
      action: () => Promise<{ log: AdminLogEntry; source: 'remote'; sourceDetail: string }>
    ): Promise<void> => {
      if (isClearing || isRefreshing || isExporting || isCheckingExportJob) {
        return
      }

      if (isLogMutationBusy(logId)) {
        return
      }

      setError(null)
      setClearError(null)
      setExportError(null)
      setExportJobError(null)
      setLogMutationState(logId, { [key]: true, error: null })

      try {
        const result = await action()
        if (!mountedRef.current) {
          return
        }

        applyLogMutationResult(logId, result)
      } catch (error) {
        if (!mountedRef.current) {
          return
        }

        const message =
          error instanceof Error && error.message.trim().length > 0 ? error.message : fallbackMessage
        setLogMutationState(logId, { error: message })
        throw new Error(message)
      } finally {
        if (mountedRef.current) {
          setLogMutationState(logId, { [key]: false })
        }
      }
    },
    [
      applyLogMutationResult,
      isCheckingExportJob,
      isClearing,
      isExporting,
      isLogMutationBusy,
      isRefreshing,
      setLogMutationState
    ]
  )

  useEffect(() => {
    mountedRef.current = true

    setError(null)
    setClearError(null)
    setExportError(null)
    setExportJobError(null)
    setLastExport(null)
    setLastExportJob(null)
    setLogMutations({})
    logMutationsRef.current = {}
    setIsLoading(true)
    const requestId = ++requestIdRef.current

    void adminService
      .getLogs({ activeUser, accessToken, limit })
      .then((result) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return
        }

        setLogs(result.logs)
        setSource(result.source)
        setSourceDetail(result.sourceDetail)
        setIsLoading(false)
      })
      .catch(() => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return
        }

        setLogs([])
        setError('Failed to load admin logs.')
        setClearError(null)
        setExportError(null)
        setExportJobError(null)
        setLastExport(null)
        setLastExportJob(null)
        setLogMutations({})
        logMutationsRef.current = {}
        setSource('local-fallback')
        setSourceDetail('Provider request failed')
        setIsLoading(false)
      })

    return () => {
      mountedRef.current = false
    }
  }, [accessToken, activeUser, limit])

  const refresh = useCallback(async (): Promise<void> => {
    if (isRefreshing || isClearing || isExporting || isCheckingExportJob || hasAnyLogMutationBusy()) {
      return
    }

    setError(null)
    setClearError(null)
    setExportError(null)
    setExportJobError(null)
    setIsRefreshing(true)
    const requestId = ++requestIdRef.current

    try {
      const result = await adminService.refreshLogs({ activeUser, accessToken, limit })
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setLogs(result.logs)
      setSource(result.source)
      setSourceDetail(result.sourceDetail)
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setError('Failed to refresh admin logs.')
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsRefreshing(false)
      }
    }
  }, [
    accessToken,
    activeUser,
    hasAnyLogMutationBusy,
    isCheckingExportJob,
    isClearing,
    isExporting,
    isRefreshing,
    limit
  ])

  const clear = useCallback(async (): Promise<number | null> => {
    if (isClearing || isRefreshing || isExporting || isCheckingExportJob || hasAnyLogMutationBusy()) {
      return null
    }

    setError(null)
    setClearError(null)
    setExportError(null)
    setExportJobError(null)
    setIsClearing(true)
    const requestId = ++requestIdRef.current

    try {
      const result = await adminService.clearLogs({ activeUser, accessToken })
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return result.clearedCount
      }

      setLogs([])
      setLogMutations({})
      logMutationsRef.current = {}
      setSource(result.source)
      setSourceDetail(result.sourceDetail)
      return result.clearedCount
    } catch (error) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return null
      }

      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Failed to clear admin logs.'
      setClearError(message)
      throw new Error(message)
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsClearing(false)
      }
    }
  }, [
    accessToken,
    activeUser,
    hasAnyLogMutationBusy,
    isCheckingExportJob,
    isClearing,
    isExporting,
    isRefreshing
  ])

  const exportLogs = useCallback(
    async (
      format?: AdminLogExportFormat,
      filters?: AdminLogExportFilters
    ): Promise<AdminExportLogsResult | null> => {
      if (isExporting || isCheckingExportJob || isRefreshing || isClearing || hasAnyLogMutationBusy()) {
        return null
      }

      setError(null)
      setClearError(null)
      setExportError(null)
      setExportJobError(null)
      setLastExportJob(null)
      setIsExporting(true)

      try {
        const result = await adminService.exportLogs({
          activeUser,
          accessToken,
          limit,
          format,
          ...filters
        })
        if (!mountedRef.current) {
          return result
        }

        setLastExport(result)
        return result
      } catch (error) {
        if (!mountedRef.current) {
          return null
        }

        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : 'Failed to export admin logs.'
        setExportError(message)
        throw new Error(message)
      } finally {
        if (mountedRef.current) {
          setIsExporting(false)
        }
      }
    },
    [
      accessToken,
      activeUser,
      hasAnyLogMutationBusy,
      isCheckingExportJob,
      isClearing,
      isExporting,
      isRefreshing,
      limit
    ]
  )

  const checkExportJob = useCallback(
    async (jobId?: string): Promise<AdminLogExportJobResult | null> => {
      const targetJobId = (jobId ?? lastExport?.jobId ?? '').trim()
      if (!targetJobId) {
        return null
      }

      if (isCheckingExportJob || isExporting || isRefreshing || isClearing || hasAnyLogMutationBusy()) {
        return null
      }

      setError(null)
      setClearError(null)
      setExportError(null)
      setExportJobError(null)
      setIsCheckingExportJob(true)

      try {
        const result = await adminService.getLogExportJob({
          activeUser,
          accessToken,
          jobId: targetJobId
        })
        if (!mountedRef.current) {
          return result
        }

        setLastExportJob(result)
        setLastExport((prev) =>
          prev && prev.jobId === result.jobId
            ? {
                ...prev,
                url: result.url ?? prev.url,
                format: result.format ?? prev.format
              }
            : prev
        )
        return result
      } catch (error) {
        if (!mountedRef.current) {
          return null
        }

        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : 'Failed to check export job status.'
        setExportJobError(message)
        throw new Error(message)
      } finally {
        if (mountedRef.current) {
          setIsCheckingExportJob(false)
        }
      }
    },
    [
      accessToken,
      activeUser,
      hasAnyLogMutationBusy,
      isCheckingExportJob,
      isClearing,
      isExporting,
      isRefreshing,
      lastExport?.jobId
    ]
  )

  const acknowledge = useCallback(async (logId: string): Promise<void> => {
    await runLogMutation(logId, 'isAcknowledging', 'Failed to acknowledge log.', () =>
      adminService.acknowledgeLog({ activeUser, accessToken, logId })
    )
  }, [accessToken, activeUser, runLogMutation])

  const resolve = useCallback(async (logId: string): Promise<void> => {
    await runLogMutation(logId, 'isResolving', 'Failed to resolve log.', () =>
      adminService.resolveLog({ activeUser, accessToken, logId })
    )
  }, [accessToken, activeUser, runLogMutation])

  const retry = useCallback(async (logId: string): Promise<void> => {
    await runLogMutation(logId, 'isRetrying', 'Failed to retry log.', () =>
      adminService.retryLog({ activeUser, accessToken, logId })
    )
  }, [accessToken, activeUser, runLogMutation])

  return {
    logs,
    isLoading,
    isRefreshing,
    isClearing,
    isExporting,
    isCheckingExportJob,
    error,
    clearError,
    exportError,
    exportJobError,
    logMutations,
    source,
    sourceDetail,
    lastExport,
    lastExportJob,
    capability,
    refresh,
    clear,
    exportLogs,
    checkExportJob,
    acknowledge,
    resolve,
    retry,
    hasActiveLogMutation,
    clearLogMutationError,
    clearExportError,
    clearExportJobError
  }
}
