using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InvoiceApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEstimates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "estimate");

            // Default values match Business.cs's C# defaults (EstimatePrefix/NextEstimateNumber/
            // EstimateNumberPadding) - every business row that already exists gets a sane starting
            // sequence, not zeros/empty-string, matching what any newly-created business gets going
            // forward via EF's normal insert path.
            migrationBuilder.AddColumn<int>(
                name: "estimate_number_padding",
                schema: "business",
                table: "businesses",
                type: "integer",
                nullable: false,
                defaultValue: 4);

            migrationBuilder.AddColumn<string>(
                name: "estimate_prefix",
                schema: "business",
                table: "businesses",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "EST-");

            migrationBuilder.AddColumn<int>(
                name: "next_estimate_number",
                schema: "business",
                table: "businesses",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "estimates",
                schema: "estimate",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    estimate_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    issue_date = table.Column<DateOnly>(type: "date", nullable: false),
                    expiry_date = table.Column<DateOnly>(type: "date", nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    reference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    customer_snapshot = table.Column<string>(type: "jsonb", nullable: false),
                    seller_snapshot = table.Column<string>(type: "jsonb", nullable: false),
                    discount_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    discount_value = table.Column<decimal>(type: "numeric(19,4)", nullable: true),
                    subtotal = table.Column<decimal>(type: "numeric(19,4)", nullable: false),
                    discount_amount = table.Column<decimal>(type: "numeric(19,4)", nullable: false),
                    tax_amount = table.Column<decimal>(type: "numeric(19,4)", nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric(19,4)", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    terms = table.Column<string>(type: "text", nullable: true),
                    payment_instructions = table.Column<string>(type: "text", nullable: true),
                    template_id = table.Column<Guid>(type: "uuid", nullable: true),
                    template_settings = table.Column<string>(type: "jsonb", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_estimates", x => x.id);
                    table.ForeignKey(
                        name: "fk_estimates_businesses_business_id",
                        column: x => x.business_id,
                        principalSchema: "business",
                        principalTable: "businesses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_estimates_customers_customer_id",
                        column: x => x.customer_id,
                        principalSchema: "customer",
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_estimates_templates_template_id",
                        column: x => x.template_id,
                        principalSchema: "document",
                        principalTable: "templates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "estimate_items",
                schema: "estimate",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    estimate_id = table.Column<Guid>(type: "uuid", nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    unit_price = table.Column<decimal>(type: "numeric(19,4)", nullable: false),
                    tax_rate = table.Column<decimal>(type: "numeric(9,4)", nullable: false),
                    discount = table.Column<decimal>(type: "numeric(19,4)", nullable: false),
                    line_subtotal = table.Column<decimal>(type: "numeric(19,4)", nullable: false),
                    tax_amount = table.Column<decimal>(type: "numeric(19,4)", nullable: false),
                    line_total = table.Column<decimal>(type: "numeric(19,4)", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_estimate_items", x => x.id);
                    table.ForeignKey(
                        name: "fk_estimate_items_estimates_estimate_id",
                        column: x => x.estimate_id,
                        principalSchema: "estimate",
                        principalTable: "estimates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_estimate_items_estimate_id",
                schema: "estimate",
                table: "estimate_items",
                column: "estimate_id");

            migrationBuilder.CreateIndex(
                name: "ix_estimates_business_id",
                schema: "estimate",
                table: "estimates",
                column: "business_id");

            migrationBuilder.CreateIndex(
                name: "ix_estimates_business_id_estimate_number",
                schema: "estimate",
                table: "estimates",
                columns: new[] { "business_id", "estimate_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_estimates_customer_id",
                schema: "estimate",
                table: "estimates",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ix_estimates_is_deleted",
                schema: "estimate",
                table: "estimates",
                column: "is_deleted");

            migrationBuilder.CreateIndex(
                name: "ix_estimates_status",
                schema: "estimate",
                table: "estimates",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_estimates_template_id",
                schema: "estimate",
                table: "estimates",
                column: "template_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "estimate_items",
                schema: "estimate");

            migrationBuilder.DropTable(
                name: "estimates",
                schema: "estimate");

            migrationBuilder.DropColumn(
                name: "estimate_number_padding",
                schema: "business",
                table: "businesses");

            migrationBuilder.DropColumn(
                name: "estimate_prefix",
                schema: "business",
                table: "businesses");

            migrationBuilder.DropColumn(
                name: "next_estimate_number",
                schema: "business",
                table: "businesses");
        }
    }
}
