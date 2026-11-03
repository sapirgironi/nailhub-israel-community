export function hasAcademyAccess(isAdmin: boolean, accountRole: string | undefined) {
  return isAdmin || accountRole === "instructor";
}
