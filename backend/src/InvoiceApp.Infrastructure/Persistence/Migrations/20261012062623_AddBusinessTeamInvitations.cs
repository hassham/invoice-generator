using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InvoiceApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBusinessTeamInvitations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "business_invitations",
                schema: "business",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    token_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    invited_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    accepted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    accepted_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    cancelled_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_business_invitations", x => x.id);
                    table.ForeignKey(
                        name: "fk_business_invitations_asp_net_users_invited_by_user_id",
                        column: x => x.invited_by_user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_business_invitations_businesses_business_id",
                        column: x => x.business_id,
                        principalSchema: "business",
                        principalTable: "businesses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "business_memberships",
                schema: "business",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    business_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    revoked_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_business_memberships", x => x.id);
                    table.ForeignKey(
                        name: "fk_business_memberships_asp_net_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "identity",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_business_memberships_businesses_business_id",
                        column: x => x.business_id,
                        principalSchema: "business",
                        principalTable: "businesses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_business_invitations_business_id_email",
                schema: "business",
                table: "business_invitations",
                columns: new[] { "business_id", "email" });

            migrationBuilder.CreateIndex(
                name: "ix_business_invitations_invited_by_user_id",
                schema: "business",
                table: "business_invitations",
                column: "invited_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_business_invitations_token_hash",
                schema: "business",
                table: "business_invitations",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_business_memberships_business_id_user_id",
                schema: "business",
                table: "business_memberships",
                columns: new[] { "business_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_business_memberships_user_id",
                schema: "business",
                table: "business_memberships",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "business_invitations",
                schema: "business");

            migrationBuilder.DropTable(
                name: "business_memberships",
                schema: "business");
        }
    }
}
