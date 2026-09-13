using System.Net.Mail;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Invoicing;

namespace InvoiceApp.Modules.Invoicing;

/// <summary>Server-side re-check, same reasoning as InvoiceSaveRequestValidator - this endpoint is
/// reachable directly, not just through whatever compose form the frontend builds.</summary>
public static class InvoiceEmailRequestValidator
{
    private const int MaxSubjectLength = 200;
    private const int MaxMessageLength = 5000;
    private const int MaxRecipients = 10;

    public static void Validate(InvoiceEmailRequest request)
    {
        var errors = new List<string>();

        if (request.To.Count == 0)
        {
            errors.Add("At least one recipient is required.");
        }
        else if (request.To.Count > MaxRecipients)
        {
            errors.Add($"No more than {MaxRecipients} recipients are allowed.");
        }

        if (request.Cc.Count > MaxRecipients)
        {
            errors.Add($"No more than {MaxRecipients} CC recipients are allowed.");
        }

        foreach (var email in request.To.Concat(request.Cc))
        {
            if (!IsValidEmail(email))
            {
                errors.Add($"\"{email}\" is not a valid email address.");
            }
        }

        if (string.IsNullOrWhiteSpace(request.Subject))
        {
            errors.Add("Subject is required.");
        }
        else if (request.Subject.Length > MaxSubjectLength)
        {
            errors.Add($"Subject must be {MaxSubjectLength} characters or fewer.");
        }

        if (string.IsNullOrWhiteSpace(request.Message))
        {
            errors.Add("Message is required.");
        }
        else if (request.Message.Length > MaxMessageLength)
        {
            errors.Add($"Message must be {MaxMessageLength} characters or fewer.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationException(string.Join(" ", errors));
        }
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            _ = new MailAddress(email);
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
