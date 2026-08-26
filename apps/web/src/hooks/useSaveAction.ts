import { useState } from 'react'
import { apiErrorMessage } from '../services/api-client'

export interface SaveState {
  saving: boolean
  /** Set only after the server confirmed the write. */
  success?: string
  error?: string
}

/**
 * Runs a save and reports what actually happened. Success is announced only after the
 * promise resolves, so a rejected request can never be shown to the user as "Đã lưu".
 */
export function useSaveAction() {
  const [state, setState] = useState<SaveState>({ saving: false })

  const runSave = async <T,>(value: T, successMessage: string, save: (value: T) => Promise<unknown> | unknown) => {
    setState({ saving: true })
    try {
      await save(value)
      setState({ saving: false, success: successMessage })
      return true
    } catch (failure) {
      setState({ saving: false, error: apiErrorMessage(failure) })
      return false
    }
  }

  const reset = () => setState({ saving: false })
  return { ...state, runSave, reset }
}
