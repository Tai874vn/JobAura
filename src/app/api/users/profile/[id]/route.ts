import { NextResponse, type NextRequest } from 'next/server'

const backendBaseUrl = process.env.BACKEND_API_BASE_URL ?? 'http://localhost:3000'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookie = request.headers.get('cookie')

  try {
    const response = await fetch(`${backendBaseUrl}/api/users/profile/${id}`, {
      headers: cookie ? { cookie } : undefined,
      cache: 'no-store',
    })
    const contentType = response.headers.get('content-type') ?? ''
    const body = await response.text()

    return new NextResponse(body, {
      status: response.status,
      headers: contentType ? { 'content-type': contentType } : undefined,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Unable to reach backend profile endpoint',
      },
      { status: 502 }
    )
  }
}
