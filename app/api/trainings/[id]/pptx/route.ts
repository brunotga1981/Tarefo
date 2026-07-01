import { NextRequest } from "next/server";
import PptxGenJS from "pptxgenjs";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Slide } from "@/lib/lms";

export const dynamic = "force-dynamic";

// Gera e baixa a apresentação do curso em PowerPoint (.pptx).
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  const rows = await query<{ title: string; slides: Slide[] | null }>(
    `SELECT title, slides FROM trainings WHERE id=$1`,
    [params.id]
  );
  const course = rows[0];
  const slides = Array.isArray(course?.slides) ? course!.slides : [];
  if (!course || slides.length === 0) {
    return new Response("Apresentação não encontrada", { status: 404 });
  }

  const pptx = new PptxGenJS();
  pptx.author = "Tarefo — TGA Empreendimentos";
  pptx.title = course.title;

  slides.forEach((s, idx) => {
    const slide = pptx.addSlide();
    if (idx === 0) {
      slide.background = { color: "1F3A5F" };
      slide.addText(s.title || course.title, {
        x: 0.5,
        y: 2,
        w: 9,
        h: 1.6,
        fontSize: 34,
        bold: true,
        color: "FFFFFF",
        align: "center",
      });
      if (s.bullets?.length) {
        slide.addText(s.bullets.join("  ·  "), {
          x: 1,
          y: 3.7,
          w: 8,
          h: 1,
          fontSize: 16,
          color: "DDE6F0",
          align: "center",
        });
      }
    } else {
      slide.addText(s.title, {
        x: 0.5,
        y: 0.4,
        w: 9,
        h: 0.9,
        fontSize: 26,
        bold: true,
        color: "1F3A5F",
      });
      const bullets = (s.bullets ?? []).map((b) => ({
        text: b,
        options: { bullet: true, breakLine: true },
      }));
      if (bullets.length) {
        slide.addText(bullets as any, {
          x: 0.7,
          y: 1.5,
          w: 8.6,
          h: 4,
          fontSize: 18,
          color: "333333",
          valign: "top",
          lineSpacingMultiple: 1.3,
        });
      }
    }
  });

  const b64 = (await pptx.write({ outputType: "base64" })) as string;
  const buf = Buffer.from(b64, "base64");
  const fname =
    (course.title || "apresentacao")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "apresentacao";

  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "content-disposition": `attachment; filename="${fname}.pptx"`,
      "cache-control": "no-store",
    },
  });
}
