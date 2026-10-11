using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InvoiceApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBusinessBankDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "bank_account_name",
                schema: "business",
                table: "businesses",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "bank_account_number",
                schema: "business",
                table: "businesses",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "bank_name",
                schema: "business",
                table: "businesses",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "bank_routing_code",
                schema: "business",
                table: "businesses",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "bank_account_name",
                schema: "business",
                table: "businesses");

            migrationBuilder.DropColumn(
                name: "bank_account_number",
                schema: "business",
                table: "businesses");

            migrationBuilder.DropColumn(
                name: "bank_name",
                schema: "business",
                table: "businesses");

            migrationBuilder.DropColumn(
                name: "bank_routing_code",
                schema: "business",
                table: "businesses");
        }
    }
}
