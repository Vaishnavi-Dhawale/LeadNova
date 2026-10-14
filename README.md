# LeadNova

> **Intelligent Customer Enquiry Tracking & Advanced Sales Analytics Platform**

LeadNova is an enterprise-grade Customer Relationship Management (CRM) and sales intelligence application engineered to streamline the end-to-end B2B sales lifecycle. It bridges multichannel enquiry capture (including automated IMAP email polling), automated assignment, pipeline stage progression, follow-up scheduling, document repository storage, and real-time business intelligence analytics.

---

## 🌟 Key Architecture & Stack

### **Backend**
- **Framework**: FastAPI (High-performance asynchronous Python REST framework)
- **Database ORM**: SQLAlchemy 2.0 with PostgreSQL (`postgresql+psycopg2`)
- **Data Validation & Serialization**: Pydantic v2 with `ConfigDict(from_attributes=True)`
- **Authentication & Security**: OAuth2 Bearer with JWT (HMAC-SHA256) and Passlib Bcrypt password hashing
- **Role-Based Access Control (RBAC)**: `ADMIN`, `MANAGER`, `SALES_USER`
- **Background Tasks & Scheduler**: APScheduler (Automated periodic IMAP email fetching and overdue follow-up monitoring)
- **Testing**: Pytest with HTTPX test client and isolated SQLite/Postgres test fixtures

### **Frontend**
- **Core**: React 18 with TypeScript & Vite
- **Routing**: React Router v6 with authenticated and role-guarded route trees
- **Styling**: Tailwind CSS with custom branding and responsive layouts
- **Charts & Visualizations**: Recharts (Interactive Donut charts, Bar charts, Area/Trend charts)
- **Icons**: Lucide React icons
- **State & HTTP**: Context API (`AuthContext`, `ToastContext`), Axios with request/response interceptors

---

## 🚀 System Modules & Features

1. **Authentication & RBAC**
   - JWT-secured login, session verification (`/auth/me`), and profile retrieval.
   - Quick one-click demo login buttons for instant role switching during review.
2. **Executive Dashboard**
   - 10 live key performance indicators calculated directly from PostgreSQL queries.
   - Monthly enquiry inflow trends, category distribution donuts, sales rep performance leaderboards, and regional territory breakdowns.
3. **Customer Relationship Management (360° View)**
   - Complete customer directory with advanced search and territory filtering.
   - Customer detail workspace unifying linked enquiries, scheduled follow-ups, documents, outbound emails, and activity trails in a unified tabbed interface.
4. **Sales Enquiries & Pipeline Lifecycle**
   - Full enquiry tracking through stages: `NEW` ➔ `IN_PROGRESS` ➔ `FOLLOW_UP` ➔ `CONVERTED` / `LOST` / `CLOSED`.
   - Priority tagging (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), category allocation, and sales representative assignment.
5. **Follow-Up & Reminder Scheduler**
   - Tabbed views for `Upcoming`, `Overdue`, and `Today's Tasks`.
   - Quick completion toggles, rescheduling, and status updates.
6. **Inbound Email Leads (Automated IMAP Ingestion)**
   - Live integration monitoring for IMAP inbox polling.
   - On-demand "Fetch Now" synchronization trigger.
   - Direct lead conversion workflow: transform raw email inquiries into verified Customer and Enquiry records in a single click.
7. **Direct Email Communications & Template Engine**
   - Outbound email dispatch with SMTP fallback and simulated transmission logging.
   - Reusable message templates organized by sales lifecycle stages.
8. **Marketing Campaigns**
   - Campaign lifecycle management (`PLANNED`, `ACTIVE`, `COMPLETED`, `CANCELLED`) with date tracking and attribution.
9. **Category & Master Data Management**
   - Flexible product/service categorization with active/inactive state management.
10. **Territories & Geographic Allocations**
    - Regional territory mapping linked to designated sales representatives.
11. **Document Repository**
    - Secure file upload and storage with automatic linkage to customers and enquiries.
    - Download and deletion management with file metadata indexing.
