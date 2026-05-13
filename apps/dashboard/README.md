# SignalOps Dashboard

Real-time device monitoring and alert management frontend built with Next.js, React, and TypeScript.

## Features

- **Real-time Dashboard**: Live metrics and alerts using WebSocket connections
- **Interactive Map**: Leaflet-based map with device markers and status indicators
- **Alert Management**: Table view with filtering, sorting, and detail modals
- **System Metrics**: Cards showing total events, active alerts, devices, and queue depth
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS
- **State Management**: Zustand for lightweight state management
- **WebSocket Integration**: Socket.io client for real-time updates

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd apps/dashboard
npm install
```

### Development

```bash
npm run dev
```

The dashboard will be available at `http://localhost:3001`

### Build

```bash
npm run build
npm start
```

## Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

## Project Structure

```
apps/dashboard/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main dashboard page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── MetricCard.tsx
│   ├── AlertTable.tsx
│   └── Map.tsx
├── hooks/                 # Custom React hooks
│   └── useSocket.ts
├── stores/                # Zustand state management
│   └── index.ts
├── lib/                   # Utility functions
│   └── api.ts
├── types/                 # TypeScript types
│   └── index.ts
└── public/                # Static assets
```

## Key Components

### Header

Displays application title, notifications, and settings button.

### Sidebar

Navigation menu with links to dashboard sections.

### Map

Interactive Leaflet map showing device locations with color-coded status markers.

### AlertTable

Sortable table displaying alerts with filtering options.

### MetricCard

Dashboard cards showing key metrics with trend indicators.

## WebSocket Integration

The dashboard uses Socket.io to receive real-time updates:

- `alert:new` - New alert created
- `alert:acknowledged` - Alert acknowledged
- `alert:resolved` - Alert resolved
- `event:processed` - Event processed
- `device:status:changed` - Device status changed
- `queue:depth` - Queue depth update
- `worker:stats` - Worker statistics

## State Management

Using Zustand stores:

- `useAlertStore` - Alert state and operations
- `useEventStore` - Event history
- `useDeviceStore` - Device status and information
- `useSystemStore` - System statistics
- `useUIStore` - UI state (sidebar, filters)

## API Integration

Axios client for REST API calls:

- `fetchAlerts()` - Get alerts with optional filters
- `fetchEvents()` - Get events
- `updateAlertStatus()` - Update alert status
- `fetchSystemStats()` - Get system statistics
- `fetchHealth()` - Health check

## Styling

- **Tailwind CSS** for utility-first styling
- **Lucide React** for icons
- Custom color schemes for severity levels and status indicators

## Performance Considerations

- Dynamic imports for code splitting
- Image optimization with Next.js
- Efficient state management with Zustand
- WebSocket connection pooling
- Alert deduplication

## Development Tips

1. Use the WebSocket hook to connect automatically
2. Leverage Zustand stores for global state
3. Keep components focused and composable
4. Use TypeScript for type safety
5. Test WebSocket connections in browser DevTools

## Building for Production

```bash
npm run build
npm start
```

Docker image:

```bash
docker build -f infrastructure/Dockerfile.dashboard -t signalops-dashboard .
```

## License

MIT
