import { config } from "dotenv"
import { gateway, generateText } from "ai"

config({ path: ".env.local" })

const model =
  process.env.AI_GATEWAY_MODEL ??
  (process.env.AI_MODEL?.includes("/") ? process.env.AI_MODEL : process.env.OPENAI_MODEL) ??
  "openai/gpt-5.4-mini"

const apiKey = process.env.AI_GATEWAY_API_KEY ?? process.env.AI_API_KEY

if (apiKey && !process.env.AI_GATEWAY_API_KEY) {
  process.env.AI_GATEWAY_API_KEY = apiKey
}

if (!apiKey && !process.env.VERCEL) {
  console.log("AI Gateway: missing AI_API_KEY or AI_GATEWAY_API_KEY")
  process.exit(1)
}

try {
  const response = await generateText({
    model: gateway(model),
    prompt: "Reply with exactly: ok",
    temperature: 0,
  })

  console.log(`AI Gateway: ok; model=${model}; output=${JSON.stringify(response.text)}`)
} catch (error) {
  console.log(`AI Gateway: failed; model=${model}; ${error instanceof Error ? error.message : "unknown error"}`)
  process.exit(1)
}
