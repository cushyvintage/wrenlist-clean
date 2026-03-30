import { NextResponse } from 'next/server'

/**
 * Standardized API response format
 */
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
  status: number
}

/**
 * Helper class for consistent API responses
 */
export class ApiResponseHelper {
  static success<T>(data: T, status: number = 200): NextResponse<{ data: T }> {
    return NextResponse.json({ data }, { status })
  }

  static created<T>(data: T): NextResponse<{ data: T }> {
    return NextResponse.json({ data }, { status: 201 })
  }

  static error(message: string, status: number = 400): NextResponse<{ error: string }> {
    return NextResponse.json({ error: message }, { status })
  }

  static notFound(message: string = 'Not found'): NextResponse<{ error: string }> {
    return NextResponse.json({ error: message }, { status: 404 })
  }

  static unauthorized(): NextResponse<{ error: string }> {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  static internalError(message: string = 'Internal server error'): NextResponse<{ error: string }> {
    return NextResponse.json({ error: message }, { status: 500 })
  }

  static badRequest(message: string): NextResponse<{ error: string }> {
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
