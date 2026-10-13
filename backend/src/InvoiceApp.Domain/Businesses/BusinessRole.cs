namespace InvoiceApp.Domain.Businesses;

/// <summary>
/// IG-240: what a team member may do in a business. The owner is not a role - it is Business.UserId,
/// and can do everything.
///
/// Restricted: works in the business day to day (invoices, customers, catalogue, reports) but cannot
/// change payment settings - Stripe connection and bank details - and cannot manage the team.
/// Admin: as Restricted, plus payment settings. Still cannot manage the team, which stays owner-only.
///
/// No business or account deletion exists yet. When it is added it must be owner-only, which the
/// owner check covers by default.
/// </summary>
public enum BusinessRole
{
    Restricted,
    Admin,
}
