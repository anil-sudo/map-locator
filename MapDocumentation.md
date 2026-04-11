# ReusableMap Component Documentation

The `ReusableMap` is a domain-agnostic React component built on MapLibre GL.
It handles all map rendering, marker lifecycle, popup management, and user
location — without knowing anything about your specific data shape.

---

## Props

| Prop               | Type              | Default                          | Description |
| :----------------- | :---------------- | :------------------------------- | :---------- |
| `locations`        | `Array`           | `[]`                             | Array of location objects. Each must have `{ latitude, longitude }`. An `id` field is recommended for stable marker identity; falls back to `name`. Any extra fields are forwarded to `onMarkerClick` and `renderPopup`. |
| `highlightedIndex` | `number`          | `-1`                             | Index (into `locations`) of the currently active marker. `-1` = no highlight. |
| `onMarkerClick`    | `Function`        | `undefined`                      | Called with `(locationObject, index)` when a marker is clicked. |
| `userLocation`     | `Object`          | `null`                           | `{ lat, lng }` — renders a pulsing dot at the user's position and flies to it. |
| `renderPopup`      | `Function`        | minimal label popup              | `(locationObject) => HTML string`. Override to render domain-specific popup content. |
| `initialCenter`    | `Array`           | `[10, 50]`                       | `[lng, lat]` starting center. |
| `initialZoom`      | `number`          | `4`                              | Starting zoom level. |
| `mapStyle`         | `string`          | CartoCDN Positron                | MapLibre style URL. |
| `markerColors`     | `Object`          | `{ default, active, hq, branch }`| Override any color key. Keys are matched against `location.type` (lowercased). |
| `className`        | `string`          | `''`                             | Extra CSS class on the container `<div>`. |
| `style`            | `Object`          | `{}`                             | Inline style overrides on the container `<div>`. |

---

## Ref API

Attach a `ref` to access imperative map methods:

```jsx
const mapRef = useRef();
<ReusableMap ref={mapRef} locations={...} />
```

| Method | Description |
| :----- | :---------- |
| `mapRef.current.flyTo(options)` | Fly to a position. Accepts any [MapLibre `flyTo` options](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#flyto). |
| `mapRef.current.showPopup([lng, lat], html)` | Show a popup at coordinates with arbitrary HTML. |
| `mapRef.current.closePopup()` | Close the currently open popup. |
| `mapRef.current.getMap()` | Returns the raw MapLibre `Map` instance for advanced use. |

---

## Usage Examples

### 1. Branch locator (multiple locations)

```jsx
import ReusableMap from './components/ReusableMap';

function BranchLocator({ branches, selectedIdx, onSelect }) {
  return (
    <ReusableMap
      locations={branches}
      highlightedIndex={selectedIdx}
      onMarkerClick={(loc, idx) => onSelect(idx)}
      renderPopup={(loc) => `
        <div style="padding:12px">
          <strong>${loc.name}</strong><br/>
          <span>${loc.city}</span>
        </div>
      `}
      style={{ width: '100%', height: '600px' }}
    />
  );
}
```

### 2. Single user address

```jsx
import ReusableMap from './components/ReusableMap';

function UserAddressMap({ lat, lng, label }) {
  return (
    <ReusableMap
      locations={[{ id: 'user-address', latitude: lat, longitude: lng, label }]}
      initialCenter={[lng, lat]}
      initialZoom={14}
      style={{ width: '100%', height: '300px' }}
    />
  );
}
```

### 3. Delivery tracking (custom popup + imperative flyTo)

```jsx
import { useRef } from 'react';
import ReusableMap from './components/ReusableMap';

function DeliveryMap({ deliveries, activeDelivery }) {
  const mapRef = useRef();

  const focusDelivery = (delivery) => {
    mapRef.current.flyTo({
      center: [delivery.longitude, delivery.latitude],
      zoom: 15,
    });
  };

  return (
    <ReusableMap
      ref={mapRef}
      locations={deliveries}
      renderPopup={(d) => `
        <div style="padding:12px">
          <strong>Driver: ${d.driver}</strong><br/>
          <span>ETA: ${d.eta}</span><br/>
          <span>Status: ${d.status}</span>
        </div>
      `}
      markerColors={{ default: '#F59E0B', active: '#EF4444' }}
      style={{ width: '100%', height: '500px' }}
    />
  );
}
```

### 4. Custom marker colors by type

```jsx
<ReusableMap
  locations={locations}
  markerColors={{
    warehouse: '#8B5CF6',
    depot:     '#EC4899',
    active:    '#EF4444',
  }}
/>
```

---

## File Structure

```
src/
  components/
    ReusableMap.jsx       ← Map component (MapLibre only here)
  styles/
    App.css               ← App-level layout and UI styles
    ReusableMap.css       ← Map-specific styles (user dot, popup overrides)
App.jsx                   ← Business logic, search, filter, data
```

---

## Internal Architecture

- **Stale-closure prevention**: All event listeners read `onMarkerClick`, `locations`, and `renderPopup` via refs, so they never reference stale prop values.
- **Marker diffing**: `syncMarkers()` only creates/removes markers that changed — existing markers are updated in-place.
- **`useMemo` for colors**: The merged `markerColors` object is memoized to prevent unnecessary `syncMarkers` calls.
- **`forwardRef` + `useImperativeHandle`**: Exposes a clean imperative API without leaking internal refs.
- **Popup ownership**: The component manages a single popup at a time; it is closed and replaced on each new highlight.
