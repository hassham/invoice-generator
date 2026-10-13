using InvoiceApp.Domain.Businesses;
using InvoiceApp.Infrastructure.Persistence;

namespace InvoiceApp.Infrastructure.Businesses;

/// <summary>
/// IG-239: the one definition of "may this user work in this business" - the owner, or a user with an
/// active (not revoked) membership. Every business-scoped check goes through this, so an invited
/// member and the owner are treated the same until IG-240 introduces restricted roles.
/// </summary>
public static class BusinessAccessQueries
{
    public static IQueryable<Business> AccessibleBusinesses(this ApplicationDbContext dbContext, Guid userId) =>
        dbContext.Businesses.Where(business =>
            business.UserId == userId
            || dbContext.BusinessMemberships.Any(membership =>
                membership.BusinessId == business.Id && membership.UserId == userId && membership.RevokedAt == null));

    /// <summary>IG-240: the businesses whose payment settings this user may change - the owner, or an
    /// active member with the Admin role. Restricted members are not in this set.</summary>
    public static IQueryable<Business> AdministeredBusinesses(this ApplicationDbContext dbContext, Guid userId) =>
        dbContext.Businesses.Where(business =>
            business.UserId == userId
            || dbContext.BusinessMemberships.Any(membership =>
                membership.BusinessId == business.Id
                && membership.UserId == userId
                && membership.RevokedAt == null
                && membership.Role == BusinessRole.Admin));
}
