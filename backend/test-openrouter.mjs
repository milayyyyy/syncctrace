import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

try {
  const r = await client.chat.completions.create({
    model: "meta-llama/llama-3.3-70b-instruct:free",
    messages: [{ role: "user", content: "Say hello" }],
  });
  console.log("✅ OpenRouter OK:", r.choices[0].message.content);
} catch (e) {
  console.error("❌ error:", e.status, e.message);
}
