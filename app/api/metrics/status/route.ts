import { NextRequest } from "next/server";
import { getStatus } from "@/lib/collection-store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const collectionId = searchParams.get("collectionId");

  if (!collectionId) {
    return new Response(
      JSON.stringify({ error: "Parâmetro collectionId é obrigatório" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let intervalId: ReturnType<typeof setInterval>;
      const startTime = Date.now();
      const TIMEOUT_MS = 60 * 1000; // 60 segundos

      const sendEvent = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      intervalId = setInterval(() => {
        try {
          // Verificar timeout
          if (Date.now() - startTime > TIMEOUT_MS) {
            sendEvent(JSON.stringify({ type: "timeout", message: "Tempo limite de coleta excedido" }));
            clearInterval(intervalId);
            controller.close();
            return;
          }

          const statuses = getStatus(collectionId);

          if (statuses.length === 0) {
            sendEvent(JSON.stringify({ type: "not_found", message: "Coleta não encontrada" }));
            clearInterval(intervalId);
            controller.close();
            return;
          }

          sendEvent(JSON.stringify({ type: "update", platforms: statuses }));

          // Verificar se todas as plataformas terminaram
          const allDone = statuses.every(
            (s) => s.status === "completed" || s.status === "error"
          );

          if (allDone) {
            sendEvent(JSON.stringify({ type: "done", platforms: statuses }));
            clearInterval(intervalId);
            controller.close();
          }
        } catch (error) {
          console.error("Erro no SSE de status:", error);
          clearInterval(intervalId);
          controller.close();
        }
      }, 500);

      // Cleanup se o cliente desconectar
      request.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
