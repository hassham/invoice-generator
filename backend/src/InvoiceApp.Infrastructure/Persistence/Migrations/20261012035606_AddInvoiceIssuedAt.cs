using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InvoiceApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceIssuedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "issued_at",
                schema: "invoice",
                table: "invoices",
                type: "timestamp with time zone",
                nullable: true);

            // IG-315: invoices already emailed successfully were issued at that send. Backfill from the
            // email log so existing data means what the new column says. Failed sends do not count.
            migrationBuilder.Sql(@"
                UPDATE invoice.invoices AS i
                SET issued_at = sent.first_sent
                FROM (
                    SELECT invoice_id, MIN(sent_at) AS first_sent
                    FROM invoice.invoice_email_logs
                    WHERE status = 'Sent'
                    GROUP BY invoice_id
                ) AS sent
                WHERE sent.invoice_id = i.id
                  AND i.issued_at IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "issued_at",
                schema: "invoice",
                table: "invoices");
        }
    }
}
