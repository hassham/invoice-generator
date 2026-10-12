namespace InvoiceApp.Application.Exceptions;

/// <summary>The caller is signed in but may not do this (e.g. a team member inviting someone). Maps to 403.</summary>
public sealed class ForbiddenException(string message) : Exception(message);
