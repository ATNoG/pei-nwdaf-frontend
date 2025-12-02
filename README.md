# AION Dashboard

Frontend repository for the AION project - A React-based dashboard for monitoring network analytics and ML-based resource control.

## Features

- **Service Status Overview**: Real-time monitoring of microservices with response times and status indicators
- **Raw Data Table**:
  - Displays all 41 columns from the network CSV (horizontally scrollable with sticky headers)
  - Color-coded metrics for quick visual analysis (latency, RSRP signal strength)
  - Vertical scrolling for large datasets
- **Left Sidebar Navigation**: Clean navigation menu with user profile
- **Blue-themed UI**: Modern dark theme with blue accents inspired by network intelligence dashboards

## Tech Stack

- React 19
- Tailwind CSS 4
- Vite 7

## Getting Started

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Build for production:

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── Sidebar.jsx              # Left navigation sidebar
│   ├── ServiceStatusOverview.jsx # Service status cards
│   └── DataTable.jsx            # Reusable table component
├── data/
│   └── latencyData.js          # Static network latency/signal data (from CSV)
├── App.jsx                      # Main application component
├── main.jsx                     # Application entry point
└── index.css                    # Global styles with Tailwind directives
```

## Customization

### Updating Data

To update the static data, edit the file in `src/data/`:
- `latencyData.js` - Network latency and signal quality data (based on CSV structure)

Later this will be connected to dynamic CSV file loading.

### Color Scheme

The blue theme is defined in `tailwind.config.js`:
- Navy backgrounds: `navy-900`, `navy-800`, `navy-700`
- Blue accents: `azure-500`, `azure-600`

## Future Enhancements

- Connect to real-time data sources
- CSV file upload functionality
- Dynamic ML model integration
- Charts and visualizations
- Export functionality
