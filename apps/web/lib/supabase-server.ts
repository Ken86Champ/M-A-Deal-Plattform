import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Server Component / Route Handler client (reads cookies, no write). */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // In Server Components cookies can't be mutated (only in Middleware / Route Handlers)
        }
      },
    },
  })
}

/** Middleware client — needs request + response to mutate cookies. */
export function createSupabaseMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(url, anon, {
    cookies: {
      getAll:  () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })
}
