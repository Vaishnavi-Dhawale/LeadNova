from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.territory import Territory
from app.models.customer import Customer
from app.models.enquiry import Enquiry, EnquiryStatus, EnquiryPriority, EnquirySource
from app.models.follow_up import FollowUp, FollowUpType, FollowUpStatus
from app.models.email_lead import EmailLead, EmailLeadStatus
from app.models.email import EmailTemplate, EmailHistory
from app.models.campaign import Campaign, CampaignStatus
from app.models.activity_log import ActivityLog, ActivityAction
from app.utils.security import get_password_hash


def ensure_schema_columns(db: Session):
    """Ensure newly introduced optional columns exist in PostgreSQL without breaking tables."""
    alter_statements = [
        "ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS recipient VARCHAR(255);",
        "ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS body_html TEXT;",
        "ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS attachments_info TEXT;",
        "ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS product_interested VARCHAR(150);",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_segment VARCHAR(100) DEFAULT 'All Customers';",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS email_subject VARCHAR(255);",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS email_body TEXT;",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL;",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS recipient_count INTEGER DEFAULT 0;",
    ]
    for stmt in alter_statements:
        try:
            db.execute(text(stmt))
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"[Schema Check Notice] {e}")


def seed_database(db: Session):
    print("Beginning database seeding with machinery sales CRM demo data...")
    ensure_schema_columns(db)

    # 1. Users - Seeded realistic Indian sales organization profiles
    # Amit Kulkarni (ADMIN)
    admin = db.query(User).filter(User.email == "admin@leadnova.com").first()
    if not admin:
        admin = User(
            name="Amit Kulkarni",
            email="admin@leadnova.com",
            password_hash=get_password_hash("Admin@12345"),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
    else:
        admin.name = "Amit Kulkarni"
        admin.role = UserRole.ADMIN

    # Rahul Patil (MANAGER)
    manager = db.query(User).filter(User.email == "manager@leadnova.com").first()
    if not manager:
        manager = User(
            name="Rahul Patil",
            email="manager@leadnova.com",
            password_hash=get_password_hash("Manager@12345"),
            role=UserRole.MANAGER,
            is_active=True
        )
        db.add(manager)
    else:
        manager.name = "Rahul Patil"
        manager.role = UserRole.MANAGER

    # Priya Deshmukh (SALES_USER)
    sales1 = db.query(User).filter(User.email == "sales1@leadnova.com").first()
    if not sales1:
        sales1 = User(
            name="Priya Deshmukh",
            email="sales1@leadnova.com",
            password_hash=get_password_hash("Sales@12345"),
            role=UserRole.SALES_USER,
            is_active=True
        )
        db.add(sales1)
    else:
        sales1.name = "Priya Deshmukh"
        sales1.role = UserRole.SALES_USER

    # Sneha Sharma (SALES_USER)
    sales2 = db.query(User).filter(User.email == "sales2@leadnova.com").first()
    if not sales2:
        sales2 = User(
            name="Sneha Sharma",
            email="sales2@leadnova.com",
            password_hash=get_password_hash("Sales@12345"),
            role=UserRole.SALES_USER,
            is_active=True
        )
        db.add(sales2)
    else:
        sales2.name = "Sneha Sharma"
        sales2.role = UserRole.SALES_USER

    # Rohit Shinde (SALES_USER)
    sales3 = db.query(User).filter(User.email == "sales3@leadnova.com").first()
    if not sales3:
        sales3 = User(
            name="Rohit Shinde",
            email="sales3@leadnova.com",
            password_hash=get_password_hash("Sales@12345"),
            role=UserRole.SALES_USER,
            is_active=True
        )
        db.add(sales3)
    else:
        sales3.name = "Rohit Shinde"
        sales3.role = UserRole.SALES_USER

    db.commit()
    db.refresh(admin)
    db.refresh(manager)
    db.refresh(sales1)
    db.refresh(sales2)
    db.refresh(sales3)

    # 2. Categories - Machinery Sales CRM Business Categories
    default_categories = [
        ("New Equipment", "Next-generation automated packaging and paper conversion machinery"),
        ("Service", "Technical inspection, machine servicing, repairs, and overhauls"),
        ("Spare Parts", "OEM replacement blades, rollers, gears, dies, and tooling"),
        ("Maintenance", "Annual preventative maintenance contracts and calibration"),
        ("Requirement", "Specific machinery and operational equipment specifications"),
        ("Immediate Requirement", "Urgent machinery procurement or production line expansion"),
        ("For Understanding", "Technical feasibility, machine speed, and layout exploration"),
        ("Product Inquiry", "Inquiries regarding specific machinery models and features"),
        ("Price Inquiry", "Commercial quotations, freight, and pricing breakdown requests"),
        ("Enquiry", "General machinery purchase inquiries and company capability reviews"),
        ("Other", "Custom machine integrations, accessories, and general communications")
    ]
    categories_map = {}
    for cat_name, cat_desc in default_categories:
        cat = db.query(Category).filter(Category.name == cat_name).first()
        if not cat:
            cat = Category(name=cat_name, description=cat_desc, is_active=True)
            db.add(cat)
            db.commit()
            db.refresh(cat)
        categories_map[cat_name] = cat

    # 3. Territories - Realistic Indian Territories for Machinery Sales (10 Territories)
    default_territories = [
        ("Mumbai", "South & Central Mumbai, Western Suburbs machinery cluster", "Maharashtra", sales1.id),
        ("Vasai-Virar", "Vasai East industrial estates, Waliv, Kaman, and Virar manufacturing belts", "Maharashtra", sales2.id),
        ("Thane", "Thane city, Wagle Estate, Bhiwandi warehousing & packaging zones", "Maharashtra", sales3.id),
        ("Navi Mumbai", "TTC Industrial Area, Rabale, Mahape, Taloja industrial MIDC", "Maharashtra", sales1.id),
        ("Pune", "Pune, Pimpri-Chinchwad, Chakan, Talegaon manufacturing corridor", "Maharashtra", sales2.id),
        ("Maharashtra", "Rest of Maharashtra, Nashik, Aurangabad, Kolhapur regions", "Maharashtra", sales3.id),
        ("Gujarat", "Ahmedabad, Surat, Vadodara, Rajkot industrial zones", "Gujarat", sales1.id),
        ("North India", "Delhi NCR, Haryana, Punjab, Uttar Pradesh industrial corridor", "North India", sales2.id),
        ("South India", "Bengaluru, Chennai, Hyderabad, Coimbatore industrial clusters", "South India", sales3.id),
        ("West India", "Broader Western region covering Goa, MP, and surrounding hubs", "West India", sales1.id)
    ]
    territories_map = {}
    for t_name, t_desc, t_region, t_user in default_territories:
        t = db.query(Territory).filter(Territory.name == t_name).first()
        if not t:
            t = Territory(name=t_name, description=t_desc, state_region=t_region, assigned_sales_user=t_user, is_active=True)
            db.add(t)
            db.commit()
            db.refresh(t)
        territories_map[t_name] = t

    # 4. Realistic Fictional Indian Machinery Customers
    fictional_customers = [
        {
            "customer_name": "Rajesh Sharma",
            "company_name": "Shree Packaging Solutions",
            "email": "rajesh.sharma@shreepackaging.example.com",
            "phone": "+91 98201 23456",
            "city": "Mumbai",
            "state": "Maharashtra",
            "industry": "Rigid Box & File Manufacturing",
            "source": "WEBSITE",
            "territory_id": territories_map["Mumbai"].id,
            "created_by": sales1.id,
            "notes": "Leading box manufacturer evaluating automatic file making machine line."
        },
        {
            "customer_name": "Suresh Gupta",
            "company_name": "Om Sai Industries",
            "email": "suresh@omsaiindustries.example.com",
            "phone": "+91 98212 34567",
            "city": "Vasai East",
            "state": "Maharashtra",
            "industry": "Cake Board & Corrugated Packaging",
            "source": "REFERRAL",
            "territory_id": territories_map["Vasai-Virar"].id,
            "created_by": sales2.id,
            "notes": "Vasai East packaging unit looking for high-speed Cake Board Making Machine."
        },
        {
            "customer_name": "Anil Patil",
            "company_name": "Mahalaxmi Paper Products",
            "email": "anil.patil@mahalaxmipaper.example.com",
            "phone": "+91 98198 76543",
            "city": "Thane",
            "state": "Maharashtra",
            "industry": "Book Binding & Stationery",
            "source": "CAMPAIGN",
            "territory_id": territories_map["Thane"].id,
            "created_by": sales3.id,
            "notes": "Commercial stationery binder expanding into Hard Case Making Machine line."
        },
        {
            "customer_name": "Manoj Mehta",
            "company_name": "Sai Print & Packaging",
            "email": "manoj@saiprintpack.example.com",
            "phone": "+91 98205 67890",
            "city": "Navi Mumbai",
            "state": "Maharashtra",
            "industry": "Printing & Automatic Packaging",
            "source": "PHONE",
            "territory_id": territories_map["Navi Mumbai"].id,
            "created_by": sales1.id,
            "notes": "Urgent requirement for automatic packaging machine with conveyor integration."
        },
        {
            "customer_name": "Ramesh Kulkarni",
            "company_name": "Krishna Enterprises",
            "email": "ramesh@krishnaenterprises.example.com",
            "phone": "+91 98501 23456",
            "city": "Pune",
            "state": "Maharashtra",
            "industry": "Paper Conversion & Creasing",
            "source": "EMAIL",
            "territory_id": territories_map["Pune"].id,
            "created_by": sales2.id,
            "notes": "Looking for annual service contract and spare parts for creasing machines."
        },
        {
            "customer_name": "Dinesh Panchal",
            "company_name": "Perfect Board Works",
            "email": "dinesh@perfectboardworks.example.com",
            "phone": "+91 98790 43210",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "industry": "Board Pasting & Hard Cover",
            "source": "WALK_IN",
            "territory_id": territories_map["Gujarat"].id,
            "created_by": sales3.id,
            "notes": "Evaluating Automatic Hard Case Making Machine for export orders."
        },
        {
            "customer_name": "Vijay Shinde",
            "company_name": "Mumbai Packaging Solutions",
            "email": "vijay@mumbaipackaging.example.com",
            "phone": "+91 98209 87654",
            "city": "Mumbai",
            "state": "Maharashtra",
            "industry": "Paper Bag & Cutting Machinery",
            "source": "WEBSITE",
            "territory_id": territories_map["Mumbai"].id,
            "created_by": sales1.id,
            "notes": "Looking for cutting machines and heavy duty creasing equipment."
        }
    ]

    customers_map = {}
    for c_data in fictional_customers:
        cust = db.query(Customer).filter(Customer.email == c_data["email"]).first()
        if not cust:
            cust = Customer(**c_data)
            db.add(cust)
            db.commit()
            db.refresh(cust)
        else:
            cust.customer_name = c_data["customer_name"]
            cust.company_name = c_data["company_name"]
            cust.city = c_data["city"]
            cust.phone = c_data["phone"]
            cust.territory_id = c_data["territory_id"]
            db.commit()
            db.refresh(cust)
        customers_map[c_data["company_name"]] = cust

    # Also keep legacy customer keys mapped if already in DB
    for old_name, new_name in [
        ("Apex Industrial Systems", "Shree Packaging Solutions"),
        ("BluePeak Engineering Works", "Om Sai Industries"),
        ("Zenith Precision Automations", "Mahalaxmi Paper Products"),
        ("Orion Tooling Dynamics", "Sai Print & Packaging"),
        ("Hyperion Energy Solutions", "Krishna Enterprises"),
        ("Vortex Logistics Corp", "Perfect Board Works")
    ]:
        old_cust = db.query(Customer).filter(Customer.company_name == old_name).first()
        if old_cust:
            old_cust.company_name = new_name
            db.commit()
            customers_map[new_name] = old_cust

    # 5. Fictional Enquiries - Centered on Machinery Sales
    now = datetime.utcnow()
    fictional_enquiries = [
        {
            "customer_id": customers_map["Shree Packaging Solutions"].id,
            "title": "Requirement for Automatic File Making Machine",
            "product_interested": "Automatic File Making Machine",
            "description": "High-speed automatic file folder making machine with automatic gluing and ring fixing station.",
            "category_id": categories_map["Requirement"].id,
            "territory_id": territories_map["Mumbai"].id,
            "assigned_to": sales1.id,
            "source": EnquirySource.WEBSITE,
            "priority": EnquiryPriority.HIGH,
            "status": EnquiryStatus.IN_PROGRESS,
            "estimated_value": 1850000.0,
            "created_at": now - timedelta(days=25)
        },
        {
            "customer_id": customers_map["Om Sai Industries"].id,
            "title": "Interested in Cake Board Making Machine",
            "product_interested": "Cake Board Making Machine",
            "description": "Commercial inquiry for multi-layer circular and square cake board die cutting and laminating unit.",
            "category_id": categories_map["Product Inquiry"].id,
            "territory_id": territories_map["Vasai-Virar"].id,
            "assigned_to": sales2.id,
            "source": EnquirySource.REFERRAL,
            "priority": EnquiryPriority.MEDIUM,
            "status": EnquiryStatus.FOLLOW_UP,
            "estimated_value": 950000.0,
            "created_at": now - timedelta(days=18)
        },
        {
            "customer_id": customers_map["Mahalaxmi Paper Products"].id,
            "title": "Price enquiry for Hard Case Making Machine",
            "product_interested": "Hard Case Making Machine",
            "description": "Quotation requested for semi-automatic hard book case maker with edge folding and pressing.",
            "category_id": categories_map["Price Inquiry"].id,
            "territory_id": territories_map["Thane"].id,
            "assigned_to": sales3.id,
            "source": EnquirySource.CAMPAIGN,
            "priority": EnquiryPriority.URGENT,
            "status": EnquiryStatus.CONVERTED,
            "estimated_value": 2400000.0,
            "created_at": now - timedelta(days=45)
        },
        {
            "customer_id": customers_map["Sai Print & Packaging"].id,
            "title": "Requirement for automatic packaging machine",
            "product_interested": "Packaging Machine",
            "description": "Urgent procurement of automated shrink wrapping and carton packing machinery for FMCG packaging line.",
            "category_id": categories_map["Immediate Requirement"].id,
            "territory_id": territories_map["Navi Mumbai"].id,
            "assigned_to": sales1.id,
            "source": EnquirySource.PHONE,
            "priority": EnquiryPriority.URGENT,
            "status": EnquiryStatus.NEW,
            "estimated_value": 1200000.0,
            "created_at": now - timedelta(days=2)
        },
        {
            "customer_id": customers_map["Krishna Enterprises"].id,
            "title": "Service & Maintenance for Creasing and Binding Machines",
            "product_interested": "Creasing Machine",
            "description": "Annual service coverage and technical inspection for 4 heavy creasing and book binding units.",
            "category_id": categories_map["Service"].id,
            "territory_id": territories_map["Pune"].id,
            "assigned_to": sales2.id,
            "source": EnquirySource.EMAIL,
            "priority": EnquiryPriority.MEDIUM,
            "status": EnquiryStatus.CONVERTED,
            "estimated_value": 350000.0,
            "created_at": now - timedelta(days=32)
        },
        {
            "customer_id": customers_map["Perfect Board Works"].id,
            "title": "Automatic Hard Case Making Machine line setup",
            "product_interested": "Automatic Hard Case Making Machine",
            "description": "Turnkey proposal for fully automated hard cover case production with vision positioning and auto-feeder.",
            "category_id": categories_map["Enquiry"].id,
            "territory_id": territories_map["Gujarat"].id,
            "assigned_to": sales3.id,
            "source": EnquirySource.WALK_IN,
            "priority": EnquiryPriority.HIGH,
            "status": EnquiryStatus.NEW,
            "estimated_value": 3100000.0,
            "created_at": now - timedelta(days=5)
        },
        {
            "customer_id": customers_map["Mumbai Packaging Solutions"].id,
            "title": "Spare Parts Requirement: Cutting Machine Blades and Rollers",
            "product_interested": "Cutting Machine",
            "description": "Emergency procurement of hardened alloy steel blades and pressure rubber rollers for 42-inch paper cutter.",
            "category_id": categories_map["Spare Parts"].id,
            "territory_id": territories_map["Mumbai"].id,
            "assigned_to": sales1.id,
            "source": EnquirySource.WEBSITE,
            "priority": EnquiryPriority.LOW,
            "status": EnquiryStatus.LOST,
            "estimated_value": 125000.0,
            "created_at": now - timedelta(days=60)
        },
        {
            "customer_id": customers_map["Shree Packaging Solutions"].id,
            "title": "Requirement for Paper Bag Making Machine",
            "product_interested": "Paper Bag Making Machine",
            "description": "Automatic square bottom paper bag making machine with 2-color inline printing for retail paper bag packaging.",
            "category_id": categories_map["Requirement"].id,
            "territory_id": territories_map["Mumbai"].id,
            "assigned_to": sales1.id,
            "source": EnquirySource.EMAIL,
            "priority": EnquiryPriority.HIGH,
            "status": EnquiryStatus.NEW,
            "estimated_value": 1400000.0,
            "created_at": now - timedelta(days=1)
        },
        {
            "customer_id": customers_map["Om Sai Industries"].id,
            "title": "Service Requirement for Binding Machine",
            "product_interested": "Binding Machine",
            "description": "Quarterly preventative servicing and precision roller alignment for automated heavy-duty book binding machine.",
            "category_id": categories_map["Service"].id,
            "territory_id": territories_map["Vasai-Virar"].id,
            "assigned_to": sales2.id,
            "source": EnquirySource.PHONE,
            "priority": EnquiryPriority.MEDIUM,
            "status": EnquiryStatus.IN_PROGRESS,
            "estimated_value": 85000.0,
            "created_at": now - timedelta(days=3)
        }
    ]

    enquiries_list = []
    for enq_data in fictional_enquiries:
        enq = db.query(Enquiry).filter(
            Enquiry.customer_id == enq_data["customer_id"],
            Enquiry.title == enq_data["title"]
        ).first()
        if not enq:
            enq = Enquiry(**enq_data)
            db.add(enq)
            db.commit()
            db.refresh(enq)
        else:
            enq.product_interested = enq_data.get("product_interested")
            enq.category_id = enq_data["category_id"]
            enq.assigned_to = enq_data["assigned_to"]
            db.commit()
            db.refresh(enq)
        enquiries_list.append(enq)

    # 6. Fictional Follow-ups
    fictional_follow_ups = [
        {
            "customer_id": customers_map["Shree Packaging Solutions"].id,
            "enquiry_id": enquiries_list[0].id,
            "assigned_to": sales1.id,
            "follow_up_date": now + timedelta(days=2, hours=3),
            "follow_up_type": FollowUpType.MEETING,
            "notes": "Demonstration of Automatic File Making Machine specs and electrical load requirements at customer plant.",
            "status": FollowUpStatus.PENDING
        },
        {
            "customer_id": customers_map["Om Sai Industries"].id,
            "enquiry_id": enquiries_list[1].id,
            "assigned_to": sales2.id,
            "follow_up_date": now + timedelta(days=1),
            "follow_up_type": FollowUpType.CALL,
            "notes": "Share production capacity and die-cutting video for Cake Board Making Machine.",
            "status": FollowUpStatus.PENDING
        },
        {
            "customer_id": customers_map["Sai Print & Packaging"].id,
            "enquiry_id": enquiries_list[3].id,
            "assigned_to": sales1.id,
            "follow_up_date": now - timedelta(days=1),  # Overdue for dashboard test
            "follow_up_type": FollowUpType.CALL,
            "notes": "Verify automatic packaging machine dimension constraints with maintenance supervisor.",
            "status": FollowUpStatus.PENDING
        },
        {
            "customer_id": customers_map["Mahalaxmi Paper Products"].id,
            "enquiry_id": enquiries_list[2].id,
            "assigned_to": sales3.id,
            "follow_up_date": now - timedelta(days=10),
            "follow_up_type": FollowUpType.VISIT,
            "notes": "Plant inspection and foundation layout cleared for Hard Case Making Machine deployment.",
            "status": FollowUpStatus.COMPLETED
        }
    ]

    for f_data in fictional_follow_ups:
        fu = db.query(FollowUp).filter(
            FollowUp.customer_id == f_data["customer_id"],
            FollowUp.notes == f_data["notes"]
        ).first()
        if not fu:
            fu = FollowUp(**f_data)
            db.add(fu)
            db.commit()

    # 7. Fictional Email Leads - Genuine Machinery Inquiries
    fictional_email_leads = [
        {
            "sender_name": "Devendra Joshi",
            "sender_email": "d.joshi@novafabrications.example.com",
            "recipient": "sales@leadnova.io",
            "subject": "Requirement for Automatic File Making Machine",
            "body": "Dear Sales Team,\n\nWe are looking to set up an automated office file production line at our Vasai East unit.\nWe require a fully Automatic File Making Machine with creasing, eyeleting, and lever arch ring fixing capability.\n\nPlease share:\n1. Detailed machine catalogue & technical specifications\n2. Power consumption and footprint details\n3. Commercial pricing (Ex-works & delivered Mumbai)\n4. Delivery timeline and warranty terms\n\nLooking forward to your swift response.\n\nBest regards,\nDevendra Joshi\nPlant Operations Manager\nNova Fabrications\nPhone: +91 98201 12345",
            "body_html": "<p>Dear Sales Team,</p><p>We are looking to set up an automated office file production line at our Vasai East unit.<br>We require a fully <strong>Automatic File Making Machine</strong> with creasing, eyeleting, and lever arch ring fixing capability.</p><p>Please share:</p><ol><li>Detailed machine catalogue &amp; technical specifications</li><li>Power consumption and footprint details</li><li>Commercial pricing (Ex-works &amp; delivered Mumbai)</li><li>Delivery timeline and warranty terms</li></ol><p>Looking forward to your swift response.</p><p>Best regards,<br><strong>Devendra Joshi</strong><br>Plant Operations Manager<br>Nova Fabrications<br>Phone: +91 98201 12345</p>",
            "company": "Nova Fabrications",
            "category_id": categories_map["Requirement"].id,
            "received_at": now - timedelta(hours=4),
            "status": EmailLeadStatus.NEW,
            "assigned_to": sales1.id
        },
        {
            "sender_name": "Geeta Raman",
            "sender_email": "geeta@southernprecision.example.com",
            "recipient": "enquiry@leadnova.io",
            "subject": "Price enquiry for Hard Case Making Machine",
            "body": "Hello LeadNova Sales,\n\nOur packaging and stationery division is evaluating suppliers for a Hard Case Making Machine and Automatic Hard Case Making Machine.\nCould you provide commercial price estimates and catalog for both semi-automatic and automatic models?\nAlso let us know if an on-site demonstration in Thane or Mumbai is possible next week.\n\nThank you,\nGeeta Raman\nHead of Procurement\nSouthern Precision Works\nMobile: +91 98401 22334",
            "body_html": "<p>Hello LeadNova Sales,</p><p>Our packaging and stationery division is evaluating suppliers for a <strong>Hard Case Making Machine</strong> and <strong>Automatic Hard Case Making Machine</strong>.<br>Could you provide commercial price estimates and catalog for both semi-automatic and automatic models?<br>Also let us know if an on-site demonstration in Thane or Mumbai is possible next week.</p><p>Thank you,<br><strong>Geeta Raman</strong><br>Head of Procurement<br>Southern Precision Works<br>Mobile: +91 98401 22334</p>",
            "company": "Southern Precision Works",
            "category_id": categories_map["Price Inquiry"].id,
            "received_at": now - timedelta(days=1, hours=2),
            "status": EmailLeadStatus.REVIEWED,
            "assigned_to": sales2.id
        },
        {
            "sender_name": "Arjun Singhania",
            "sender_email": "arjun@aerofluxpack.example.com",
            "recipient": "sales@leadnova.io",
            "subject": "Interested in Cake Board Making Machine",
            "body": "Dear LeadNova Team,\n\nWe are launching an expanded bakery board manufacturing plant in Pune.\nWe are interested in your heavy-duty Cake Board Making Machine capable of punching and laminating 1.5mm to 4mm board at high output.\n\nPlease get in touch with our technical director at +91 98220 54321.\n\nSincerely,\nArjun Singhania\nManaging Director\nAeroFlux Packaging",
            "body_html": "<p>Dear LeadNova Team,</p><p>We are launching an expanded bakery board manufacturing plant in Pune.<br>We are interested in your heavy-duty <strong>Cake Board Making Machine</strong> capable of punching and laminating 1.5mm to 4mm board at high output.</p><p>Please get in touch with our technical director at +91 98220 54321.</p><p>Sincerely,<br><strong>Arjun Singhania</strong><br>Managing Director<br>AeroFlux Packaging</p>",
            "company": "AeroFlux Packaging",
            "category_id": categories_map["Product Inquiry"].id,
            "received_at": now - timedelta(days=3),
            "status": EmailLeadStatus.QUALIFIED,
            "assigned_to": sales3.id
        },
        {
            "sender_name": "Manoj Mehta",
            "sender_email": "manoj.mehta@saiprintpack.example.com",
            "recipient": "sales@leadnova.io",
            "subject": "Requirement for automatic packaging machine",
            "body": "Dear LeadNova Machinery Team,\n\nWe require an automated shrink wrapping and carton packaging machine for our high-speed FMCG packaging line in Navi Mumbai.\nCould you please share:\n1. Technical specifications and line speed (packs/min)\n2. Tooling changeover procedure and time\n3. Commercial price quote and delivery timeline\n\nRegards,\nManoj Mehta\nOperations Head\nSai Print & Packaging\nPhone: +91 98205 67890",
            "body_html": "<p>Dear LeadNova Machinery Team,</p><p>We require an automated shrink wrapping and carton packaging machine for our high-speed FMCG packaging line in Navi Mumbai.</p><p>Could you please share:</p><ol><li>Technical specifications and line speed (packs/min)</li><li>Tooling changeover procedure and time</li><li>Commercial price quote and delivery timeline</li></ol><p>Regards,<br><strong>Manoj Mehta</strong><br>Operations Head<br>Sai Print &amp; Packaging<br>Phone: +91 98205 67890</p>",
            "company": "Sai Print & Packaging",
            "category_id": categories_map["Immediate Requirement"].id,
            "received_at": now - timedelta(hours=8),
            "status": EmailLeadStatus.NEW,
            "assigned_to": sales1.id
        },
        {
            "sender_name": "Nilesh Shah",
            "sender_email": "nilesh.shah@apexpackaging.example.com",
            "recipient": "sales@leadnova.io",
            "subject": "Requirement for Paper Bag Making Machine",
            "body": "Dear Sales & Support,\n\nWe are setting up an eco-friendly kraft paper bag manufacturing facility in Vasai East.\nWe are looking for a fully automated square bottom Paper Bag Making Machine with inline 2-color flexographic printing.\n\nPlease arrange a technical demonstration with your engineering team.\n\nBest regards,\nNilesh Shah\nDirector\nApex Packaging Works\nPhone: +91 98331 44556",
            "body_html": "<p>Dear Sales &amp; Support,</p><p>We are setting up an eco-friendly kraft paper bag manufacturing facility in Vasai East.<br>We are looking for a fully automated square bottom <strong>Paper Bag Making Machine</strong> with inline 2-color flexographic printing.</p><p>Please arrange a technical demonstration with your engineering team.</p><p>Best regards,<br><strong>Nilesh Shah</strong><br>Director<br>Apex Packaging Works<br>Phone: +91 98331 44556</p>",
            "company": "Apex Packaging Works",
            "category_id": categories_map["Requirement"].id,
            "received_at": now - timedelta(hours=14),
            "status": EmailLeadStatus.NEW,
            "assigned_to": sales2.id
        },
        {
            "sender_name": "Kavita Nair",
            "sender_email": "kavita.nair@omsaiindustries.example.com",
            "recipient": "service@leadnova.io",
            "subject": "Service Requirement for Binding Machine",
            "body": "Hello Service Desk,\n\nWe require scheduled preventative servicing and roller alignment for our heavy-duty binding machine installed at our Vasai East unit.\nKindly schedule a service engineer visit this week.\n\nThank you,\nKavita Nair\nProduction In-charge\nOm Sai Industries\nPhone: +91 98212 34567",
            "body_html": "<p>Hello Service Desk,</p><p>We require scheduled preventative servicing and roller alignment for our heavy-duty <strong>Binding Machine</strong> installed at our Vasai East unit.<br>Kindly schedule a service engineer visit this week.</p><p>Thank you,<br><strong>Kavita Nair</strong><br>Production In-charge<br>Om Sai Industries<br>Phone: +91 98212 34567</p>",
            "company": "Om Sai Industries",
            "category_id": categories_map["Service"].id,
            "received_at": now - timedelta(days=2),
            "status": EmailLeadStatus.NEW,
            "assigned_to": sales2.id
        }
    ]

    for el_data in fictional_email_leads:
        lead = db.query(EmailLead).filter(EmailLead.sender_email == el_data["sender_email"]).first()
        if not lead:
            lead = EmailLead(**el_data)
            db.add(lead)
            db.commit()
        else:
            lead.subject = el_data["subject"]
            lead.body = el_data["body"]
            lead.body_html = el_data.get("body_html")
            lead.recipient = el_data.get("recipient")
            lead.category_id = el_data.get("category_id")
            db.commit()

    # 8. Standard Email Templates for Machinery Sales
    default_templates = [
        {
            "name": "Standard Commercial Quotation",
            "subject": "Commercial Quotation for {{title}} - LeadNova Machinery",
            "category": "Quotation",
            "body": "Dear {{customer_name}},\n\nThank you for giving LeadNova the opportunity to submit our proposal. Attached please find our detailed technical and commercial quotation for {{title}}.\n\nKey highlights include standard 12-month manufacturer warranty, on-site commissioning by our factory-trained engineers, and guaranteed spare parts support.\n\nWe look forward to partnering with {{company_name}}.\n\nBest regards,\nSales & Engineering Team\nLeadNova Platform"
        },
        {
            "name": "Post-Demo Technical Follow-Up",
            "subject": "Following up on Machinery Demonstration - {{company_name}}",
            "category": "Follow-up",
            "body": "Hi {{customer_name}},\n\nIt was a pleasure demonstrating our equipment for your team regarding {{title}}.\n\nAs reviewed during our session, our machinery offers enhanced throughput, low power consumption, and minimal tooling changeover time.\n\nPlease let us know if you would like to test custom sample materials on our testing bed in Vasai East.\n\nSincerely,\nApplication Engineering Specialist\nLeadNova"
        },
        {
            "name": "Customer Thank You",
            "subject": "Thank you for choosing LeadNova Machinery Solutions",
            "category": "Thank You",
            "body": "Dear {{customer_name}},\n\nWe sincerely appreciate your trust in LeadNova. Your equipment order has been confirmed, and our deployment engineers will coordinate the site preparation checklist shortly.\n\nWarm regards,\nCustomer Success & Support"
        },
        {
            "name": "Initial Enquiry Response",
            "subject": "Acknowledgement of Machinery Enquiry - {{title}}",
            "category": "Enquiry Response",
            "body": "Dear {{customer_name}},\n\nThank you for reaching out to us. We have received your machinery enquiry regarding {{title}} and assigned our regional specialist to review your specifications.\n\nExpect our detailed response and product catalog within 24 business hours.\n\nRegards,\nLeadNova Sales Team"
        },
        {
            "name": "Maintenance & Service Update",
            "subject": "Preventative Maintenance Schedule - {{company_name}}",
            "category": "General",
            "body": "Dear {{customer_name}},\n\nTo ensure maximum uptime and precision for your machinery lines, our regional service team is scheduling preventative maintenance visits for the upcoming quarter.\n\nPlease reply with your preferred inspection dates.\n\nBest regards,\nTechnical Service Department"
        }
    ]

    for tmpl_data in default_templates:
        tmpl = db.query(EmailTemplate).filter(EmailTemplate.name == tmpl_data["name"]).first()
        if not tmpl:
            tmpl = EmailTemplate(**tmpl_data)
            db.add(tmpl)
            db.commit()
        else:
            tmpl.subject = tmpl_data["subject"]
            tmpl.body = tmpl_data["body"]
            db.commit()

    # 9. Fictional Campaigns
    fictional_campaigns = [
        {
            "name": "Western India Machinery & Packaging Expo 2026",
            "description": "Showcase of Automatic File Making and Hard Case Making Machines targeting packaging and paper conversion printers.",
            "status": CampaignStatus.SENT,
            "target_segment": "Interested Customers",
            "email_subject": "Invitation: Visit LeadNova Booth #B-14 at Western India Machinery Expo 2026",
            "email_body": "Dear Partner,\n\nWe cordially invite you to visit LeadNova at Booth #B-14 during the upcoming Western India Machinery & Packaging Expo 2026.\n\nLive machinery demonstrations of our high-speed Rigid Box & Case Making systems will run daily.\n\nWarm regards,\nLeadNova Team",
            "sent_at": now - timedelta(days=5),
            "sent_by": manager.id,
            "recipient_count": 8,
            "start_date": now - timedelta(days=20),
            "end_date": now + timedelta(days=40),
            "created_by": manager.id
        },
        {
            "name": "Annual Preventative Maintenance & Overhaul Drive",
            "description": "Promotional renewal incentives and spare parts discounts for equipment maintenance and servicing agreements.",
            "status": CampaignStatus.SCHEDULED,
            "target_segment": "Existing Customers",
            "email_subject": "Annual Preventative Maintenance & Spare Parts Discount Program",
            "email_body": "Dear Valued Customer,\n\nEnsure uninterrupted operations with our annual preventative maintenance packages and exclusive 15% discount on genuine replacement parts this quarter.\n\nContact our service desk today.\n\nRegards,\nTechnical Service Support",
            "scheduled_at": now + timedelta(days=3),
            "recipient_count": 6,
            "start_date": now - timedelta(days=10),
            "end_date": now + timedelta(days=20),
            "created_by": sales1.id
        },
        {
            "name": "Smart Box & Packaging Automation Webinar Series",
            "description": "Online educational showcase demonstrating productivity improvements with modern Cake Board & Case Making equipment.",
            "status": CampaignStatus.DRAFT,
            "target_segment": "All Customers",
            "email_subject": "Webinar: Boosting Output with Next-Gen Rigid Box Automation",
            "email_body": "Dear Industry Colleague,\n\nJoin our live technical webinar discussing throughput optimizations and rapid changeover techniques for rigid box and packaging production lines.\n\nRegister via our portal.\n\nBest regards,\nLeadNova Technical Team",
            "recipient_count": 12,
            "start_date": now - timedelta(days=90),
            "end_date": now - timedelta(days=60),
            "created_by": admin.id
        }
    ]

    for camp_data in fictional_campaigns:
        camp = db.query(Campaign).filter(Campaign.name == camp_data["name"]).first()
        if not camp:
            camp = Campaign(**camp_data)
            db.add(camp)
            db.commit()
        else:
            camp.description = camp_data["description"]
            camp.status = camp_data["status"]
            camp.target_segment = camp_data.get("target_segment", "All Customers")
            camp.email_subject = camp_data.get("email_subject")
            camp.email_body = camp_data.get("email_body")
            camp.sent_at = camp_data.get("sent_at")
            camp.sent_by = camp_data.get("sent_by")
            camp.scheduled_at = camp_data.get("scheduled_at")
            camp.recipient_count = camp_data.get("recipient_count", 0)
            db.commit()

    # 10. Initial Activity Log
    init_log = db.query(ActivityLog).filter(ActivityLog.action == ActivityAction.LOGIN).first()
    if not init_log:
        db.add(ActivityLog(
            user_id=admin.id,
            action=ActivityAction.LOGIN,
            description="System initialized and seeded with machinery CRM catalogues and Indian demo profiles",
            entity_type="SYSTEM",
            entity_id=1,
            ip_address="127.0.0.1",
            timestamp=now - timedelta(days=5)
        ))
        db.commit()

    print("Database seeding completed successfully with realistic Indian machinery sales data.")


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
