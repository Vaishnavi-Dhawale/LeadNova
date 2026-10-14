"""
Verification script for LeadNova CRM modifications.
Tests DB models, seeding, user profiles, categories, territories, email leads filtering, and conversion workflows.
"""
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.territory import Territory
from app.models.customer import Customer
from app.models.enquiry import Enquiry, EnquiryStatus
from app.models.email_lead import EmailLead, EmailLeadStatus


def run_checks():
    db = SessionLocal()
    try:
        print("\n--- 1. VERIFYING SEEDED USERS ---")
        expected_users = [
            ("Amit Kulkarni", "admin@leadnova.com", UserRole.ADMIN),
            ("Rahul Patil", "manager@leadnova.com", UserRole.MANAGER),
            ("Priya Deshmukh", "sales1@leadnova.com", UserRole.SALES_USER),
            ("Sneha Sharma", "sales2@leadnova.com", UserRole.SALES_USER),
            ("Rohit Shinde", "sales3@leadnova.com", UserRole.SALES_USER),
        ]
        for name, email, role in expected_users:
            u = db.query(User).filter(User.email == email).first()
            assert u is not None, f"Missing user: {email}"
            assert u.name == name, f"User name mismatch: expected {name}, got {u.name}"
            assert u.role == role, f"User role mismatch: expected {role}, got {u.role}"
            print(f"  [OK] User verified: {u.name} ({u.email}) - {u.role}")

        print("\n--- 2. VERIFYING BUSINESS ENQUIRY CATEGORIES ---")
        expected_categories = [
            "Enquiry", "Requirement", "Immediate Requirement", "For Understanding",
            "Product Inquiry", "Price Inquiry", "Service Requirement", "Spare Parts Requirement", "Other"
        ]
        for cat_name in expected_categories:
            c = db.query(Category).filter(Category.name == cat_name).first()
            assert c is not None, f"Missing category: {cat_name}"
            print(f"  [OK] Category verified: {c.name} (id={c.id})")

        print("\n--- 3. VERIFYING REALISTIC INDIAN TERRITORIES ---")
        expected_territories = [
            "Mumbai", "Vasai-Virar", "Thane", "Navi Mumbai", "Pune",
            "Maharashtra", "Gujarat", "North India", "South India", "West India"
        ]
        for t_name in expected_territories:
            t = db.query(Territory).filter(Territory.name == t_name).first()
            assert t is not None, f"Missing territory: {t_name}"
            print(f"  [OK] Territory verified: {t.name} (region={t.state_region})")

        print("\n--- 4. VERIFYING EMAIL LEADS & ORIGINAL CONTENT FIDELITY ---")
        machinery_leads = db.query(EmailLead).filter(
            EmailLead.sender_email.in_([
                "d.joshi@novafabrications.example.com",
                "geeta@southernprecision.example.com",
                "arjun@aerofluxpack.example.com"
            ])
        ).all()
        assert len(machinery_leads) >= 3, "Expected at least 3 seeded machinery email leads"
        for l in machinery_leads:
            print(f"  [OK] Lead #{l.id}: '{l.subject}' from {l.sender_name} <{l.sender_email}>")
            print(f"       Recipient: {l.recipient or 'None'}, Body length: {len(l.body)}, Has HTML: {bool(l.body_html)}")
            assert "\n" in l.body, "Lead body should preserve line breaks"
            assert l.body_html is not None, "Machinery lead should have body_html"
            assert l.recipient is not None, "Machinery lead should have recipient"

        print("\n--- 5. VERIFYING WORKFLOW: CONVERSION WITH NEW MACHINERY CRM FIELDS ---")
        # Create a fresh test lead
        cat = db.query(Category).filter(Category.name == "Requirement").first()
        terr = db.query(Territory).filter(Territory.name == "Vasai-Virar").first()
        rep = db.query(User).filter(User.name == "Priya Deshmukh").first()

        test_lead = EmailLead(
            sender_name="Mukesh Ambani",
            sender_email="procurement@reliance-pack-demo.com",
            recipient="sales@leadnova.io",
            subject="Urgent quote for Cake Board Making Machine and Dies",
            body="Dear LeadNova Team,\n\nWe need 2 units of Cake Board Making Machine delivered to Vasai East.\nLine breaks and paragraphs must be preserved.\n\nRegards,\nMukesh\nPhone: +91 98200 99999",
            status=EmailLeadStatus.NEW
        )
        db.add(test_lead)
        db.commit()
        db.refresh(test_lead)
        print(f"  Created test email lead #{test_lead.id}")

        # Simulate conversion through controller logic
        from app.schemas.email_lead import EmailLeadConvert
        from app.routers.email_leads import convert_email_lead_to_enquiry
        from unittest.mock import MagicMock

        convert_payload = EmailLeadConvert(
            customer_name="Reliance Packaging Division",
            phone="+91 98200 99999",
            category_id=cat.id,
            product_interested="Cake Board Making Machine",
            territory_id=terr.id,
            estimated_value=1750000.0,
            assigned_to=rep.id,
            notes="Automated test conversion"
        )
        req_mock = MagicMock()
        req_mock.client.host = "127.0.0.1"

        res = convert_email_lead_to_enquiry(
            lead_id=test_lead.id,
            convert_in=convert_payload,
            request=req_mock,
            current_user=rep,
            db=db
        )

        assert res.status == EmailLeadStatus.CONVERTED
        assert res.customer_id is not None
        assert res.enquiry_id is not None
        assert res.category_id == cat.id

        # Verify created customer in DB
        cust = db.query(Customer).filter(Customer.id == res.customer_id).first()
        assert cust is not None
        assert cust.customer_name == "Reliance Packaging Division"
        assert cust.phone == "+91 98200 99999"
        print(f"  [OK] Converted Customer created: #{cust.id} - '{cust.customer_name}', Phone: {cust.phone}")

        # Verify created enquiry in DB
        enq = db.query(Enquiry).filter(Enquiry.id == res.enquiry_id).first()
        assert enq is not None
        assert enq.category_id == cat.id
        assert enq.product_interested == "Cake Board Making Machine"
        assert "Cake Board Making Machine" in enq.title
        assert enq.assigned_to == rep.id
        print(f"  [OK] Converted Enquiry created: #{enq.id} - '{enq.title}', Product: {enq.product_interested}")

        # Test deduplication: converting a second lead from the same email should reuse customer
        second_lead = EmailLead(
            sender_name="Mukesh Ambani",
            sender_email="procurement@reliance-pack-demo.com",
            recipient="sales@leadnova.io",
            subject="Second Enquiry for Automatic File Making Machine",
            body="Follow-up requirement for Automatic File Making Machine.",
            status=EmailLeadStatus.NEW
        )
        db.add(second_lead)
        db.commit()
        db.refresh(second_lead)

        res2 = convert_email_lead_to_enquiry(
            lead_id=second_lead.id,
            convert_in=EmailLeadConvert(
                customer_name="Reliance Packaging Division",
                phone="+91 98200 99999",
                category_id=cat.id,
                product_interested="Automatic File Making Machine",
                territory_id=terr.id
            ),
            request=req_mock,
            current_user=rep,
            db=db
        )
        assert res2.customer_id == cust.id, "Customer should be reused (deduplicated) for identical email!"
        print(f"  [OK] Deduplication verified: Second lead #{second_lead.id} linked to existing Customer #{cust.id} without duplication")

        # Clean up test rows
        db.delete(enq)
        db.query(Enquiry).filter(Enquiry.id == res2.enquiry_id).delete()
        db.delete(test_lead)
        db.delete(second_lead)
        db.delete(cust)
        db.commit()
        print("  [OK] Test cleanup completed.")

        print("\nALL VERIFICATION CHECKS PASSED SUCCESSFULLY!\n")
    finally:
        db.close()


if __name__ == "__main__":
    run_checks()
