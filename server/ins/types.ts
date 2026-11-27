export type InsStatus = "non_qualifiee" | "qualifiee" | "en_attente";

export type InsLookupResult =
  | { status: "non_qualifiee"; message: string }
  | { status: "qualifiee"; ins: string; message: string }
  | { status: "unavailable"; message: string };

export interface InsProvider {
  lookup(input: {
    firstName: string;
    lastName: string;
    birthDate: string;
    sex: string;
  }): Promise<InsLookupResult>;
}
