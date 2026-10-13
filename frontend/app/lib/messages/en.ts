/**
 * IG-241: user-facing text for the team and invitation pages, held outside the components so it can be
 * translated without touching them. Placeholders are written as {name} and filled by t().
 *
 * Only English exists yet. Adding a language means adding a sibling catalogue with the same keys; the
 * type checker then reports any key a translation misses.
 */
export const en = {
  "team.title": "Team",
  "team.intro": "Invite someone by email to help manage this business. They can only see the businesses you invite them to.",
  "team.loading": "Loading…",
  "team.invite.emailLabel": "Email address",
  "team.invite.roleLabel": "Role",
  "team.invite.submit": "Send invitation",
  "team.invite.submitting": "Sending…",
  "team.invite.sent": "Invitation sent to {email} as {role}.",
  "team.pending.heading": "Pending invitations",
  "team.pending.empty": "No pending invitations.",
  "team.pending.detail": "{role} · Expires {date}",
  "team.pending.cancel": "Cancel invitation",
  "team.members.heading": "Team members",
  "team.members.empty": "No team members yet.",
  "team.members.joined": "Joined {date}",
  "team.members.roleFor": "Role for {email}",
  "team.members.remove": "Remove access",
  "team.role.restricted": "Restricted (no payment settings)",
  "team.role.admin": "Admin (can change payment settings)",
  "team.error.load": "Failed to load your team.",
  "team.error.invite": "Failed to send the invitation.",
  "team.error.roleChange": "Failed to change this member's role.",
  "team.error.cancel": "Failed to cancel the invitation.",
  "team.error.remove": "Failed to remove this team member.",

  "invitation.loading": "Loading invitation…",
  "invitation.unavailable.title": "Invitation unavailable",
  "invitation.signIn.title": "Sign in to accept this invitation",
  "invitation.signIn.body": "Sign in or create an account with the email address this invitation was sent to, then open this link again.",
  "invitation.signIn.button": "Sign in",
  "invitation.signIn.createAccount": "Create an account",
  "invitation.join.title": "Join {businessName}",
  "invitation.join.body": "You've been invited to help manage {businessName}. You will only see this business, not the owner's others.",
  "invitation.join.accept": "Accept invitation",
  "invitation.join.accepting": "Accepting…",
  "invitation.joined.title": "You've joined {businessName}",
  "invitation.joined.body": "{businessName} is now selected. You can switch businesses from the header.",
  "invitation.joined.dashboard": "Go to dashboard",
  "invitation.error.load": "This invitation could not be loaded.",
  "invitation.error.accept": "This invitation could not be accepted.",

  "combined.title": "All businesses",
  "combined.intro": "Figures for every business you can access. Each business keeps its own currency, and totals are shown per currency, never added across currencies.",
  "combined.loading": "Loading reports…",
  "combined.error": "Failed to load the combined reports.",
  "combined.period": "This month",
  "combined.revenue.heading": "Revenue",
  "combined.outstanding.heading": "Outstanding invoices",
  "combined.overdue.heading": "Overdue invoices",
  "combined.tax.heading": "Tax collected",
  "combined.customers.heading": "Revenue by customer",
  "combined.totals": "Totals by currency",
  "combined.none": "None.",
  "combined.noBusinesses": "You don't have any businesses yet.",
  "combined.link": "View figures for all businesses",
  "combined.backToRevenue": "Revenue reports",
} as const;

export type MessageKey = keyof typeof en;
