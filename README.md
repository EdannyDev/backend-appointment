# 🚀Gestor de Citas – Backend

## 📌Descripción
Este es el **backend del sistema Gestor de Citas**, una aplicación diseñada para administrar reservas de servicios de manera eficiente, con control de servicios, días bloqueados y horarios laborales. El sistema permite a los clientes agendar, consultar y cancelar citas, mientras que los administradores pueden gestionar servicios, horarios, días bloqueados y el estado de las citas.

**Funcionalidades principales:**

- Autenticación de usuarios mediante **JWT**.
- Gestión de usuarios con roles (**ADMIN / CLIENT**).
- Creación y gestión de servicios (duración, precio y estado).
- Gestión de citas:
  - Creación según disponibilidad.
  - Validación de horarios laborales.
  - Prevención de solapamientos.
  - Cancelación y cambio de estado.
- Gestión de horarios laborales por día de la semana.
- Bloqueo de días no disponibles.
- Consulta de horarios disponibles por servicio y fecha.
- Manejo de cookies seguras para sesión.

## 🛠️Tecnologías utilizadas

- **Node.js**
- **Express** (API REST)
- **MySQL** (Base de datos relacional)
- **mysql2** (Conexión a BD con Promises)
- **JWT** (Autenticación y autorización)
- **bcryptjs** (Encriptación de contraseñas)
- **dotenv** (Variables de entorno)
- **cookie-parser** (Manejo de cookies)
- **CORS** (Comunicación con frontend)

## ⚙️Instalación y ejecución

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/backend-appointments.git

# 2. Instalar dependencias
npm install

# 3. Configuración de variables de entorno
Crea un archivo .env en la raíz del proyecto con las siguientes variables:

PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=appointmentsDB
JWT_SECRET=tu_secreto_jwt
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:3000

Reemplaza los valores por unos reales.

# 4. Ejecutar la aplicación
npm start

# 5. La API estará disponible en:
http://localhost:5000

```

## ✨Endpoints principales
- Autenticación: `/api/v1/auth`
- Servicios: `/api/v1/services`
- Citas: `/api/v1/appointments`
- Horarios laborales: `/api/v1/business-hours`
- Días bloqueados: `/api/v1/blocked-days`

## 🔗Enlaces útiles
Frontend: https://github.com/EdannyDev/frontend-appointments