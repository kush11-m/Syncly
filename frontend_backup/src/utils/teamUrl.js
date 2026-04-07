export const slugifySegment = (value) => {
  const base = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "team";
};

export const getUserSlug = (user) => {
  if (!user) return "member";

  if (user.username) {
    return slugifySegment(user.username);
  }

  if (user.name) {
    return slugifySegment(user.name);
  }

  return `user-${user.id || "member"}`;
};

export const getTeamSlug = (team) => slugifySegment(team?.name || "team");

export const getTeamPath = (user, team) => `/workspace/${getUserSlug(user)}/${getTeamSlug(team)}`;

export const getTeamSettingsPath = (user, team) => `${getTeamPath(user, team)}/settings`;
