// Deep-links into TruePeopleSearch's own results page — not a scrape or an
// API integration, just a pre-filled link the same way a user's own search
// submission there would produce. TruePeopleSearch has no public API and
// this sandbox's network blocks the domain outright, so these parameter
// names are a best-effort match of the commonly-documented format, unverified
// against the live site. If a search lands on their blank homepage instead
// of filled-in results, the param names below need adjusting.
const BASE_URL = "https://www.truepeoplesearch.com/results";

export type PeopleSearchByName = {
  mode: "name";
  firstName: string;
  lastName: string;
  state?: string;
};

export type PeopleSearchByPhone = {
  mode: "phone";
  phone: string;
};

export type PeopleSearchByAddress = {
  mode: "address";
  street: string;
  city: string;
  state: string;
  zip?: string;
};

export type PeopleSearchInput =
  | PeopleSearchByName
  | PeopleSearchByPhone
  | PeopleSearchByAddress;

export function buildTruePeopleSearchUrl(input: PeopleSearchInput): string {
  const params = new URLSearchParams();

  if (input.mode === "name") {
    const name = [input.firstName, input.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    params.set("name", name);
    if (input.state) params.set("citystatezip", input.state);
  } else if (input.mode === "phone") {
    params.set("phoneno", input.phone.replace(/\D/g, ""));
  } else {
    params.set("streetaddress", input.street);
    const cityStateZip = [
      input.city,
      [input.state, input.zip].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ");
    params.set("citystatezip", cityStateZip);
  }

  return `${BASE_URL}?${params.toString()}`;
}
