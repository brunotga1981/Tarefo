"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { BIRTHDAY_CARDS } from "@/lib/birthday-cards";
import { sendBirthdayCardAction } from "@/app/(app)/intranet/aniversarios/actions";

export function BirthdayCardSender({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState(1);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy"
      >
        🎁 Enviar cartão
      </button>

      {open && (
        <form
          action={sendBirthdayCardAction}
          className="mt-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
        >
          <input type="hidden" name="user_id" value={userId} />
          <input type="hidden" name="card" value={card} />
          <p className="mb-2 text-xs font-semibold text-slate-600">
            Escolha o cartão para {userName}:
          </p>
          <div className="mb-2 flex gap-2">
            {BIRTHDAY_CARDS.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setCard(i + 1)}
                className={`overflow-hidden rounded-lg border-2 ${
                  card === i + 1 ? "border-azul" : "border-slate-200"
                }`}
              >
                <img src={src} alt={`Cartão ${i + 1}`} className="h-24 w-16 object-cover" />
              </button>
            ))}
          </div>
          <textarea
            name="message"
            rows={2}
            placeholder="Escreva os dizeres do cartão…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-azul"
          />
          <div className="mt-2 flex items-center gap-2">
            <button className="rounded-lg bg-azul px-3 py-1.5 text-xs font-semibold text-white hover:bg-azul-navy">
              Enviar pelo Torpedo
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
