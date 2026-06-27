import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Salva um arquivo enviado em public/uploads e retorna a URL pública.
export async function saveUpload(
  file: File,
  prefix = "file"
): Promise<{ url: string; name: string }> {
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const stored = `${prefix}-${Date.now()}-${safe}`;
  await writeFile(path.join(dir, stored), Buffer.from(await file.arrayBuffer()));
  return { url: `/uploads/${stored}`, name: file.name };
}
