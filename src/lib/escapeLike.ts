/**
 * Escapes the wildcards in a SQL LIKE / ILIKE pattern.
 *
 * Without it, a customer searching for "%" matches the entire catalogue and
 * "_" matches any single character — so the results look arbitrary rather than
 * empty, which is harder to recognise as a fault than a crash would be.
 *
 * The escape character itself has to be handled first, or escaping the
 * wildcards reintroduces the very characters being removed.
 */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (character) => `\\${character}`)
}
