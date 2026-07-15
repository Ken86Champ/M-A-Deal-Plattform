'use client'
import { useState, useEffect } from 'react'
import { DEALS as MOCK_DEALS, type Deal } from './mock-data'

// Falls die API keine Daten zurückgibt (Pipeline noch nicht gelaufen),
// fallen wir transparent auf Mock-Daten zurück.

let _cache: Deal[] | null = null
let _promise: Promise<Deal[]> | null = null

async function fetchDeals(): Promise<Deal[]> {
  if (_cache) return _cache
  if (_promise) return _promise

  _promise = fetch('/api/deals')
    .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
    .then((data: Deal[]) => {
      if (data.length > 0) {
        _cache = data
        return data
      }
      // API liefert leer → Fallback auf Mock
      _cache = MOCK_DEALS
      return MOCK_DEALS
    })
    .catch(() => {
      _cache = MOCK_DEALS
      return MOCK_DEALS
    })

  return _promise
}

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>(_cache ?? [])
  const [loading, setLoading] = useState(!_cache)
  const [source, setSource] = useState<'live' | 'mock'>('live')

  useEffect(() => {
    if (_cache) {
      setDeals(_cache)
      setLoading(false)
      return
    }
    fetchDeals().then(d => {
      setDeals(d)
      setSource(d === MOCK_DEALS ? 'mock' : 'live')
      setLoading(false)
    })
  }, [])

  function invalidate() {
    _cache = null
    _promise = null
    setLoading(true)
    fetchDeals().then(d => {
      setDeals(d)
      setLoading(false)
    })
  }

  return { deals, loading, source, invalidate }
}
