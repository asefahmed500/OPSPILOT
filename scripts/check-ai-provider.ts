import { config } from "dotenv"
import OpenAI from "openai"

config({ path: ".env.local" })

const apiKey = process.env.AI_API_KEY || process.env.HCNSEC_API_KEY || process.env.OPENAI_API_KEY
const baseURL = process.env.AI_API_BASE_URL || "https://api.hcnsec.cn/v1"
const model = process.env.AI_MODEL || process.env.OPENAI_MODEL || "DeepSeek-V4-Flash"

if (!apiKey) {
  console.log("AI provider: missing AI_API_KEY or HCNSEC_API_KEY")
  process.exit(1)
}

const client = new OpenAI({ apiKey, baseURL })

try {
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: "Reply with exactly: ok" }],
    temperature: 0,
  })

  console.log(`AI provider: ok; baseURL=${baseURL}; model=${model}; output=${JSON.stringify(response.choices[0]?.message?.content ?? "")}`)
} catch (error) {
  console.log(`AI provider: failed; baseURL=${baseURL}; model=${model}; ${error instanceof Error ? error.message : "unknown error"}`)
  process.exit(1)
}
