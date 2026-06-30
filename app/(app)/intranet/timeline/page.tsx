export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser, can } from "@/lib/auth";
import { listTimeline, getHighlightStories } from "@/lib/timeline";
import { TimelineComposer } from "@/components/timeline/TimelineComposer";
import { TimelinePostCard } from "@/components/timeline/TimelinePostCard";
import { HighlightsBar } from "@/components/timeline/HighlightsBar";

export default async function TimelinePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canPost = can(user, "timeline.post");
  const canModerate = can(user, "blog.manage");
  const canHighlights = can(user, "highlights.manage");

  const highlights = await getHighlightStories();
  const posts = await listTimeline(user.id, { canModerate });

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-center text-2xl font-bold text-azul-navy">
        TGA Empreendimentos
      </h1>
      <p className="mb-5 text-center text-sm text-slate-500">
        Novidades e conquistas da equipe.
      </p>

      <HighlightsBar highlights={highlights} canManage={canHighlights} />

      {canPost && (
        <TimelineComposer
          highlights={highlights.map((h) => ({
            id: h.id,
            title: h.title,
            image_url: h.image_url,
          }))}
        />
      )}

      {posts.length === 0 && (
        <p className="text-center text-sm text-slate-400">
          Ainda não há publicações.
        </p>
      )}
      {posts.map((p) => (
        <TimelinePostCard
          key={p.id}
          post={p}
          userId={user.id}
          canDelete={canModerate || p.author_id === user.id}
        />
      ))}
    </div>
  );
}
