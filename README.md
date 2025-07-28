# 🚗 IndraNav: Adaptive Driving System

**Full-Stack Web-Based Simulator & Driver Behavior Analyzer**

A comprehensive B.Tech final year project that simulates real-time driving telemetry, applies rule-based adaptive logic for hazard detection, and provides detailed analytics through a modern web interface.

![IndraNav Demo](https://img.shields.io/badge/Status-Complete-green?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%2B%20Node.js%20%2B%20MongoDB-blue?style=for-the-badge)

## 🎯 Project Overview

IndraNav is an advanced driving simulation system that:
- **Simulates** realistic driving scenarios with various weather and road conditions
- **Monitors** real-time telemetry data (speed, GPS, obstacle detection)
- **Analyzes** driver behavior and response patterns  
- **Provides** adaptive safety alerts and recommendations
- **Visualizes** performance metrics through interactive dashboards

## ✨ Key Features

### 🌟 Real-Time Simulation
- Live telemetry data generation (speed, GPS coordinates, obstacle detection)
- WebSocket-powered real-time data streaming
- Configurable weather conditions and road types
- Rule-based hazard detection system

### 📊 Advanced Analytics
- Performance scoring and safety analysis
- Driver reaction time measurement
- Interactive charts and visualizations
- Historical session comparison

### 🎮 Interactive Dashboard
- Live speedometer with color-coded alerts
- Interactive GPS mapping with vehicle tracking
- Real-time alert notifications
- Session management controls

### 📈 Export & Reporting
- PDF report generation with analytics
- CSV data export for further analysis
- Session history tracking
- Performance recommendations

## 🏗️ System Architecture

```
┌─────────────────┐    WebSocket     ┌─────────────────┐
│   React Frontend │ ←──────────────→ │   Node.js       │
│   (Port 5173)   │    REST API      │   Backend       │
│                 │ ←──────────────→ │   (Port 5000)   │
└─────────────────┘                  └─────────────────┘
                                               │
                                               ▼
                                     ┌─────────────────┐
                                     │   MongoDB       │
                                     │   Database      │
                                     │   (Atlas Cloud) │
                                     └─────────────────┘
```

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **Chart.js** - Data visualization & gauges
- **Leaflet** - Interactive GPS mapping
- **Tailwind CSS** - Responsive styling
- **WebSocket** - Real-time communication

### Backend  
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for data modeling
- **WebSocket (ws)** - Real-time communication

### Additional Tools
- **Axios** - HTTP client
- **jsPDF** - PDF generation
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- MongoDB (local or Atlas cloud)
- Modern web browser

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/indranav-adaptive-driving-system.git
cd indranav-adaptive-driving-system
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB connection string
npm start
```

### 3. Frontend Setup
```bash
cd ../frontend  
npm install
cp .env.example .env
# Configure backend URL in .env
npm run dev
```

### 4. Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## 📋 Usage Guide

### Starting a Session
1. Navigate to **Session Controls**
2. Configure weather and road conditions
3. Click **Start Session** to begin simulation
4. Switch to **Live Dashboard** for real-time monitoring

### Monitoring Telemetry
- **Speedometer**: Live speed with safety color coding
- **GPS Map**: Interactive vehicle tracking
- **Obstacle Detection**: Distance warnings and alerts
- **Alert System**: Real-time safety notifications

### Analyzing Performance
1. Complete a session by clicking **Stop Session**
2. Navigate to **Analytics** tab
3. Review performance metrics and safety scores
4. Export data as PDF reports or CSV files

## 📁 Project Structure

```
IndraNav Web/
├── backend/                 # Node.js Backend
│   ├── models/             # Mongoose data models
│   │   ├── Sessions.js     # Session management
│   │   ├── TelemetryLog.js # Real-time data
│   │   ├── Alert.js        # Safety alerts
│   │   └── DriverResponse.js # Response tracking
│   ├── routes/             # API endpoints
│   │   ├── sessions.js     # Session management
│   │   ├── telemetry.js    # Data ingestion
│   │   ├── alerts.js       # Alert management  
│   │   └── response.js     # Response tracking
│   ├── ws/                 # WebSocket server
│   │   └── websocketServer.js
│   ├── db.js              # Database connection
│   ├── server.js          # Main server file
│   └── .env.example       # Environment template
│
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── TelemetryDashboard.jsx
│   │   │   ├── Controls.jsx
│   │   │   └── SessionAnalytics.jsx
│   │   ├── App.jsx        # Main application
│   │   └── index.css      # Global styles
│   ├── .env.example       # Environment template
│   └── README.md          # Frontend documentation
│
└── README.md              # This file
```

## 🔧 Configuration

### Backend Environment (.env)
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/indranav
FRONTEND_URL=http://localhost:5173
```

### Frontend Environment (.env)
```env
VITE_BACKEND_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
VITE_DEFAULT_MAP_LAT=40.7128
VITE_DEFAULT_MAP_LNG=-74.0060
```

## 📊 Data Models

### Session Schema
```javascript
{
  sessionId: String,        // Unique identifier
  startTime: Date,          // Session start
  endTime: Date,           // Session end  
  weather: String,         // Weather conditions
  roadType: String,        // Road type
  status: String           // active/completed
}
```

### Telemetry Schema
```javascript
{
  sessionId: String,       // Reference to session
  timestamp: Date,         // Data timestamp
  speed: Number,           // Vehicle speed (km/h)
  gps: {                   // GPS coordinates
    lat: Number,
    lng: Number
  },
  obstacleDistance: Number // Distance to obstacle (m)
}
```

## 🚨 Safety Alert System

### Alert Types
- **Emergency Brake**: Critical collision warning
- **Collision Warning**: High-risk obstacle detection  
- **Speed Warning**: Excessive speed alert

### Alert Triggers
- **Speed > 120 km/h**: Speed warning
- **Obstacle < 20m**: Collision warning
- **Rapid deceleration**: Emergency brake alert

## 📈 Analytics & Metrics

### Performance Indicators
- **Safety Score**: Overall driving safety (0-100)
- **Average Speed**: Session speed analysis
- **Reaction Time**: Response to alerts
- **Alert Frequency**: Safety incident rate

### Data Visualization
- Speed trend analysis
- Alert distribution charts
- Performance comparison graphs
- Safety score gauges

## 🔄 WebSocket Communication

### Client → Server Messages
```javascript
// Subscribe to session telemetry
{
  "type": "subscribe_telemetry",
  "data": { "sessionId": "session_123" }
}

// Start session simulation  
{
  "type": "start_session", 
  "data": { "sessionId": "session_123" }
}
```

### Server → Client Messages
```javascript
// Real-time telemetry data
{
  "type": "telemetry_data",
  "data": {
    "telemetry": {
      "speed": 75,
      "gps": { "lat": 40.7128, "lng": -74.0060 },
      "obstacleDistance": 45,
      "timestamp": "2024-01-15T10:30:00Z"
    },
    "alert": {
      "type": "speed_warning",
      "severity": "medium", 
      "message": "Speed limit exceeded"
    }
  }
}
```

## 🧪 Testing & Development

### Backend Testing
```bash
cd backend
npm test                    # Run test suite
npm run dev                # Development mode with nodemon
```

### Frontend Testing  
```bash
cd frontend
npm run build              # Production build
npm run preview           # Preview production build
```

### Health Checks
- **Backend**: GET /api/health
- **Database**: Connection status in logs
- **WebSocket**: Connection indicator in UI

## 🚀 Deployment

### Production Build
```bash
# Backend
cd backend
npm install --production
npm start

# Frontend  
cd frontend
npm run build
# Deploy dist/ folder to web server
```

### Environment Setup
- Configure production MongoDB URI
- Update CORS settings for production domain
- Set secure environment variables
- Enable HTTPS for WebSocket connections

## 🔍 Troubleshooting

### Common Issues

**Database Connection**
```bash
# Check MongoDB connection
Error: MongoDB Connection Error: SSL/TLS issues
Solution: Simplify connection options in db.js
```

**WebSocket Connection**
```bash
# Frontend cannot connect to backend WebSocket
Solution: Verify backend WebSocket server is running
Check CORS and firewall settings
```

**Performance Issues**
```bash
# Slow real-time updates
Solution: Reduce telemetry refresh rate
Optimize database queries
```

## 📚 Academic Context

### B.Tech Project Requirements
- **Full-stack development** with modern technologies
- **Real-time data processing** and visualization  
- **Database design** and optimization
- **User interface** design and user experience
- **System integration** and testing

### Learning Outcomes
- Advanced JavaScript (Node.js + React)
- Database design with MongoDB
- Real-time communication with WebSockets
- Data visualization and analytics
- Modern web development practices

## 🤝 Contributing

This is an educational project, but improvements are welcome:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/enhancement`)
3. Commit changes (`git commit -am 'Add enhancement'`)
4. Push to branch (`git push origin feature/enhancement`)
5. Create Pull Request

## 📄 License

This project is created for educational purposes as part of a B.Tech final year project.

## 🙏 Acknowledgments

- **Educational Institution**: For project guidance and support
- **Open Source Community**: For the amazing libraries and tools
- **MongoDB Atlas**: For cloud database hosting
- **Leaflet**: For interactive mapping capabilities

## 📞 Support

For questions and support:
- Check the troubleshooting sections in README files
- Review system logs for error details
- Ensure all prerequisites are properly installed
- Verify network connectivity between components

---

**🎓 B.Tech Final Year Project | IndraNav Adaptive Driving System**  
*Advancing road safety through intelligent simulation and analysis* 