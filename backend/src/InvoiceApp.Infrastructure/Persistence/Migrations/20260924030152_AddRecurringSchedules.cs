using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InvoiceApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurringSchedules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "invoicing");

            migrationBuilder.CreateTable(
                name: "recurring_schedules",
                schema: "invoicing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    invoice_template_id = table.Column<Guid>(type: "uuid", nullable: false),
                    frequency = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    next_run_date = table.Column<DateOnly>(type: "date", nullable: false),
                    auto_send = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_recurring_schedules", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_recurring_schedules_business_id",
                schema: "invoicing",
                table: "recurring_schedules",
                column: "business_id");

            migrationBuilder.CreateIndex(
                name: "ix_recurring_schedules_business_id_is_deleted",
                schema: "invoicing",
                table: "recurring_schedules",
                columns: new[] { "business_id", "is_deleted" });

            migrationBuilder.CreateIndex(
                name: "ix_recurring_schedules_customer_id",
                schema: "invoicing",
                table: "recurring_schedules",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ix_recurring_schedules_next_run_date",
                schema: "invoicing",
                table: "recurring_schedules",
                column: "next_run_date");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "recurring_schedules",
                schema: "invoicing");
        }
    }
}
