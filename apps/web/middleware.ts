import { NextRequest, NextResponse } from 'next/server'

// Auth guard disabled for MVP — re-enable when RLS + multi-tenant is ready
export function middleware(request: NextRequest) {
  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
