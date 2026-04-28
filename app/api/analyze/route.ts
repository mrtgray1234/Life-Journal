import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: Request) {
  const { text } = await request.json();

  if (!text?.trim()) {
    return Response.json({ error: "No text provided" }, { status: 400 });
  }

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: `You are a personal life assistant. Analyze the user's brain dump and extract structured insights.
Respond with ONLY valid JSON in this exact shape:
{
  "tasks": ["...", "..."],
  "priorities": ["...", "..."],
  "nextActions": ["...", "..."]
}
- tasks: up to 5 concrete things they need or want to do, phrased as clean action items
- priorities: up to 3 items ranked by urgency/importance with a brief reason why
- nextActions: the 3 most important things to do first, phrased as direct imperatives (start with a verb)
No extra text, no markdown, just the JSON object.`,
    messages: [
      {
        role: "user",
        content: text,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    const analysis = JSON.parse(cleaned);
    return Response.json(analysis);
  } catch {
    return Response.json({ error: "Failed to parse response" }, { status: 500 });
  }
}
