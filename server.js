import express from "express";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json({ limit: "2mb" }));

// Simple .env loader (no extra dependency)
function loadEnv() {
  const envPath = path.resolve(".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    }
  }
}
loadEnv();

const PROVIDER = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();

if (PROVIDER === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
  console.error("\nLLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is missing from .env\n");
  process.exit(1);
}
if (PROVIDER === "groq" && !process.env.GROQ_API_KEY) {
  console.error("\nLLM_PROVIDER=groq but GROQ_API_KEY is missing from .env\n");
  process.exit(1);
}

// --- Anthropic call, normalized to { content: [{type:'text', text}] } ---
async function callAnthropic(messages, system) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages,
    }),
  });
  const data = await response.json();
  if (!response.ok) return { ok: false, status: response.status, error: data.error };
  return { ok: true, content: (data.content || []).filter(b => b.type === "text") };
}

// --- Groq call (OpenAI-compatible shape), normalized the same way ---
async function callGroq(messages, system) {
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: 1000,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  const data = await response.json();
  if (!response.ok) return { ok: false, status: response.status, error: data.error };
  const text = data.choices?.[0]?.message?.content || "";
  return { ok: true, content: text ? [{ type: "text", text }] : [] };
}

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, system } = req.body;
    const result = PROVIDER === "groq"
      ? await callGroq(messages, system)
      : await callAnthropic(messages, system);

    if (!result.ok) {
      console.error(`${PROVIDER} API error:`, result.error);
      return res.status(result.status || 500).json({ error: result.error || { message: "Unknown provider error" } });
    }
    res.json({ content: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: "Server error calling the LLM API" } });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Sensei backend running on http://localhost:${PORT} (provider: ${PROVIDER})`));
