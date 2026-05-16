# 🚀 Appointment Management System – Backend API

## 📌 Overview
Appointment Management Backend is a RESTful API designed to handle service scheduling with strict availability validation and overlap prevention.

It enforces business-hour constraints, relational data integrity and secure role-based access control.

## 🏗 Architecture
The application follows a layered structure:

- Routes → Define API endpoints  
- Controllers → Handle business logic  
- Middlewares → Authentication & role validation  

The architecture ensures separation of concerns and consistent rule enforcement before data persistence.

## 🔐 Authentication & Security

- Password hashing using `bcryptjs`  
- JWT-based authentication  
- Secure session handling via HttpOnly cookies  
- Role-based authorization middleware  
- Environment-based configuration using `dotenv`

## 👥 Role-Based Access Control (RBAC)

Admin  
- Manage services  
- Configure business hours  
- Block specific dates  
- View and manage all appointments  

Client  
- Register & authenticate  
- Book appointments  
- Cancel appointments  
- View booking history  

Access restrictions are enforced through middleware validation.

## 📦 Core Modules

- Authentication System  
- Service Management  
- Scheduling Engine  
- Business Hours Configuration  
- Blocked Days Management  
- Appointment Status Management  

## 🛠 Tech Stack

`Node.js` · `Express` · `MySQL` · `mysql2`  

`JWT` · `bcryptjs` · `cookie-parser` · `dotenv` · `CORS`  

## ⚙️ Local Setup

```bash
git clone https://github.com/EdannyDev/backend-appointment.git  
npm install  
node server.js
```  

## 🧾 Environment Variables

```bash
PORT=5000  
DB_HOST=localhost  
DB_USER=root  
DB_PASSWORD=  
DB_NAME=appointmentsDB  
JWT_SECRET=your_secret_jwt  
JWT_EXPIRES_IN=1d  
CLIENT_URL=your_frontend_in_production
```