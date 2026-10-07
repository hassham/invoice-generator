using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InvoiceApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCreditNoteNumberUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "ix_credit_notes_business_id_credit_note_number",
                schema: "invoicing",
                table: "credit_notes",
                columns: new[] { "business_id", "credit_note_number" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_credit_notes_business_id_credit_note_number",
                schema: "invoicing",
                table: "credit_notes");
        }
    }
}
