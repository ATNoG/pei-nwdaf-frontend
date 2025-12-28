# AION Dashboard (pei-nwdaf-frontend)

> Project for PEI evaluation 25/26

## Overview

React-based frontend dashboard for the AION platform providing real-time network monitoring and ML-based resource control. Offers comprehensive visualization of network analytics and machine learning model management for the NWDAF system.

## Technologies

- **React** 19.2.0 - Frontend framework
- **Vite** 7.2.6 - Modern, fast development server and build tool
- **Tailwind CSS** 4.1.17 - Utility-first CSS framework
- **React Router DOM** 7.10.1 - Client-side routing
- **Chart.js** 4.4.0 with react-chartjs-2 5.2.0 - Data visualization
- **React Icons** 4.x - Icon library
- **WebSocket** - Real-time communication (custom hook)

## Key Features

### 1. Dashboard (Real-time Network Monitoring)
- Live WebSocket connection to data ingestion stream
- Real-time display of network metrics (last 100 entries):
  - Mean Latency with color-coded health status
  - RSRP (dBm) - signal strength indicator
  - Data rate, SINR, RSRQ, CQI
  - Geographic data (latitude, longitude, altitude, velocity)
  - Cell index, bandwidth information
- Connection status indicator (live/disconnected state)

### 2. ML Registry (MLModels page)
- Browse and manage ML model instances
- Model creation with configurable parameters:
  - Analytics type
  - Prediction horizon
  - Model type selection
- Model training management:
  - Trigger training
  - View training history
  - Real-time training status via WebSocket
  - Training logs tracking
- MLflow integration (link to MLflow UI for detailed experiment tracking)
- Default model management
- Model deletion capability
- Model versioning and staging support

### 3. Analytics Predictions
- Interactive form for generating ML predictions
- Latency predictions with configurable:
  - Analytics type (extensible for future metrics)
  - Cell index (searchable dropdown from available cells)
  - Prediction horizon (time ahead in seconds)
- Prediction result display
- Integration with ML backend API

### 4. Performance Monitoring
- Real-time ML model performance tracking
- Core functionality structure for detailed metrics

## Architecture

### Directory Structure
```
/src
  /components       - Reusable UI (Sidebar, DataTable, ServiceStatusOverview)
  /pages           - Page components (Dashboard, MLModels, Analytics, Performance)
  /contexts        - React Context (ConfigContext for app configuration)
  /hooks           - Custom hooks (useWebSocket for real-time updates)
```

### Key Components
- **Sidebar**: Collapsible navigation, responsive design (< 1024px)
- **App**: Main routing with dynamic page titles
- **useWebSocket**: Custom hook with auto-reconnect logic (max 10 attempts, 3s interval)
- **ConfigContext**: Global configuration from backend (model types, inference configs)

## Backend Integration

- `/data-ingestion/ws/ingestion` - WebSocket for real-time network data
- `/pei-ml` - ML model management and training API
- `/data-storage` - Cell index and data retrieval
- MLflow Server (default: localhost:5000)

## UI Design

- Clean, modern interface with Tailwind CSS
- Responsive layout (sidebar collapses on mobile)
- Color-coded status indicators:
  - Green: Good
  - Yellow: Warning
  - Red: Critical
- Modal dialogs for model creation and training info
- Loading states and error handling
- Smooth animations and transitions

## Quick Start

### Development

```bash
npm install
npm run dev
```

Application available at `http://localhost:5173`

### Docker

```bash
docker compose up --build --watch
```

## Deployment

- Docker support with Dockerfile and docker-compose.yml
- Reverse proxy configuration (nginx)
- Environment-based configuration (.env support)
- CI/CD integration (Jenkinsfile)

## Use Cases

- Network operators monitoring real-time performance metrics
- ML model management for predictive analytics
- Network optimization through ML-driven insights
- QoS monitoring and prediction
