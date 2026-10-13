using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InvoiceApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceEmailOpenTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "first_opened_at",
                schema: "invoice",
                table: "invoice_email_logs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "open_count",
                schema: "invoice",
                table: "invoice_email_logs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "open_token",
                schema: "invoice",
                table: "invoice_email_logs",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_invoice_email_logs_open_token",
                schema: "invoice",
                table: "invoice_email_logs",
                column: "open_token",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_invoice_email_logs_open_token",
                schema: "invoice",
                table: "invoice_email_logs");

            migrationBuilder.DropColumn(
                name: "first_opened_at",
                schema: "invoice",
                table: "invoice_email_logs");

            migrationBuilder.DropColumn(
                name: "open_count",
                schema: "invoice",
                table: "invoice_email_logs");

            migrationBuilder.DropColumn(
                name: "open_token",
                schema: "invoice",
                table: "invoice_email_logs");
        }
    }
}
