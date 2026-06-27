export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser, can } from "@/lib/auth";
import { listTimeline } from "@/lib/timeline";
import { TimelineComposer } from "@/components/timeline/TimelineComposer";
import { TimelinePostCard } from "@/components/timeline/TimelinePostCard";

export default async function TimelinePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canPost = can(user, "timeline.post");
  const canModerate = can(user, "blog.manage");
  const posts = await listTimeline(user.id);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-center text-2xl font-bold text-azul-navy">
        Time Line
      </h1>
      <p className="mb-6 text-center text-sm text-slate-500">
        Novidades e conquistas da equipe Azul Administradora.
      </p>

      {canPost && <TimelineComposer />}

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
