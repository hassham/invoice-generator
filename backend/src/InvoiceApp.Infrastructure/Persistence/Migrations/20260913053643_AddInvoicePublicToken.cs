using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InvoiceApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoicePublicToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "public_token",
                schema: "invoice",
                table: "invoices",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_invoices_public_token",
                schema: "invoice",
                table: "invoices",
                column: "public_token",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_invoices_public_token",
                schema: "invoice",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "public_token",
                schema: "invoice",
                table: "invoices");
        }
    }
}
