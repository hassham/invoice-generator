using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InvoiceApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReminderFailures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "reminder_failures",
                schema: "invoicing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoice_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reminder_rule_id = table.Column<Guid>(type: "uuid", nullable: false),
                    failure_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    retry_count = table.Column<int>(type: "integer", nullable: false),
                    max_retries = table.Column<int>(type: "integer", nullable: false),
                    is_resolved = table.Column<bool>(type: "boolean", nullable: false),
                    last_retry_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_reminder_failures", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_reminder_failures_invoice_id_reminder_rule_id",
                schema: "invoicing",
                table: "reminder_failures",
                columns: new[] { "invoice_id", "reminder_rule_id" });

            migrationBuilder.CreateIndex(
                name: "ix_reminder_failures_is_resolved_created_at",
                schema: "invoicing",
                table: "reminder_failures",
                columns: new[] { "is_resolved", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "reminder_failures",
                schema: "invoicing");
        }
    }
}
