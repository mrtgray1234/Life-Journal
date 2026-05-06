import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a proactive life assistant agent. Your job is to go out and research real-world tasks on behalf of the user, then return specific, actionable results.

Use web search to find:
- Real, specific options (actual business names, URLs, phone numbers, addresses)
- Current prices, requirements, or availability
- The single clearest next action the user should take right now

Format your response using these exact section headers:

## What I Found
[Your research findings with specific names, links, and details. Be concrete.]

## Your Next Step
[One clear, specific action to take right now — e.g. "Call Dr. Smith at (555) 123-4567 to schedule a new patient appointment"]

## Also Worth Knowing
[2–3 brief, practical notes — alternatives, things to watch out for, or follow-up steps]

Be direct. Skip generic advice. Give real, specific information the user can act on immediately.`;

export async function POST(request: Request) {
  const { task, context } = await request.json();

  if (!task?.trim()) {
    return Response.json({ error: "No task provided" }, { status: 400 });
  }

  const userMessage = context?.trim()
    ? `${task}\n\nMy context: ${context}`
    : task;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let messages: Anthropic.MessageParam[] = [
          { role: "user", content: userMessage },
        ];

        let continueLoop = true;

        while (continueLoop) {
          const apiStream = client.messages.stream({
            model: "claude-opus-4-7",
            max_tokens: 4000,
            system: SYSTEM_PROMPT,
            tools: [{ type: "web_search_20260209" as const, name: "web_search" }],
            messages,
          });

          for await (const event of apiStream) {
            if (
              event.type === "content_block_start" &&
              "content_block" in event &&
              (event.content_block as { type: string }).type === "server_tool_use"
            ) {
              controller.enqueue(encoder.encode("SEARCHING\n"));
            }

            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }

          const finalMsg = await apiStream.finalMessage();

          if (finalMsg.stop_reason === "pause_turn") {
            messages = [
              ...messages,
              { role: "assistant", content: finalMsg.content },
            ];
          } else {
            continueLoop = false;
          }
        }

        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`\n\nERROR: ${msg}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
