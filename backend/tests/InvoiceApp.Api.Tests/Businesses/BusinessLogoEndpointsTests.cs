using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Identity;

namespace InvoiceApp.Api.Tests.Businesses;

/// <summary>
/// Verifies IG-52/S40's "Upload Logo" onboarding step end to end: a real logo can be uploaded,
/// persisted (BusinessLogoStorage, local disk), served back, replaced and removed - and that the
/// server-side validation (BusinessLogoValidator) actually rejects what it claims to, not just
/// that the happy path works.
/// </summary>
public class BusinessLogoEndpointsTests
{
    private const string LogoEndpoint = "/api/v1/business/logo";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    // Only the first 4 bytes are checked by BusinessLogoValidator (mirroring the frontend's own
    // signature check) - the rest is arbitrary filler, not a real decodable image.
    private static byte[] ValidPngBytes(int totalLength = 64) => Prefixed([0x89, 0x50, 0x4E, 0x47], totalLength);

    private static byte[] ValidJpegBytes(int totalLength = 64) => Prefixed([0xFF, 0xD8, 0xFF], totalLength);

    private static byte[] Prefixed(byte[] signature, int totalLength)
    {
        var bytes = new byte[totalLength];
        signature.CopyTo(bytes, 0);
        return bytes;
    }

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static MultipartFormDataContent LogoFormContent(byte[] bytes, string contentType, string fileName = "logo")
    {
        var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
        var form = new MultipartFormDataContent();
        form.Add(fileContent, "file", fileName);
        return form;
    }

    [Fact]
    public async Task Uploading_a_valid_logo_returns_a_servable_url()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "logo-upload@example.com");

        var response = await client.PostAsync(LogoEndpoint, LogoFormContent(ValidPngBytes(), "image/png"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);
        Assert.NotNull(profile!.LogoUrl);
        Assert.Equal($"/api/v1/business/logo/{profile.Id}", profile.LogoUrl);
    }

    [Fact]
    public async Task Uploaded_logo_is_served_anonymously_with_the_right_content_type()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "logo-serve@example.com");
        var uploadResponse = await client.PostAsync(LogoEndpoint, LogoFormContent(ValidPngBytes(), "image/png"));
        var profile = await uploadResponse.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);

        // A fresh, unauthenticated client - the whole point of this endpoint is that no session is
        // required to view a logo (it renders in <img> tags for anonymous invoice viewers too).
        using var anonymousClient = factory.CreateClient();
        var logoResponse = await anonymousClient.GetAsync(profile!.LogoUrl);

        Assert.Equal(HttpStatusCode.OK, logoResponse.StatusCode);
        Assert.Equal("image/png", logoResponse.Content.Headers.ContentType?.MediaType);
        Assert.Equal(ValidPngBytes(), await logoResponse.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Requesting_the_logo_for_an_unknown_business_returns_not_found()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"{LogoEndpoint}/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Rejects_an_unsupported_content_type()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "logo-bad-type@example.com");

        var response = await client.PostAsync(LogoEndpoint, LogoFormContent([1, 2, 3, 4], "application/pdf"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Rejects_a_file_whose_bytes_do_not_match_its_claimed_type()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "logo-bad-signature@example.com");

        // Claims to be a PNG via content type, but the bytes don't have a PNG (or any accepted)
        // signature - exactly the "reject renamed files" requirement (FSD section 14).
        var response = await client.PostAsync(LogoEndpoint, LogoFormContent([1, 2, 3, 4, 5, 6, 7, 8], "image/png"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Rejects_a_file_over_the_five_megabyte_limit()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "logo-too-big@example.com");

        var response = await client.PostAsync(LogoEndpoint, LogoFormContent(ValidPngBytes(5 * 1024 * 1024 + 1), "image/png"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Removing_a_logo_clears_the_url_and_stops_serving_it()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "logo-remove@example.com");
        var uploadResponse = await client.PostAsync(LogoEndpoint, LogoFormContent(ValidPngBytes(), "image/png"));
        var uploaded = await uploadResponse.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);

        var removeResponse = await client.DeleteAsync(LogoEndpoint);

        Assert.Equal(HttpStatusCode.OK, removeResponse.StatusCode);
        var removed = await removeResponse.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);
        Assert.Null(removed!.LogoUrl);

        using var anonymousClient = factory.CreateClient();
        var logoResponse = await anonymousClient.GetAsync(uploaded!.LogoUrl);
        Assert.Equal(HttpStatusCode.NotFound, logoResponse.StatusCode);
    }

    [Fact]
    public async Task Replacing_a_logo_with_a_different_format_serves_the_new_one()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "logo-replace@example.com");
        await client.PostAsync(LogoEndpoint, LogoFormContent(ValidPngBytes(), "image/png"));

        var replaceResponse = await client.PostAsync(LogoEndpoint, LogoFormContent(ValidJpegBytes(), "image/jpeg"));
        var profile = await replaceResponse.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);

        using var anonymousClient = factory.CreateClient();
        var logoResponse = await anonymousClient.GetAsync(profile!.LogoUrl);

        Assert.Equal("image/jpeg", logoResponse.Content.Headers.ContentType?.MediaType);
        Assert.Equal(ValidJpegBytes(), await logoResponse.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Uploading_without_a_session_is_unauthorized()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();

        var response = await anonymousClient.PostAsync(LogoEndpoint, LogoFormContent(ValidPngBytes(), "image/png"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Removing_without_a_session_is_unauthorized()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();

        var response = await anonymousClient.DeleteAsync(LogoEndpoint);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
