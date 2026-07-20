import { config } from "dotenv"
import { generateText } from "ai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

config({ path: ".env.local" })

const model = process.env.AI_MODEL ?? "DeepSeek-V4-Flash"
const baseURL = process.env.AI_API_BASE_URL ?? "https://api.hcnsec.cn/v1"
const apiKey = process.env.HCNSEC_API_KEY

if (!apiKey) {
  console.log("HCNSEC AI provider: missing HCNSEC_API_KEY")
  process.exit(1)
}

const hcnsec = createOpenAICompatible({
  name: "hcnsec",
  apiKey,
  baseURL,
})

try {
  const response = await generateText({
    model: hcnsec(model),
    prompt: "Reply with exactly: ok",
    temperature: 0,
  })

  console.log(`HCNSEC AI provider: ok; baseURL=${baseURL}; model=${model}; output=${JSON.stringify(response.text)}`)
} catch (error) {
  console.log(`HCNSEC AI provider: failed; baseURL=${baseURL}; model=${model}; ${error instanceof Error ? error.message : "unknown error"}`)
  process.exit(1)
}
