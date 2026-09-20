using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InvoiceApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEstimatePublicTokenAndEmailLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "public_token",
                schema: "estimate",
                table: "estimates",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "estimate_email_logs",
                schema: "estimate",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    estimate_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sent_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    to = table.Column<string>(type: "jsonb", nullable: false),
                    cc = table.Column<string>(type: "jsonb", nullable: false),
                    subject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    error_message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_estimate_email_logs", x => x.id);
                    table.ForeignKey(
                        name: "fk_estimate_email_logs_estimates_estimate_id",
                        column: x => x.estimate_id,
                        principalSchema: "estimate",
                        principalTable: "estimates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_estimates_public_token",
                schema: "estimate",
                table: "estimates",
                column: "public_token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_estimate_email_logs_estimate_id",
                schema: "estimate",
                table: "estimate_email_logs",
                column: "estimate_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "estimate_email_logs",
                schema: "estimate");

            migrationBuilder.DropIndex(
                name: "ix_estimates_public_token",
                schema: "estimate",
                table: "estimates");

            migrationBuilder.DropColumn(
                name: "public_token",
                schema: "estimate",
                table: "estimates");
        }
    }
}
