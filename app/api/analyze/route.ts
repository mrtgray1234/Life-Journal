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
    system: `You are a warm, perceptive life coach and therapist reading someone's private journal entry.
Your job is to reflect back what you're genuinely hearing — not just the surface-level tasks, but the emotional undercurrents, patterns, and unspoken things.

Write 2–3 short paragraphs in a calm, direct, human voice. No bullet points. No headers. No lists. Just thoughtful prose.

Notice what's really going on. If someone is overwhelmed, name it. If there's avoidance, gently point to it. If there's something they seem excited about even if they buried it, reflect that back.

End with a single, open-ended question that invites them to go deeper — something that couldn't be answered with yes or no. Make it feel natural, not clinical.

Keep the whole response under 200 words. Speak directly to them using "you".`,
    messages: [
      {
        role: "user",
        content: text,
      },
    ],
  });

  const response = message.content[0].type === "text" ? message.content[0].text : "";

  return Response.json({ response });
}
