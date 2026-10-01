"use client";

import { useActionState } from "react";
import type { NameFormState } from "./actions";

type Props = {
  action: (prev: NameFormState, formData: FormData) => Promise<NameFormState>;
  firstName: string | null;
  lastName: string | null;
  submitLabel: string;
};

export default function NameForm({ action, firstName, lastName, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="stack">
      <label>
        First name
        <input name="first_name" defaultValue={firstName ?? ""} required />
      </label>
      <label>
        Last name
        <input name="last_name" defaultValue={lastName ?? ""} required />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
      {state.error && <p className="error">{state.error}</p>}
      {state.saved && !pending && <p className="success">Saved!</p>}
    </form>
  );
}
