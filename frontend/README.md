# IndraNav Frontend

Real-time web dashboard for the IndraNav Adaptive Driving System simulator.

## 🚀 Features

- **Real-time Telemetry Dashboard**: Live speedometer, GPS tracking, and obstacle detection
- **Interactive Maps**: Leaflet-powered GPS visualization with real-time vehicle tracking
- **Session Management**: Start, stop, and configure driving sessions
- **Advanced Analytics**: Performance metrics, safety scoring, and driver behavior analysis
- **Export Capabilities**: PDF reports and CSV data export
- **Responsive Design**: Modern UI with Tailwind CSS
- **WebSocket Integration**: Real-time data streaming from backend
- **Alert System**: Visual and audio notifications for safety alerts

## 📋 Prerequisites

- Node.js 16+ and npm/yarn
- Running IndraNav backend server
- Modern web browser with WebSocket support

## 🛠️ Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your backend URL and configuration
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   ```
   http://localhost:5173
   ```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Backend API endpoint
VITE_BACKEND_URL=http://localhost:5000

# WebSocket endpoint for real-time data
VITE_WS_URL=ws://localhost:5000

# Optional configurations
VITE_DEFAULT_MAP_LAT=40.7128
VITE_DEFAULT_MAP_LNG=-74.0060
VITE_TELEMETRY_REFRESH_RATE=1000
```

### Backend Connection

Ensure your backend server is running on the configured URL before starting sessions.

## 📱 Usage

### 1. Session Controls
- Configure weather conditions and road type
- Start a new driving session
- Monitor session status and duration
- Stop sessions and view results

### 2. Live Dashboard
- **Speedometer**: Real-time speed gauge with historical trend
- **Obstacle Detection**: Distance monitoring with visual alerts
- **GPS Tracking**: Interactive map with vehicle position
- **Alert Management**: Real-time safety notifications

### 3. Analytics
- **Performance Metrics**: Speed analysis, reaction times, safety scores
- **Data Visualization**: Interactive charts and graphs
- **Export Options**: PDF reports and CSV data downloads
- **Session Comparison**: Historical session analysis

## 🎨 Components

### Core Components

- **`App.jsx`**: Main application layout and routing
- **`TelemetryDashboard.jsx`**: Real-time data visualization
- **`Controls.jsx`**: Session management interface  
- **`SessionAnalytics.jsx`**: Performance analysis dashboard

### Key Features

- **WebSocket Integration**: Real-time data streaming
- **Chart.js Visualizations**: Interactive gauges and charts
- **Leaflet Maps**: GPS tracking and route visualization
- **Export Functionality**: PDF/CSV generation
- **Toast Notifications**: User feedback system

## 🔌 API Integration

### REST Endpoints

```javascript
// Session Management
POST /api/sessions/start
POST /api/sessions/end  
GET  /api/sessions/:id/analytics
GET  /api/sessions/:id/logs

// Real-time Data
WebSocket: ws://backend-url/ws
```

### WebSocket Messages

```javascript
// Subscribe to telemetry
{
  "type": "subscribe_telemetry",
  "data": { "sessionId": "session_123" }
}

// Receive telemetry data
{
  "type": "telemetry_data", 
  "data": {
    "telemetry": { "speed": 65, "gps": {...}, "obstacleDistance": 45 },
    "alert": { "type": "speed_warning", "severity": "medium" }
  }
}
```

## 🎯 Architecture

```
src/
├── components/           # React components
│   ├── TelemetryDashboard.jsx
│   ├── Controls.jsx
│   └── SessionAnalytics.jsx
├── App.jsx              # Main application
├── index.css            # Global styles
└── main.jsx             # Application entry point
```

## 🚀 Building for Production

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Preview the build**:
   ```bash
   npm run preview
   ```

3. **Deploy** the `dist` folder to your web server.

## 🔍 Troubleshooting

### Connection Issues

1. **Backend Not Connected**:
   - Verify backend server is running on correct port
   - Check CORS configuration in backend
   - Ensure `.env` has correct backend URL

2. **WebSocket Errors**:
   - Confirm WebSocket endpoint is accessible
   - Check firewall/proxy settings
   - Verify backend WebSocket server is running

3. **Map Not Loading**:
   - Check internet connection for map tiles
   - Verify GPS coordinates are valid
   - Ensure Leaflet CSS is loaded

### Performance Issues

1. **Slow Rendering**:
   - Reduce telemetry refresh rate in `.env`
   - Limit historical data points displayed
   - Check browser developer tools for memory usage

2. **Export Failures**:
   - Verify sufficient browser permissions for downloads
   - Check data size limits
   - Ensure stable connection during export

## 📊 Dependencies

### Core Dependencies
- **React 18**: UI framework
- **Chart.js**: Data visualization  
- **Leaflet**: Interactive maps
- **Axios**: HTTP client
- **React Hot Toast**: Notifications

### Export Libraries
- **jsPDF**: PDF generation
- **html2canvas**: Screenshot capture
- **file-saver**: File download utility

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is part of a B.Tech final year project for educational purposes.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review backend server logs
3. Check browser developer console for errors
4. Ensure all prerequisites are met

---

**Note**: This frontend requires the IndraNav backend server to be running for full functionality. 