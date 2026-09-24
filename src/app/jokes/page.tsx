import { supabase } from "@/lib/supabase";

// Fetch fresh data on every request instead of only at build time
export const dynamic = "force-dynamic";

type Joke = {
  id: number;
  setup: string;
  punchline: string;
};

export default async function JokesPage() {
  const { data: jokes, error } = await supabase
    .from("jokes")
    .select("id, setup, punchline")
    .order("id")
    .returns<Joke[]>();

  if (error) {
    return (
      <main>
        <h1>Jokes</h1>
        <p>Error loading jokes: {error.message}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Jokes</h1>
      {jokes.length === 0 ? (
        <p>No jokes yet.</p>
      ) : (
        <ul>
          {jokes.map((joke) => (
            <li key={joke.id}>
              <strong>{joke.setup}</strong> {joke.punchline}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
