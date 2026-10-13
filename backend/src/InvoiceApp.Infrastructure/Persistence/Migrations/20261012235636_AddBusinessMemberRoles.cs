using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InvoiceApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBusinessMemberRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "role",
                schema: "business",
                table: "business_memberships",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Restricted");

            migrationBuilder.AddColumn<string>(
                name: "role",
                schema: "business",
                table: "business_invitations",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Restricted");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "role",
                schema: "business",
                table: "business_memberships");

            migrationBuilder.DropColumn(
                name: "role",
                schema: "business",
                table: "business_invitations");
        }
    }
}
