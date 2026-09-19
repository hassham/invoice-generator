namespace InvoiceApp.Application.Estimates;

/// <summary>
/// IG-220: one upsert method backs both POST (create, estimateId null) and PUT (update, estimateId
/// set) - same pattern as IInvoiceService.SaveAsync. Account ownership is enforced internally from
/// userId - a caller can never save under, or overwrite, another account's estimate. Cancel/
/// Delete/Duplicate/Send/Accept/Decline/Convert are deliberately out of this Story's scope (later
/// Stories in Epic IG-207) - this interface covers exactly what IG-220's AC needs: create, save,
/// view.
/// </summary>
public interface IEstimateService
{
    Task<EstimateDto> SaveAsync(Guid userId, Guid? estimateId, EstimateSaveRequest request, CancellationToken cancellationToken);

    Task<EstimateDetailDto> GetAsync(Guid userId, Guid estimateId, CancellationToken cancellationToken);

    Task<EstimateListResponse> ListAsync(Guid userId, EstimateListQuery query, CancellationToken cancellationToken);
}
