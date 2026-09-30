// Server-side Apollo People Search caller for Recruiting Radar. Deliberately
// a plain fetch (no client is stored at module scope — see the RESEND_API_KEY
// eager-client pitfall in lib/email.ts) so the API key is read fresh from
// the environment on every call and nothing needs a dummy value at build
// time. This also fixes the reference build's file:// CORS limitation by
// construction, since the call now happens server-side.

export type ApolloPerson = {
  name: string;
  title: string;
  company: string;
  location: string;
  linkedinUrl: string;
};

export class ApolloSearchError extends Error {}

/**
 * Calls Apollo's People Search endpoint with the same shape the reference
 * tool used: only the first 5 titles of a category, per_page 10, page 1 (no
 * pagination loop — a known limitation carried over intentionally to match
 * the as-built tool exactly).
 */
export async function searchApolloPeople(titles: string[], locations: string[], marketLabel: string): Promise<ApolloPerson[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    throw new ApolloSearchError("Apollo API key is not configured on the server (APOLLO_API_KEY).");
  }

  const res = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      person_titles: titles.slice(0, 5),
      person_locations: locations,
      per_page: 10,
      page: 1,
    }),
  });

  if (!res.ok) {
    let message = `Apollo error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // Apollo's error body isn't always JSON — fall back to the status-only message above.
    }
    throw new ApolloSearchError(message);
  }

  const data = await res.json();
  const people = data.people ?? data.contacts ?? [];

  return people.map((p: Record<string, unknown>) => {
    const city = (p.city as string) || "";
    const state = (p.state as string) || "";
    const location = [city, state].filter(Boolean).join(", ") || marketLabel;
    const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || (p.name as string) || "";
    const organization = p.organization as { name?: string } | undefined;
    const company = organization?.name || (p.organization_name as string) || "";
    return {
      name,
      title: (p.title as string) || "",
      company,
      location,
      linkedinUrl: (p.linkedin_url as string) || "",
    };
  });
}
