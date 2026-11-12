const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080/api'

export type HealthResponse = { status: string }

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/health`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<HealthResponse>
}

export { API_URL }
