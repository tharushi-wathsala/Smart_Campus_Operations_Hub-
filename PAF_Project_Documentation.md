IT3030 – PAF Assignment 2026
FoC – SLIIT
Creativity (10 Marks)

Unique features, additional enhancements 10 Marks

Total: 100 Marks
Special Notes

# Smart Campus Operations Hub - Project Documentation

## 1. Project Overview
The **Smart Campus Operations Hub** is a modern, production-ready web system designed to streamline university operations. It provides a centralized platform for managing facility and asset bookings (Resources, Labs, Meeting Rooms) and handling maintenance incidents (Fault reports, Technician assignments). 

The system implements a complete end-to-end workflow with role-based access control (RBAC), real-time updates through WebSockets, and secure authentication via Firebase OAuth 2.0.

---

## 2. Technical Stack
| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React (Vite), TypeScript, Tailwind CSS, Heroicons |
| **Backend** | Java (Spring Boot), Maven |
| **Database** | Google Firebase Firestore (NoSQL) |
| **Authentication** | Firebase Auth (OAuth 2.0 / Google Sign-in) |
| **Real-time** | Spring WebSockets (STOMP Protocol) |
| **Tools** | GitHub Actions (CI), Postman (API Testing) |

---

## 3. System Architecture
The application follows a **Decoupled Layered Architecture**:
1.  **Client Layer (React)**: Modular component-based UI using Context API for state management (Auth, Notifications).
2.  **API Layer (Spring Boot)**: RESTful controllers handling HTTP requests and enforcing security via Firebase Filters.
3.  **Service Layer**: Encapsulates business logic, including booking conflict checking and notification broadcasting.
4.  **Data Layer (Firebase)**: Provides scalable, real-time data persistence.

---

## 5. Team Contributions (Work Allocation)

### Member 1: Facilities Catalogue & Resource Management
**What they did:**
- Developed the core **Facilities & Assets Catalogue (Module A)**.
- Implemented the full CRUD lifecycle for campus resources (Lecture halls, labs, equipment).
- Developed a dynamic filtering system for users to find resources based on type, location, and capacity.

**How they did it:**
- **Backend Architecture**: Developed the `ResourceController.java` using Spring Boot REST annotations. Integrated with `ResourceRepository.java` to manage NoSQL persistence in Google Firestore.
- **Access Control**: Implemented strict RBAC using `@PreAuthorize("hasRole('ADMIN')")` on state-changing methods (Create, Update, Delete), ensuring system integrity.
- **Dynamic Filtering**: Utilized **Java Streams API** in the `getAllResources` endpoint. This allows for multi-criteria filtering (search strings, capacity thresholds, and resource types) without complex database queries, significantly reducing latency.
- **Frontend**: Built the `FacilitiesCatalogue.tsx` component, featuring a responsive grid layout with live search capabilities.

**API Endpoint Registry (Member 1):**
| Method | Endpoint | File | Access | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/api/v1/resources` | `ResourceController.java` | Admin | Create new campus asset |
| GET | `/api/v1/resources` | `ResourceController.java` | Public | List all assets + Dynamic filtering |
| GET | `/api/v1/resources/{id}` | `ResourceController.java` | Public | Fetch single asset details |
| PUT | `/api/v1/resources/{id}` | `ResourceController.java` | Admin | Update asset specifications |
| DELETE | `/api/v1/resources/{id}` | `ResourceController.java` | Admin | Remove asset from catalogue |

### Member 2: Booking Management & Conflict Checking
**What they did:**
- Implemented the **Booking Workflow (Module B)** from request to resolution (PENDING → APPROVED/REJECTED/CANCELLED).
- Developed the mission-critical **Scheduling Conflict Prevention** system.
- Created personalized booking views for both Users and Administrators.

**How they did it:**
- **Conflict Validation Logic**: Developed a robust `isResourceAvailable` algorithm in `BookingController.java`. It utilizes `LocalTime` parsing to detect technical overlaps (NewStart < OldEnd && NewEnd > OldStart) across existing approved bookings for the same date/resource.
- **State Management**: Managed the complete status lifecycle (Pending, Approved, Reject, Cancelled) using a custom `BookingStatus` Enum, ensuring data consistency across the NoSQL schema.
- **User Privacy**: Implemented personal data segregation in the `getUserBookings` endpoint, ensuring students only view their own historical allocations via filtered Firestore queries.
- **Frontend**: Developed `Booking.tsx` and `MyBookings.tsx`, featuring a dynamic status tracking UI.

**API Endpoint Registry (Member 2):**
| Method | Endpoint | File | Access | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/api/v1/booking` | `BookingController.java` | User | Request resource/asset |
| GET | `/api/v1/booking/all` | `BookingController.java` | Admin | Master booking registry |
| GET | `/api/v1/booking/user/{uid}` | `BookingController.java` | User | Fetch personal history |
| PATCH | `/api/v1/booking/{id}/status` | `BookingController.java` | Admin | Approve or Reject with reason |
| DELETE | `/api/v1/booking/{id}` | `BookingController.java` | Both | Cancel or remove request |
| PUT | `/api/v1/booking/{id}` | `BookingController.java` | User | Modify pending request |

