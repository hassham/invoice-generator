using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InvoiceApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReminderRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "reminder_rules",
                schema: "invoicing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    trigger_type = table.Column<int>(type: "integer", nullable: false),
                    trigger_value = table.Column<int>(type: "integer", nullable: false),
                    email_subject = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    email_body = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_reminder_rules", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "reminders_sent",
                schema: "invoicing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoice_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reminder_rule_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sent_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_reminders_sent", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_reminder_rules_business_id",
                schema: "invoicing",
                table: "reminder_rules",
                column: "business_id");

            migrationBuilder.CreateIndex(
                name: "ix_reminder_rules_business_id_is_active",
                schema: "invoicing",
                table: "reminder_rules",
                columns: new[] { "business_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_reminders_sent_invoice_id",
                schema: "invoicing",
                table: "reminders_sent",
                column: "invoice_id");

            migrationBuilder.CreateIndex(
                name: "ix_reminders_sent_invoice_id_reminder_rule_id",
                schema: "invoicing",
                table: "reminders_sent",
                columns: new[] { "invoice_id", "reminder_rule_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "reminder_rules",
                schema: "invoicing");

            migrationBuilder.DropTable(
                name: "reminders_sent",
                schema: "invoicing");
        }
    }
}
