import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const PORT = 3000
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

const app = express()
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'] }))
app.use(express.json({ limit: '20mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', server: 'proxy', port: PORT, hasKey: !!ANTHROPIC_API_KEY })
})

app.post('/api/proxy/messages', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    res.status(500).json({ error: { message: 'Server API key not configured. Set ANTHROPIC_API_KEY in servers/.env' } })
    return
  }
  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': (req.headers['anthropic-version'] as string) ?? '2023-06-01',
        'anthropic-beta': (req.headers['anthropic-beta'] as string) ?? 'mcp-client-2025-04-04',
      },
      body: JSON.stringify(req.body),
    })
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (e) {
    res.status(500).json({ error: { message: String(e) } })
  }
})

app.listen(PORT, () => {
  console.log(`✅ [proxy] API proxy running → http://localhost:${PORT}`)
  if (!ANTHROPIC_API_KEY) {
    console.warn('⚠  ANTHROPIC_API_KEY not set in servers/.env — proxy will return 500 on requests')
  }
})
