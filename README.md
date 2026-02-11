# TripMate

A modern trip planning application with intelligent route optimization, photo management, AI insights, and video export capabilities.

Built with React, Python (Flask), MySQL, Google Maps API, and AI integration.

---

## Features

✅ **Multiple Destinations with Optimized Route Planning** - Enter multiple destinations and get the most efficient route  
✅ **Interactive Google Maps Visualization** - See your entire trip route on an interactive map  
✅ **Smart Routing** - Automatically chooses between driving and flying based on distance  
✅ **Trip Management** - Save, load, and manage multiple trips  
✅ **Photo Upload & Association** - Upload photos and associate them with specific locations  
✅ **Automated Slideshow** - View a beautiful slideshow of your documented journey  
✅ **AI Chat Assistant** - Ask questions about visited sites and get AI-powered information (Premium)  
✅ **Export Trip Recap** - Export your trip as an MP4 video with photos and route information (Premium)  
✅ **Budget Tracking** - Track expenses and manage trip budgets  
✅ **Reviews & Ratings** - Rate and review destinations  
✅ **User Authentication** - Secure user accounts with JWT authentication  
✅ **Premium Features** - AI chat and video export for premium users  

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 14+** - [Download Node.js](https://nodejs.org/)
- **MySQL 8.0+** - [Download MySQL](https://dev.mysql.com/downloads/mysql/)


---

## Setup Instructions

### Step 1: Extract and Navigate

```bash
# Extract the zip file
cd fyp
```

### Step 2: Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

**Note**: Some packages may require additional system dependencies:
- `moviepy` requires `ffmpeg` to be installed on your system
- `pillow` may require image processing libraries

### Step 3: Install Frontend Dependencies

```bash
cd frontend/tripmate-frontend
npm install
```

### Step 4: Set Up MySQL Database

1. **Install MySQL** (if not already installed)
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Or use MySQL Installer: https://dev.mysql.com/downloads/installer/

2. **Create the Database**
   
   **Option A: Using MySQL Command Line**
   ```bash
   mysql -u root -p < backend/schema_mysql.sql
   ```
   (Enter your MySQL password when prompted)
   
   **Option B: Using MySQL Workbench**
   - Open MySQL Workbench
   - Connect to your MySQL server
   - File → Open SQL Script → Select `backend/schema_mysql.sql`
   - Click Execute (lightning bolt icon)
   
   **Option C: Using MySQL Command Line Client**
   - Open MySQL Command Line Client
   - Enter your password
   - Run: `source C:/path/to/backend/schema_mysql.sql`

3. **Configure Database Connection**
   
   Update `backend/db.py` with your MySQL credentials:
   ```python
   password=os.getenv("DB_PASSWORD", "your_mysql_password_here")
   ```
   
   Or create `backend/.env` file:
   ```
   DB_HOST=localhost
   DB_NAME=tripmate_db
   DB_USER=root
   DB_PASSWORD=your_mysql_password_here
   ```

4. **Create Admin Account** (Optional)
   ```bash
   python create_admin.py
   ```
   Default admin credentials:
   - Username: `admin`
   - Password: `admin123`

### Step 5: Configure API Keys

**Google Maps API Key:**
Create `.env` file in `frontend/tripmate-frontend/`:
```
REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**OpenAI API Key (Optional - for AI chat):**
Set environment variable before running backend:
```bash
# Windows
set OPENAI_API_KEY=your_openai_api_key_here

# Linux/Mac
export OPENAI_API_KEY=your_openai_api_key_here
```

Or create `backend/.env` file:
```
OPENAI_API_KEY=your_openai_api_key_here
```

---

## Running the System

### Start MySQL Service

Make sure MySQL service is running:
- **Windows**: Check Services (search "Services" in Start Menu, look for MySQL80)
- MySQL usually starts automatically, but verify it's running

### Start Backend Server

Open a terminal and run:
```bash
cd backend
python app.py
```

The backend will run on `http://127.0.0.1:5000`

You should see:
```
Loading airports and routes...
Loaded 3257 commercial airports connected by routes.
Server starting... please wait.
 * Running on http://127.0.0.1:5000
```

### Start Frontend Server

Open a **new terminal** and run:
```bash
cd frontend/tripmate-frontend
npm start
```

The frontend will open automatically at `http://localhost:3000`

**Important**: Run both backend and frontend simultaneously in separate terminals.

---

## First Time Setup Checklist

- [ ] Python 3.8+ installed
- [ ] Node.js 14+ installed
- [ ] MySQL 8.0+ installed and running
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] MySQL database created (run `schema_mysql.sql`)
- [ ] Database connection configured (`db.py` or `.env` file)
- [ ] Admin account created (`python create_admin.py`)
- [ ] Google Maps API key configured
- [ ] OpenAI API key configured (optional)

---

## Usage Guide

### 1. Register/Login
- Click "Start planning" on the homepage
- Sign up for a new account or log in
- Use admin account: `admin` / `admin123` (if created)

### 2. Plan a Trip
- Click "Create New Trip" from the trips list
- Enter trip name and description
- Select travel preference (Auto, Driving, or Flying)
- Enter starting point (use autocomplete)
- Add multiple destinations
- Click "Plan & Save Trip"

### 3. View Route
- The optimized route will appear on the interactive map
- See driving routes (blue lines) and flight paths (dashed lines)
- View total distance and route details

### 4. Upload Photos
- After saving a trip, photo upload section will appear
- Select a location from your route
- Upload photos for that location
- Photos are organized by location

### 5. View Slideshow
- Click "View Slideshow" to see all your photos
- Navigate through the automated presentation

### 6. Use AI Chat (Premium)
- Ask questions about your visited locations
- Get AI-powered insights and information

### 7. Export Video (Premium)
- Click "Export Trip Recap"
- Download your trip as an MP4 video

---

## Project Structure

```
fyp/
├── backend/
│   ├── app.py                    # Main Flask application
│   ├── db.py                     # Database connection
│   ├── schema_mysql.sql          # Database schema
│   ├── create_admin.py           # Admin account creation script
│   ├── setup_database.py        # Database setup script
│   ├── routes/
│   │   ├── auth.py              # Authentication (register, login)
│   │   ├── trips.py             # Trip CRUD operations
│   │   ├── photos.py            # Photo upload & management
│   │   ├── ai_chat.py           # AI chat functionality
│   │   ├── export.py            # Video export functionality
│   │   ├── account.py           # Account management
│   │   ├── admin.py             # Admin functions
│   │   ├── premium.py           # Premium subscriptions
│   │   ├── budget.py            # Budget tracking
│   │   ├── notifications.py    # Notifications
│   │   └── reviews.py           # Reviews and ratings
│   ├── uploads/                 # Photo storage (auto-created)
│   └── requirements.txt
└── frontend/
    └── tripmate-frontend/
        ├── src/
        │   ├── App.js           # Main app component
        │   ├── components/
        │   │   ├── HomePage.js      # Landing page
        │   │   ├── Login.js         # Login page
        │   │   ├── Register.js      # Registration page
        │   │   ├── TripList.js      # Trip list/history
        │   │   ├── TripPlanner.js   # Main trip planner
        │   │   ├── PhotoManager.js  # Photo upload & gallery
        │   │   ├── Slideshow.js     # Automated slideshow
        │   │   ├── AIChat.js        # AI chat interface
        │   │   └── ExportButton.js  # Video export component
        │   └── index.css
        └── package.json
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/verify` - Verify token

### Trips
- `GET /api/trips/` - Get all user trips
- `GET /api/trips/<id>` - Get specific trip
- `POST /api/trips/` - Create new trip
- `PUT /api/trips/<id>` - Update trip
- `DELETE /api/trips/<id>` - Delete trip
- `GET /api/trips/search?q=<query>` - Search trips

### Trip Planning
- `POST /api/trip-planner/plan` - Plan optimized route (public, no auth required)

### Photos
- `POST /api/photos/upload` - Upload photos
- `GET /api/photos/trip/<trip_id>` - Get trip photos
- `DELETE /api/photos/<id>` - Delete photo

### AI Chat (Premium)
- `POST /api/ai/chat` - Chat with AI about trip locations

### Export (Premium)
- `POST /api/export/video` - Export trip as MP4 video

### Account
- `GET /api/account` - Get account info
- `PUT /api/account` - Update account
- `DELETE /api/account` - Delete account

### Admin
- `GET /api/admin/users` - Get all users (admin only)
- `POST /api/admin/users` - Create user (admin only)
- `DELETE /api/admin/users/<id>` - Delete user (admin only)

### Premium
- `POST /api/premium/subscribe` - Subscribe to premium
- `GET /api/premium/status` - Check premium status

### Budget
- `GET /api/budget/<trip_id>` - Get trip budget
- `POST /api/budget/<trip_id>/items` - Add budget item

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/<id>/read` - Mark notification as read

### Reviews
- `GET /api/reviews/trip/<trip_id>` - Get trip reviews
- `POST /api/reviews/trip/<trip_id>` - Create review

---

## Troubleshooting

### Backend won't start
- Check if MySQL is running
- Verify database connection in `db.py`
- Make sure all dependencies are installed: `pip install -r requirements.txt`

### Frontend won't start
- Make sure Node.js is installed
- Install dependencies: `npm install`
- Check if port 3000 is available

### Database connection errors
- Verify MySQL service is running
- Check username and password in `db.py`
- Make sure database `tripmate_db` exists
- Verify database credentials are correct in `db.py` or `.env` file

### Google Maps not loading
- Verify `REACT_APP_GOOGLE_MAPS_API_KEY` is set in `.env`
- Check API key is valid and has Maps JavaScript API enabled

### Photos not uploading
- Make sure trip is saved first (has tripId)
- Check `backend/uploads` folder exists and is writable
- Verify file size limits (free users: 5MB, premium: 20MB)

---

## Technical Details

- **Frontend**: React with Google Maps API integration
- **Backend**: Flask REST API with JWT authentication
- **Database**: MySQL 8.0+
- **Authentication**: JWT tokens with bcrypt password hashing
- **AI Integration**: OpenAI GPT-3.5-turbo (optional)
- **Video Export**: MoviePy for MP4 generation
- **Photo Storage**: Local file system (uploads folder)
- **Route Optimization**: Haversine distance + Dijkstra's algorithm for flights

---

## Environment Variables

### Backend (`backend/.env`)
```
DB_HOST=localhost
DB_NAME=tripmate_db
DB_USER=root
DB_PASSWORD=your_mysql_password
OPENAI_API_KEY=your_openai_key (optional)
JWT_SECRET=your-secret-key (optional, defaults to "your-secret-key-change-in-production")
```

### Frontend (`frontend/tripmate-frontend/.env`)
```
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

---

## Default Admin Account

After running `python create_admin.py`:
- **Username**: `admin`
- **Password**: `admin123`
- **Admin**: Yes
- **Premium**: Yes

**Note**: Change the admin password after first login for security.

---

## Deploy to Railway

This repo is set up for a clean GitHub-to-Railway deployment. You'll create **two Railway services** (backend + frontend) and a **MySQL plugin**.

### 1. Push to GitHub

Make sure all changes are committed and pushed to your GitHub repo.

### 2. Create a Railway project

1. Go to [railway.app](https://railway.app) and create a **New Project**.
2. Choose **Deploy from GitHub Repo** and select your repository.

### 3. Add MySQL

1. In your Railway project, click **+ New** > **Database** > **MySQL**.
2. Railway will provision a MySQL instance and set `DATABASE_URL` / `MYSQL_URL` automatically.

### 4. Deploy the Backend

1. Click **+ New** > **GitHub Repo** > select this repo again.
2. In the service **Settings**:
   - Set **Root Directory** to `backend`
   - Set **Start Command** to: `gunicorn -w 2 -b 0.0.0.0:$PORT app:app`
3. In **Variables**, add:
   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | (reference the MySQL plugin variable `${{MySQL.DATABASE_URL}}`) |
   | `FRONTEND_URL` | Your frontend Railway URL, e.g. `https://tripmate-frontend-production.up.railway.app` |
   | `JWT_SECRET` | A long random string |
   | `OPENAI_API_KEY` | *(optional)* Your OpenAI key |
   | `OPENWEATHER_API_KEY` | *(optional)* Your OpenWeatherMap key |
4. Railway will auto-detect `requirements.txt` and deploy.

### 5. Initialize the Database

Open the Railway MySQL shell (or connect via a local client) and run `backend/schema_mysql.sql` to create the tables. Then optionally run `python create_admin.py` (set `DATABASE_URL` first).

### 6. Deploy the Frontend

1. Click **+ New** > **GitHub Repo** > select this repo again.
2. In **Settings**:
   - Set **Root Directory** to `frontend/tripmate-frontend`
   - Set **Build Command** to: `npm install && npm run build`
   - Set **Start Command** to: `npx serve -s build -l $PORT`
3. In **Variables**, add:
   | Variable | Value |
   |---|---|
   | `REACT_APP_API_URL` | Your backend Railway URL, e.g. `https://tripmate-backend-production.up.railway.app` |
   | `REACT_APP_GOOGLE_MAPS_API_KEY` | Your Google Maps API key |

> **Note:** CRA bakes env vars into the build at build time, so set `REACT_APP_*` vars *before* the build runs. If you change them later, trigger a redeploy.

### 7. Verify

- Visit your backend URL at `/health` — you should see `{"status": "healthy", "database": "connected"}`.
- Visit your frontend URL — the app should load and connect to the backend.

### Environment Variables Reference

See `backend/.env.example` and `frontend/tripmate-frontend/.env.example` for all available variables.

---

## Local Production-Like Test

```bash
# 1. Create and activate a virtual environment
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
# source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set environment variables (PowerShell example)
$env:DB_HOST="localhost"
$env:DB_PORT="3306"
$env:DB_NAME="tripmate_db"
$env:DB_USER="root"
$env:DB_PASSWORD="your_password"
$env:FRONTEND_URL="http://localhost:3000"
$env:JWT_SECRET="test-secret"
$env:PORT="5000"

# 4. Run with gunicorn (Linux/Mac only; on Windows use waitress or run app.py directly)
gunicorn -w 2 -b 0.0.0.0:5000 app:app

# 5. Test health endpoint
curl http://localhost:5000/health
```

For the frontend:
```bash
cd frontend/tripmate-frontend
cp .env.example .env   # then edit .env with your values
npm install
npm start
```

---

## Contributors

CSIT321 TripMate FYP Team - S4_06

---

## License

[Your License Here]
