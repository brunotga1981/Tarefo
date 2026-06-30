import { query } from "./db";

/**
 * Armazenamento de imagens no banco (tabela images), servidas por /api/img/[id].
 * Evita trafegar data URLs gigantes pelos formulários (limite do Server Action)
 * e garante persistência (sobrevive a redeploys do Render).
 */

export async function storeImageBuffer(
  mime: string,
  data: Buffer
): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO images (mime, data) VALUES ($1, $2) RETURNING id`,
    [mime || "image/png", data]
  );
  return `/api/img/${rows[0].id}`;
}

/** Converte uma data URL (base64) em imagem persistida e retorna a URL curta. */
export async function storeDataUrl(dataUrl: string): Promise<string | null> {
  const m = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!m) return null;
  return storeImageBuffer(m[1], Buffer.from(m[2], "base64"));
}

export async function getImage(
  id: string
): Promise<{ mime: string; data: Buffer } | null> {
  const rows = await query<{ mime: string; data: Buffer }>(
    `SELECT mime, data FROM images WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}
