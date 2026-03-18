import { prisma, ARTIST_ID } from "@/lib/db";
import { openai } from "@/lib/ai/client";
import { buildProductionPrompt } from "@/lib/ai/prompts-production";
import type { ChatMessage } from "@prisma/client";

const PLAN_SAVE_REGEX = /\[PLAN_SAVE\]\s*([\s\S]*?)\s*\[\/PLAN_SAVE\]/;
const STAGE_UPDATE_REGEX = /\[STAGE_UPDATE\]\s*([\s\S]*?)\s*\[\/STAGE_UPDATE\]/g;
const PLAN_COMPLETE_REGEX = /\[PLAN_COMPLETE\]\s*([\s\S]*?)\s*\[\/PLAN_COMPLETE\]/;

interface PlanSaveData {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  stages: {
    title: string;
    description?: string;
    orderIndex: number;
    startDate?: string;
    endDate?: string;
  }[];
}

interface StageUpdateData {
  stageId: string;
  content: string;
  newStatus: "IN_PROGRESS" | "COMPLETED";
}

export async function handleProductionArtist(
  content: string,
  recentMessages: ChatMessage[]
) {
  // Save user message with mode metadata
  await prisma.chatMessage.create({
    data: {
      artistId: ARTIST_ID,
      role: "USER",
      content,
      metadata: { mode: "production-artist" },
    },
  });

  // Load artist data with preferences
  const artist = await prisma.artist.findUniqueOrThrow({
    where: { id: ARTIST_ID },
  });

  // Load active production plan (if any)
  const activePlan = await prisma.productionPlan.findFirst({
    where: { artistId: ARTIST_ID, status: "ACTIVE" },
    include: {
      stages: {
        orderBy: { orderIndex: "asc" },
        include: {
          updates: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      },
    },
  });

  const preferences = artist.preferences as Record<string, unknown> | null;

  // Build specialized prompt
  const systemPrompt = buildProductionPrompt(artist, activePlan, preferences);

  // Filter to production-mode messages for focused context
  const productionMessages = recentMessages.filter((m) => {
    const meta = m.metadata as Record<string, unknown> | null;
    return meta?.mode === "production-artist";
  });

  const allMessages = [
    ...productionMessages.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
    { role: "user" as const, content },
  ];

  // Call OpenAI with web search for real citations
  const response = await openai.responses.create({
    model: "gpt-5.4-mini",
    instructions: systemPrompt,
    input: allMessages,
    tools: [
      {
        type: "web_search_preview",
        search_context_size: "medium",
      },
    ],
  });

  let displayContent = response.output_text;
  let messageMetadata: { mode: string; status: string } = {
    mode: "production-artist",
    status: "active",
  };

  // Process PLAN_SAVE marker
  const planMatch = displayContent.match(PLAN_SAVE_REGEX);
  if (planMatch) {
    try {
      const planData: PlanSaveData = JSON.parse(planMatch[1]);

      await prisma.productionPlan.create({
        data: {
          artistId: ARTIST_ID,
          title: planData.title,
          description: planData.description,
          startDate: new Date(planData.startDate),
          endDate: new Date(planData.endDate),
          stages: {
            create: planData.stages.map((s) => ({
              title: s.title,
              description: s.description,
              orderIndex: s.orderIndex,
              startDate: s.startDate ? new Date(s.startDate) : null,
              endDate: s.endDate ? new Date(s.endDate) : null,
            })),
          },
        },
      });

      displayContent = displayContent.replace(PLAN_SAVE_REGEX, "").trim();
      displayContent += "\n\n**Plano salvo com sucesso!** Agora voce pode enviar atualizacoes de progresso usando `/production-artist`.";
    } catch {
      displayContent = displayContent.replace(PLAN_SAVE_REGEX, "").trim();
      displayContent +=
        "\n\n*Tive um problema ao salvar o plano. Pode confirmar novamente?*";
    }
  }

  // Process STAGE_UPDATE markers (can be multiple)
  let stageMatch;
  const stageUpdateRegex = /\[STAGE_UPDATE\]\s*([\s\S]*?)\s*\[\/STAGE_UPDATE\]/g;
  while ((stageMatch = stageUpdateRegex.exec(displayContent)) !== null) {
    try {
      const updateData: StageUpdateData = JSON.parse(stageMatch[1]);

      // Create stage update record
      await prisma.stageUpdate.create({
        data: {
          stageId: updateData.stageId,
          content: updateData.content,
        },
      });

      // Update stage status
      await prisma.productionStage.update({
        where: { id: updateData.stageId },
        data: { status: updateData.newStatus },
      });
    } catch {
      // Silently skip failed updates
    }
  }
  displayContent = displayContent.replace(STAGE_UPDATE_REGEX, "").trim();

  // Process PLAN_COMPLETE marker
  const completeMatch = displayContent.match(PLAN_COMPLETE_REGEX);
  if (completeMatch) {
    try {
      const completeData = JSON.parse(completeMatch[1]);
      await prisma.productionPlan.update({
        where: { id: completeData.planId },
        data: { status: "COMPLETED" },
      });

      displayContent = displayContent.replace(PLAN_COMPLETE_REGEX, "").trim();
      messageMetadata = { mode: "production-artist", status: "completed" };
    } catch {
      displayContent = displayContent.replace(PLAN_COMPLETE_REGEX, "").trim();
    }
  }

  // Save assistant message
  const assistantMessage = await prisma.chatMessage.create({
    data: {
      artistId: ARTIST_ID,
      role: "ASSISTANT",
      content: displayContent,
      metadata: messageMetadata,
    },
  });

  return assistantMessage;
}