12. **Sales Analytics & Performance Reporting**
    - Multi-dimensional analytics: filterable by territory, sales representative, date range, and product category.
    - Pipeline value metrics, conversion ratios, and source breakdown graphs.
13. **Audit Trail & User Management (Admin Only)**
    - Comprehensive tamper-evident activity logging recording actor, entity, action type, IP address, and timestamps.
    - Full user CRUD, role modification, temporary password resets, and account activation toggles.

---

## 🛠️ Quick Start & Setup

### **Prerequisites**
- **Python**: 3.10+
- **Node.js**: 18+ and npm
- **PostgreSQL**: 14+ running locally or remotely

---

### **1. Backend Setup**

```bash
# Navigate to the backend directory
cd backend

# Create and activate Python virtual environment
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Windows Command Prompt:
.venv\Scripts\activate.bat
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Copy .env.example to .env and configure your PostgreSQL credentials:
cp .env.example .env
```

Ensure `.env` contains:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/crm_db
SECRET_KEY=your_secure_random_jwt_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

#### **Seed Database with Clean Generic Fictional Data**
```bash
python -m app.seed
```
*Creates initial tables, master categories, territories, sample customers, pipeline enquiries, follow-ups, and default user accounts.*

#### **Run Automated Test Suite**
```bash
pytest tests -v
```
*Executes all 21 unit and integration tests verifying authentication, customer management, enquiries, follow-ups, and dashboard analytics.*

#### **Start FastAPI Server**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Base URL: `http://localhost:8000/api`
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`

---

### **2. Frontend Setup**

```bash
# Navigate to the frontend directory
cd frontend

# Install npm dependencies
npm install

# Start development server
npm run dev
```
- Application Web Interface: `http://localhost:5173`

---

## 🔑 Default Demo Accounts

Default demo accounts configured for role-based access review:

| Role | Name | Email | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | Amit Kulkarni | `admin@leadnova.com` | Full system access, User management, Audit logs, Master data |
| **Sales Manager** | Rahul Patil | `manager@leadnova.com` | Pipeline monitoring, Team analytics, Territory oversight |
| **Sales Representative** | Priya Deshmukh | `sales1@leadnova.com` | Direct customer relations, Enquiry processing, Follow-up execution |
| **Sales Representative** | Sneha Sharma | `sales2@leadnova.com` | Direct customer relations, Enquiry processing, Follow-up execution |
| **Sales Representative** | Rohit Shinde | `sales3@leadnova.com` | Direct customer relations, Enquiry processing, Follow-up execution |

---

## 📁 Repository Structure

```text
LeadNova/
├── backend/
│   ├── app/
│   │   ├── models/           # SQLAlchemy ORM models (User, Customer, Enquiry, etc.)
│   │   ├── schemas/          # Pydantic v2 schemas for request & response validation
│   │   ├── routers/          # FastAPI API route controllers (13 modules)
│   │   ├── services/         # Business logic, email sender/reader, scheduler
│   │   ├── utils/            # JWT security, dependencies, pagination
│   │   ├── config.py         # Pydantic Settings configuration
│   │   ├── database.py       # SQLAlchemy engine & session factory
│   │   ├── main.py           # Application entrypoint & lifespan events
│   │   └── seed.py           # Generic enterprise database seeder
│   ├── tests/                # Pytest unit & integration test suite
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── components/       # Shared UI components (Modals, Badges, Tables, Layout)
│   │   ├── context/          # React contexts (AuthContext, ToastContext)
│   │   ├── pages/            # 14 distinct application views & workflows
│   │   ├── services/         # Axios API clients
│   │   ├── types/            # TypeScript interfaces and enum declarations
│   │   ├── App.tsx           # Route declarations & RBAC protection guards
│   │   └── main.tsx          # Application bootstrapper
│   ├── package.json          # Node dependencies & build scripts
│   ├── vite.config.ts        # Vite build & proxy configuration
│   └── tailwind.config.js    # Tailwind theme specifications
└── README.md                 # Project documentation
```

---

## 🛡️ License & Compliance
This software is built for enterprise customer enquiry tracking and sales analytics. All customer and organizational records in seed data are strictly fictional and simulated.