### Member 3: Incident Ticketing & Maintenance Flow
**What they did:**
- Developed the **Maintenance & Incident Ticketing system (Module C)**.
- Implemented multi-stage ticket workflows (OPEN → IN_PROGRESS → RESOLVED → CLOSED).
- Added support for **Image Attachments** (max 3) and a comprehensive **Comment System**.

**How they did it:**
- **Evidence Handling**: Implemented support for high-fidelity image attachments by mapping Base64 data strings to Firestore objects, enabling technicians to visually triage faults before arriving on-site.
- **Workflow Routing**: Designed the `assignTechnician` logic to facilitate precise work allocation, triggering real-time alerts to both the assigned staff and the student reporter.
- **Dynamic Discussion System**: Built a context-aware comment layer where permissions are enforced at the backend level (authors can only edit/delete their own text), and only relevant stakeholders can participate.
- **Technician Resolution**: Created specialized endpoints for technicians to update progress and attach resolution notes upon task completion.

**API Endpoint Registry (Member 3):**
| Method | Endpoint | File | Access | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/api/v1/tickets` | `MaintenanceTicketController.java` | User | Report a new campus fault |
| GET | `/api/v1/tickets/my` | `MaintenanceTicketController.java` | User | Fetch reported tickets |
| GET | `/api/v1/tickets/admin/all` | `MaintenanceTicketController.java` | Admin | Master triage list |
| PATCH | `/api/v1/tickets/{id}/assign` | `MaintenanceTicketController.java` | Admin | Assign a specific technician |
| PATCH | `/api/v1/tickets/{id}/status` | `MaintenanceTicketController.java` | Admin | Administrative status update |
| GET | `/api/v1/tickets/technician/assigned` | `MaintenanceTicketController.java` | Tech | Fetch assigned task queue |
| PATCH | `/api/v1/tickets/{id}/technician-status` | `MaintenanceTicketController.java` | Tech | Resolve ticket with notes |
| POST | `/api/v1/tickets/{id}/comments` | `MaintenanceTicketController.java` | Auth | Add threaded response |

### Member 4: Security, Notifications & Role Management
**What they did:**
- Integrated **Firebase OAuth 2.0** for secure authentication.
- Implemented **Real-time Notifications (Module D)** using WebSockets.
- Managed **Role-based Access Control (RBAC)** and **System Auditing**.

**How they did it:**
- **Auth Architecture**: Developed the `FirebaseAuthenticationFilter.java` which intercepts every incoming REST request. It performs stateless validation of the Firebase JWT and populates the `SecurityContextHolder` with the user's UID and role-based authorities.
- **RBAC Engine**: Created the User Role Management system utilizing **Firebase Custom Claims**. This allows roles to be verified at the token level, preventing unauthorized access to Admin-only endpoints.
- **Real-time Synchronization**: Built the `NotificationService.java` using `SimpMessagingTemplate` (STOMP). It provides targeted alerts via `/topic/notifications/{uid}` and mass broadcasts via `/topic/broadcasts/{role}`.
- **System Integrity**: Implemented the `AdminController.java` to provide real-time telemetry (CPU, RAM, and database status) and the `AuditLogRepository.java` to track all administrative actions for accountability.

**API Endpoint Registry (Member 4):**
| Method | Endpoint | File | Access | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/api/v1/notifications` | `NotificationController.java` | User | Fetch real-time alerts |
| POST | `/api/v1/notifications/broadcast` | `NotificationController.java` | Admin | Role-based system broadcast |
| PATCH | `/api/v1/notifications/{id}/read` | `NotificationController.java` | User | Mark alert as read |
| GET | `/api/v1/users` | `UserController.java` | Admin | Fetch user account registry |
| PUT | `/api/v1/users/{userId}/role` | `UserController.java` | Admin | Update RBAC via Custom Claims |
| PUT | `/api/v1/users/{userId}/status` | `UserController.java` | Admin | Suspend or Activate accounts |
| GET | `/api/v1/admin/system-health` | `AdminController.java` | Admin | System telemetry and stats |
| GET | `/api/v1/audit-logs` | `AuditController.java` | Admin | Traceability log history |

---

## 5. Innovation & Out-of-the-Box Features
> [!TIP]
> **Real-time Synchronization**: Beyond standard REST, the system uses WebSockets to ensure that when an incident is reported or a booking is cancelled, the Admin and Technician dashboards update instantly without page refreshes.

- **Automated Audit Notifications**: Every critical change (e.g., a technician resolving a ticket) automatically triggers a context-aware notification to the user, improving transparency.
- **Robust Validation**: Implemented strict time-overlap validation for bookings and content-type validation for image attachments (restricting to image files only).
- **Embedded Evidence View**: Support for high-quality image previews directly within the ticket detail view, allowing technicians to assess damage before arriving on-site.

---

## 6. Adherence to Marking Rubric
- **RESTful Principles**: Uses standard HTTP methods (GET, POST, PATCH, DELETE) and appropriate status codes (200 OK, 404 Not Found, 403 Forbidden).
- **Code Quality**: Follows Spring Boot best practices with a clear separation of concerns (Repositories, Services, Controllers).
- **Version Control**: Managed via GitHub with descriptive commits and a consistent branching strategy.
- **Security**: Full OAuth 2.0 implementation with token-based authorization and backend endpoint protection.

---
*Generated for: IT3030 - Programming Applications and Frameworks (2026)*
