import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: Request) {
  const { text } = await request.json();

  if (!text?.trim()) {
    return Response.json({ error: "No text provided" }, { status: 400 });
  }

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: `You are a warm, perceptive life coach reading someone's private journal entry. Respond with ONLY valid JSON in this exact shape:

{
  "reflection": "2–3 paragraphs of thoughtful prose, separated by \\n\\n. Speak directly to them using 'you'. Name emotional undercurrents, patterns, avoidance. End the last paragraph with a single open-ended follow-up question.",
  "todos": ["action item 1", "action item 2", "..."]
}

For the reflection: calm, direct, human voice. No bullet points or headers inside it. Under 200 words total.
For the todos: extract every concrete action item, task, or thing they need to do — phrased as clean, short imperatives (start with a verb). Include everything, even small things. No duplicates.

Respond with ONLY the JSON object, no extra text.`,
    messages: [
      {
        role: "user",
        content: text,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(raw);
    return Response.json(parsed);
  } catch {
    return Response.json({ error: "Failed to parse response" }, { status: 500 });
  }
}
