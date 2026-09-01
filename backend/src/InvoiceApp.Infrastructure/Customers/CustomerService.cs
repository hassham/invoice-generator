using InvoiceApp.Application.Customers;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Domain.Customers;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Customers;

public sealed class CustomerService(ApplicationDbContext dbContext) : ICustomerService
{
    public async Task<IReadOnlyList<CustomerDto>> ListAsync(Guid userId, bool includeArchived, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);

        var query = dbContext.Customers.Where(customer => customer.BusinessId == businessId);
        if (!includeArchived)
        {
            query = query.Where(customer => !customer.IsArchived);
        }

        var customers = await query.OrderBy(customer => customer.BusinessName).ThenBy(customer => customer.ContactName).ToListAsync(cancellationToken);
        return customers.Select(ToDto).ToList();
    }

    public async Task<CustomerDto> GetAsync(Guid userId, Guid customerId, CancellationToken cancellationToken)
    {
        var customer = await FindOwnedAsync(userId, customerId, cancellationToken);
        return ToDto(customer);
    }

    public async Task<CustomerDto> CreateAsync(Guid userId, CustomerRequest request, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            BusinessName = request.BusinessName,
            ContactName = request.ContactName,
            Email = request.Email,
            Phone = request.Phone,
            AddressLine1 = request.AddressLine1,
            AddressLine2 = request.AddressLine2,
            City = request.City,
            State = request.State,
            PostalCode = request.PostalCode,
            Country = request.Country,
            TaxNumber = request.TaxNumber,
            Notes = request.Notes,
            IsArchived = false,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.Customers.Add(customer);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(customer);
    }

    public async Task<CustomerDto> UpdateAsync(Guid userId, Guid customerId, CustomerRequest request, CancellationToken cancellationToken)
    {
        var customer = await FindOwnedAsync(userId, customerId, cancellationToken);

        customer.BusinessName = request.BusinessName;
        customer.ContactName = request.ContactName;
        customer.Email = request.Email;
        customer.Phone = request.Phone;
        customer.AddressLine1 = request.AddressLine1;
        customer.AddressLine2 = request.AddressLine2;
        customer.City = request.City;
        customer.State = request.State;
        customer.PostalCode = request.PostalCode;
        customer.Country = request.Country;
        customer.TaxNumber = request.TaxNumber;
        customer.Notes = request.Notes;
        customer.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(customer);
    }

    public async Task ArchiveAsync(Guid userId, Guid customerId, CancellationToken cancellationToken)
    {
        var customer = await FindOwnedAsync(userId, customerId, cancellationToken);

        // FSD section 58: archive, never hard-delete - historical invoices reference customers and
        // must keep resolving. Idempotent: archiving an already-archived customer is a no-op, not
        // an error.
        customer.IsArchived = true;
        customer.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<Guid> ResolveBusinessIdAsync(Guid userId, CancellationToken cancellationToken)
    {
        // Every account gets exactly one Business row at registration (AccountRegistrationService)
        // - this is what makes a customer "account-owned" (IG-55 AC) rather than needing a
        // caller-supplied business id that a request could try to spoof.
        return await dbContext.Businesses
            .Where(business => business.UserId == userId)
            .Select(business => business.Id)
            .SingleAsync(cancellationToken);
    }

    private async Task<Customer> FindOwnedAsync(Guid userId, Guid customerId, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);

        // Not found and "belongs to someone else" return the same 404 - existence of another
        // account's customer is never disclosed, same anti-enumeration precedent used elsewhere
        // (e.g. login failures, IG-100's authentication error message).
        return await dbContext.Customers.SingleOrDefaultAsync(
            customer => customer.Id == customerId && customer.BusinessId == businessId,
            cancellationToken)
            ?? throw new NotFoundException("Customer not found.");
    }

    private static CustomerDto ToDto(Customer customer) => new(
        customer.Id,
        customer.BusinessName,
        customer.ContactName,
        customer.Email,
        customer.Phone,
        customer.AddressLine1,
        customer.AddressLine2,
        customer.City,
        customer.State,
        customer.PostalCode,
        customer.Country,
        customer.TaxNumber,
        customer.Notes,
        customer.IsArchived,
        customer.CreatedAt,
        customer.UpdatedAt);
}
