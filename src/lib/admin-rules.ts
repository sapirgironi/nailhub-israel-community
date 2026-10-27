export function matchesAdminSearch(user: { display_name: string; email: string }, search: string) {
  const term = search.trim().toLocaleLowerCase();
  return user.display_name.toLocaleLowerCase().includes(term) || user.email.toLocaleLowerCase().includes(term);
}