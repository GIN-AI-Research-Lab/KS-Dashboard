// Load data/export.json into the CURRENT DB (run AFTER switching the Prisma
// provider to postgresql and running `prisma migrate deploy`). Inserts in
// FK-safe order. See SCALING.md.
//   npm run db:import
import { prisma } from "../src/lib/db";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";

type Dump = {
  departments: Prisma.DepartmentCreateManyInput[];
  teams: Prisma.TeamCreateManyInput[];
  users: Prisma.UserCreateManyInput[];
  sessions: Prisma.ClaudeSessionCreateManyInput[];
  turns: Prisma.TurnCreateManyInput[];
  toolCalls: Prisma.ToolCallCreateManyInput[];
  sessionIdentities: Prisma.SessionIdentityCreateManyInput[];
  sessionComments: Prisma.SessionCommentCreateManyInput[];
  sessionFeedback: Prisma.SessionFeedbackCreateManyInput[];
  libraryItems: Prisma.LibraryItemCreateManyInput[];
  libraryComments: Prisma.LibraryCommentCreateManyInput[];
  libraryReactions: Prisma.LibraryReactionCreateManyInput[];
  libraryBookmarks: Prisma.LibraryBookmarkCreateManyInput[];
};

async function main() {
  const raw = await readFile(path.join(process.cwd(), "data", "export.json"), "utf8");
  const d = JSON.parse(raw) as Dump;

  // FK-safe order.
  await prisma.department.createMany({ data: d.departments });
  await prisma.team.createMany({ data: d.teams });
  await prisma.user.createMany({ data: d.users });
  await prisma.claudeSession.createMany({ data: d.sessions });
  await prisma.turn.createMany({ data: d.turns });
  await prisma.toolCall.createMany({ data: d.toolCalls });
  await prisma.sessionIdentity.createMany({ data: d.sessionIdentities });
  await prisma.sessionComment.createMany({ data: d.sessionComments });
  await prisma.sessionFeedback.createMany({ data: d.sessionFeedback });
  await prisma.libraryItem.createMany({ data: d.libraryItems });
  await prisma.libraryComment.createMany({ data: d.libraryComments });
  await prisma.libraryReaction.createMany({ data: d.libraryReactions });
  await prisma.libraryBookmark.createMany({ data: d.libraryBookmarks });

  console.log("Import xong.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
