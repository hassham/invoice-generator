using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace InvoiceApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SeedTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                schema: "document",
                table: "templates",
                columns: new[] { "id", "is_active", "is_premium", "name", "preview_image", "sort_order", "template_code" },
                values: new object[,]
                {
                    { new Guid("8f6a1f2e-3b6f-4b8f-8f0a-000000000001"), true, false, "Classic", null, 1, "classic" },
                    { new Guid("8f6a1f2e-3b6f-4b8f-8f0a-000000000002"), true, false, "Modern", null, 2, "modern" },
                    { new Guid("8f6a1f2e-3b6f-4b8f-8f0a-000000000003"), true, false, "Minimal", null, 3, "minimal" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                schema: "document",
                table: "templates",
                keyColumn: "id",
                keyValue: new Guid("8f6a1f2e-3b6f-4b8f-8f0a-000000000001"));

            migrationBuilder.DeleteData(
                schema: "document",
                table: "templates",
                keyColumn: "id",
                keyValue: new Guid("8f6a1f2e-3b6f-4b8f-8f0a-000000000002"));

            migrationBuilder.DeleteData(
                schema: "document",
                table: "templates",
                keyColumn: "id",
                keyValue: new Guid("8f6a1f2e-3b6f-4b8f-8f0a-000000000003"));
        }
    }
}
