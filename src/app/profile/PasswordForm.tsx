"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Lets Google users add a password, and people who used "Forgot Password?" pick a new one
export default function PasswordForm() {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const { error } = await createClient().auth.updateUser({ password });
    setMessage(error ? { ok: false, text: error.message } : { ok: true, text: "Password updated!" });
    if (!error) setPassword("");
    setSaving(false);
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <label className="field">
        New password
        <input
          type="password"
          className="input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
      </label>
      <button type="submit" className="btn btn-ghost" disabled={saving}>
        {saving ? "Saving…" : "Set password"}
      </button>
      {message && <p className={message.ok ? "success" : "error"}>{message.text}</p>}
    </form>
  );
}
