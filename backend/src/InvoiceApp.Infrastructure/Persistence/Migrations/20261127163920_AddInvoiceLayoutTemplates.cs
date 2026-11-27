using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace InvoiceApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceLayoutTemplates : Migration
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
                    { new Guid("8f6a1f2e-3b6f-4b8f-8f0a-000000000004"), true, false, "Studio", null, 4, "studio" },
                    { new Guid("8f6a1f2e-3b6f-4b8f-8f0a-000000000005"), true, false, "Ledger", null, 5, "ledger" },
                    { new Guid("8f6a1f2e-3b6f-4b8f-8f0a-000000000006"), true, false, "Horizon", null, 6, "horizon" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                schema: "document",
                table: "templates",
                keyColumn: "id",
                keyValue: new Guid("8f6a1f2e-3b6f-4b8f-8f0a-000000000004"));

            migrationBuilder.DeleteData(
                schema: "document",
                table: "templates",
                keyColumn: "id",
                keyValue: new Guid("8f6a1f2e-3b6f-4b8f-8f0a-000000000005"));

            migrationBuilder.DeleteData(
                schema: "document",
                table: "templates",
                keyColumn: "id",
                keyValue: new Guid("8f6a1f2e-3b6f-4b8f-8f0a-000000000006"));
        }
    }
}
