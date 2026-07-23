import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface ExistingTodo {
  id: string;
  text: string;
  project?: string | null;
  deadline?: string | null;
}

export async function POST(request: Request) {
  const { text, todos } = await request.json();

  if (!text?.trim()) {
    return Response.json({ error: "No text provided" }, { status: 400 });
  }

  const existing: ExistingTodo[] = Array.isArray(todos) ? todos : [];
  const today = new Date().toISOString().slice(0, 10);
  const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2500,
    system: `You are a warm, perceptive life coach who also maintains the user's to-do list like a meticulous personal assistant.

Today is ${weekday}, ${today}.

The user's current active to-do list (JSON):
${JSON.stringify(existing)}

They just wrote a new journal entry. Respond with ONLY valid JSON in this exact shape:

{
  "reflection": "2–3 paragraphs of thoughtful prose, separated by \\n\\n. Speak directly to them using 'you'. Name emotional undercurrents, patterns, avoidance. End with a single open-ended follow-up question. Under 200 words. No bullets or headers.",
  "todos": [
    { "existingId": "id-from-current-list-or-null", "text": "short imperative", "project": "1-2 word project name or null", "deadline": "YYYY-MM-DD or null" }
  ]
}

Rules for todos — you are returning the user's ENTIRE updated active list, not just new items:
- Include every existing todo (carry its id as existingId), plus new tasks from the entry
- Merge duplicates and near-duplicates into a single item — when merging, keep one existingId and drop the rest
- If the entry adds detail or a deadline to an existing task, update that task's text/deadline rather than adding a new one
- Cluster related tasks under a short shared project name (e.g. "Fundraise", "Health"). Use consistent names — reuse project names already in the list. Standalone tasks get null
- Convert relative time ("by Thursday", "this weekend", "before the 15th") to real dates using today's date. No mentioned deadline = null
- Never invent tasks that aren't in the entry or the existing list. Never drop a task unless it merged into another

Respond with ONLY the JSON object.`,
    messages: [
      {
        role: "user",
        content: text,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    return Response.json(parsed);
  } catch {
    return Response.json({ error: "Failed to parse response" }, { status: 500 });
  }
}
