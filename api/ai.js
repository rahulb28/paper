import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { mode, prompt, context } = req.body || {}

  try {
    if (mode === 'generate') {
      // Generate content at cursor
      const systemPrompt = context
        ? `You are a writing assistant inside a minimalist document editor called Paper. The user is writing a document. Here is context from the document so far:\n\n${context}\n\nContinue or generate based on the user's instruction. Return plain text or markdown (headings with #, bullets with -, checkboxes with - [ ], code with backticks). Keep it concise and useful. No preamble.`
        : `You are a writing assistant inside a minimalist document editor. Generate content based on the user's instruction. Return plain text or markdown. Keep it concise and useful. No preamble.`

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      })

      return res.json({ content: response.content[0].text.trim() })

    } else if (mode === 'transform') {
      // Transform selected text
      const instructions = {
        improve:   'Improve the writing quality, clarity, and flow. Keep the same length roughly.',
        shorten:   'Make this significantly shorter while keeping the key points.',
        lengthen:  'Expand this with more detail and depth.',
        formal:    'Rewrite in a more formal, professional tone.',
        casual:    'Rewrite in a more casual, conversational tone.',
        bullet:    'Convert this into a clean bullet list with - [ ] checkboxes for actionable items.',
        summarize: 'Summarize this in 1-3 sentences.',
        diagram:   'Convert this into a Mermaid diagram syntax. Return ONLY the mermaid code starting with graph TD or flowchart LR or similar. No explanation, no code fences.',
        fix:       'Fix grammar and spelling only. Keep everything else the same.',
      }

      const instruction = instructions[prompt] || prompt

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: 'You are a writing assistant. Transform the given text according to the instruction. Return ONLY the transformed text, no preamble, no explanation.',
        messages: [{
          role: 'user',
          content: `Text:\n${context}\n\nInstruction: ${instruction}`,
        }],
      })

      return res.json({ content: response.content[0].text.trim() })

    } else {
      return res.status(400).json({ error: 'Invalid mode' })
    }
  } catch (err) {
    console.error('ai error:', err)
    return res.status(500).json({ error: err.message })
  }
}
