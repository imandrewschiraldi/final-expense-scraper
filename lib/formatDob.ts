import { format } from "date-fns";

export function formatDob(dateOfBirth: string | Date | null | undefined): string {
  if (!dateOfBirth) return "—";
  return format(new Date(dateOfBirth), "MM/dd/yyyy");
}
