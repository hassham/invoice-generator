using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InvoiceApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReceipts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "receipts",
                schema: "payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentId = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    BusinessId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReceiptNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IssueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    PaymentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    PaymentMethod = table.Column<int>(type: "integer", nullable: false),
                    PaymentReference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    InvoiceNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    BusinessName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    BusinessEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_receipts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_receipts_BusinessId",
                schema: "payments",
                table: "receipts",
                column: "BusinessId");

            migrationBuilder.CreateIndex(
                name: "IX_receipts_BusinessId_IssueDate",
                schema: "payments",
                table: "receipts",
                columns: new[] { "BusinessId", "IssueDate" });

            migrationBuilder.CreateIndex(
                name: "IX_receipts_InvoiceId",
                schema: "payments",
                table: "receipts",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_receipts_PaymentId",
                schema: "payments",
                table: "receipts",
                column: "PaymentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "receipts",
                schema: "payments");
        }
    }
}
