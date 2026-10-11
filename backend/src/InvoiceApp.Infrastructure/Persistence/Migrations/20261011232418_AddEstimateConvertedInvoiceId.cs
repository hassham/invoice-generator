using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InvoiceApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEstimateConvertedInvoiceId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "converted_invoice_id",
                schema: "estimate",
                table: "estimates",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_estimates_converted_invoice_id",
                schema: "estimate",
                table: "estimates",
                column: "converted_invoice_id");

            migrationBuilder.AddForeignKey(
                name: "fk_estimates_invoices_converted_invoice_id",
                schema: "estimate",
                table: "estimates",
                column: "converted_invoice_id",
                principalSchema: "invoice",
                principalTable: "invoices",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_estimates_invoices_converted_invoice_id",
                schema: "estimate",
                table: "estimates");

            migrationBuilder.DropIndex(
                name: "ix_estimates_converted_invoice_id",
                schema: "estimate",
                table: "estimates");

            migrationBuilder.DropColumn(
                name: "converted_invoice_id",
                schema: "estimate",
                table: "estimates");
        }
    }
}
