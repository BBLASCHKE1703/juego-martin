# proyectofinalLYP
# ToDo List App

Una aplicacion bilingual construida en Next.js, presenta Autentificacion de usuario, manejo de tareas y filtros avanzados.

## Contiene

### Funcionalidades Principales
- **Manejo de tareas**: Crea, edita, borra, y marca como completas
- **Soporte para fecha y hora**: Selecciona día y hora espesifica para tareas, o márcalas como tareas para todo el día.
- **Sistema de categoria**: Organiza las tareas por categoria
- **Tiempo estimado**: Selecciona el tiempo estimado de termino (en horas)
- **Autenticación de usuario**: Sistema seguro de inicio de sesión y registro.
- **Filtrado Avanzado**: Filtra por estado de finalización (all/completed/pending) y fecha.
- **estadísticas sobre las tareas**: Ver análisis de tareas y métricas de productividad
- **Soporte Bilinguo**: Soporte completo de idiomas español e inglés.
- **Persistencia de datos**: Las tareas se guardan en la base de datos MongoDB
- **Diseño responsivo**: Funciona perfectamente en computadoras de escritorio y dispositivos móviles.

### Funciones avanzadas
- **Programación Funcional**: Utiliza funciones puras y funciones de orden superior para filtrar.
- **tareas del día**: Rápidamente filtra las tareas del dáa actual.
- **Actualizaciones en tiempo real**: Actualizaciones de tareas instantáneas sin actualizar la página.
- **Datos específicos del usuario**: Cada usuario tiene su propia lista de tareas privada.

    
### Seguridad
- Validación de entrada tanto en el cliente como en el servidor.
- Validación del formato de correo electrónico.
- Confirmación de contraseña durante el registr.o
- Aislamiento de usuarios (los usuarios solo ven sus propias tareas).

### Tecnologías usadas

- **Frontend**: Next.js 14 (React framework).
- **Backend**: Next.js API Routes.
- **Database**: MongoDB con Mongoose ODM.
- **Styling**: CSS Modules. 
- **Authentication**: Implementación personalizada con MongoDB.

## Componentes clave

### Características de la programación funcional
La aplicación utiliza principios de programación funcional:
- **Funciones Puras**: `filterByStatus`, `filterByDate`, `getTodayDate`.
- **Funcioens de orden mayor**: `composeFilters` para combinar múltiples filtros.
- **operaciones inmutables**: Las actualizaciones de estado crean nuevas matrices/objetos.

### Paradigma Procedural
Ejecución secuencial y lógica procedimental en la aplicación:

-**Controladores de eventos**: handleLogin, handleRegister, agregarTarea - step-by-step procedures
-**Procesamiento de formularios**: Validación secuencial y envío de formularios de autenticación
-**Operaciones de tareas**: alternarTarea, eliminarTarea, editarTarea - procedural task manipulation
-**Operaciones de base de datos**: Ejecución lineal en rutas API (connect → validate → query → respond)
-**Actualizaciones estados**: Modificaciones secuenciales de estados utilizando setTareas, setNuevaTarea

### Paradigma Orientado a Objetos
Estructuras basadas en clases y manipulación de objetos:

-**Mongoose Models**: Clases de usuario y tarea con esquemas y métodos definidos
-**Object Construction**: Objetos de tarea con propiedades (titulo, completada, fecha,categoria, etc.)
-**Encapsulamiento**: MongoDB manejo de conexiones en connectDB() con conexiones en caché
-**Modelado de datos**: Representación de datos estructurados mediante definiciones de esquemas
-**Métodos de instancia**: Operaciones de base de datos a través de instancias de modelo (newUser.save(), Task.find())


## Estructura del proyecto

```
├── app/
│   ├── layout.js                 # Disposición de la raíz con metadatos
│   ├── page.js                   # Componente principal de la lista de tareas pendientes
│   ├── todolist.module.css       # Estilos de componentes principales
│   ├── login/
│   │   ├── page.js              # Login page componentes
│   │   └── login.module.css     # Login page styles
│   ├── register/
│   │   ├── page.js              # Register page componentes
│   │   └── register.module.css  # Register page styles
│   └── api/
│       ├── login/route.js       # Login API endpoint
│       ├── register/route.js    # Registration API endpoint
│       └── tasks/route.js       # Tasks CRUD API endpoint
├── lib/
│   └── mongodb.js               # MongoDB coneccion
├── models/
│   ├── User.js                  # User database schema
│   └── Task.js                  # Task database schema
└── styles/
    └── globals.css              # Global styles
```

## Instalación y configuración

### Prerequisitos
- Node.js (v18 or higher).
- MongoDB database (local or cloud instance like MongoDB Atlas).

### 1. Clonar el repositorio
```bash
git clone <your-repository-url>
cd todo-list-app
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configuración del entorno
Crea a `.env.local` archivo en el directorio:
```env
MONGODB_URI=mongodb://localhost:27017/todolist
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/todolist
```

### 4. Ejecutar el servidor de desarrollo
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) en el buscador.

## Guía de uso

### Primeros pasos
1. **Register**: Crea una nueva cuenta con correo electrónico, nombre de usuario y contraseña.
2. **Login**: Inicie sesión con su nombre de usuario/correo electrónico y contraseña.
3. **Create Tasks**: Agregar nuevas tareas con fechas y horas opcionales.
4. **Manage Tasks**: Editar, completar o eliminar tareas según sea necesario.

### Características de tarea
- **Add Task**: Ingrese el título de la tarea, la fecha opcional y la hora.
- **All-Day Events**: Marca "Todo el día" para tareas de todo el día.
- **Edit Tasks**: Haga clic en "Editar" para modificar los títulos de las tareas.
- **Complete Tasks**: Marque la casilla de verificación para marcar como completo.
- **Delete Tasks**: Elimina las tareas que ya no necesitas.
- **Acceso a metricas**: Vea análisis de productividad a través del panel de métricas

### Opciones de filtrado
- **Status Filter**: Ver todas las tareas, solo las completadas o solo las pendientes.
- **Date Filter**: Filtrar tareas por fecha específica.
- **Today Filter**: Acceso rápido a las tareas de hoy.
- **Clear Filters**: Restablecer todos los filtros para ver todas las tareas.

### Soporte de idiomas
- Cambia entre español e inglés en cualquier momento.
- Todos los elementos de la interfaz están completamente traducidos.
- Las preferencias del usuario se mantienen durante la sesión.

## API Endpoints

### Authentication
- `POST /api/register` - Registrar nuevo usuario.
- `POST /api/login` - Inicio de sesión de usuario.

### Tasks
- `GET /api/tasks?username=<username>` -Obtener las tareas del usuario
- `POST /api/tasks` - Crear nueva tarea

## Database Schema

### User Model
```javascript
{
  email: String (required, unique),
  username: String (required, unique),
  password: String (required)
}
```

### Task Model
```javascript
{
  username: String (required),
  titulo: String (required),
  fecha: String (optional),
  hora: String (optional),
  todoElDia: Boolean,
  completada: Boolean
}
```

**BContruida con Next.js y MongoDB**
