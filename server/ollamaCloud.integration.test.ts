import { describe, expect, it } from "vitest";
import { extractFollowUpIntentViaOllama } from "./ollamaCloud";

// This reaches an external provider. Run it deliberately with
// RUN_OLLAMA_CLOUD_INTEGRATION=true; normal CI remains deterministic.
const describeOllamaIntegration = process.env.RUN_OLLAMA_CLOUD_INTEGRATION === "true" ? describe : describe.skip;

describeOllamaIntegration("Ollama Cloud credential", () => {
  it("authenticates with the server-only API key", async () => {
    const apiKey = process.env.OLLAMA_CLOUD_API_KEY;
    expect(apiKey, "OLLAMA_CLOUD_API_KEY must be configured for Ollama Cloud").toBeTruthy();

    const response = await fetch("https://api.ollama.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.status, "Ollama Cloud rejected the configured API key").toBe(200);
    const payload = await response.json() as { data?: Array<{ id?: string }> };
    expect(Array.isArray(payload.data)).toBe(true);
  }, 15_000);

  it("classifies an Arabic area follow-up without receiving inventory data", async () => {
    const intent = await extractFollowUpIntentViaOllama({
      message: "دول بنفس رينج المساحة؟",
      history: [
        { role: "user", content: "رشح وحدات متاحة من 100 إلى 120 متر" },
        { role: "assistant", content: "وجدت 3 وحدات مطابقة وفق 100–120 م²." },
      ],
      currentFilters: { availability: "available", minAreaSqm: 100, maxAreaSqm: 120 },
    });

    expect(intent.action).toBe("compare_area");
  }, 15_000);
});
