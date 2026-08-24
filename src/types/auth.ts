import type { ProfileRow, Role, UserStatus } from "./database";

export type Profile = ProfileRow;
export type { Role, UserStatus };

/** The signed-in user as every server component sees them. */
export interface SessionUser {
  id: string;
  email: string | null;
  profile: Profile;
}

/** Role names are translated; see `dict.roles`. */
