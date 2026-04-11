<!-- # ReusableMap Component Documentation

The `ReusableMap` is a production-level React component built on top of MapLibre GL. It is designed to be highly flexible, abstracted, and performant.

## Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `coordinates` | `Object \| Array` | **Required** | A single `{lat, lng}` or an array of `[{lat, lng, ...}]`. |
| `zoom` | `Number` | `4` | Initial or target zoom level. |
| `height` | `String \| Number` | `'400px'` | Height of the map container. |
| `width` | `String \| Number` | `'100%'` | Width of the map container. |
| `markerType` | `'single' \| 'multiple'` | `'multiple'` | Determines logic for bounds/centering. |
| `onMarkerClick` | `Function` | `undefined` | Callback fired when a marker is clicked. Receives the coordinate object. |
| `className` | `String` | `''` | Additional CSS class for the container. |

## Usage Examples

### 1. Single Location (e.g. User Profile / Address)
```jsx
import ReusableMap from './components/ReusableMap';

function UserAddress({ lat, lng }) {
  return (
    <ReusableMap 
      coordinates={{ lat, lng }} 
      zoom={14} 
      height="300px" 
      markerType="single"
    />
  );
}
```

### 2. Multiple Locations (e.g. Branch Locator)
```jsx
import ReusableMap from './components/ReusableMap';

function BranchLocator({ branches }) {
  const handleMarkerClick = (branch) => {
    console.log("Clicked branch:", branch.name);
  };

  return (
    <ReusableMap 
      coordinates={branches} // Array of objects with lat/lng
      onMarkerClick={handleMarkerClick}
      height="600px"
    />
  );
}
```

## Advanced: Accessing Map Instance
You can use a `ref` to access internal map methods:
```jsx
const mapRef = useRef();

// Fly to a specific location
mapRef.current.flyTo({ center: [lng, lat], zoom: 15 });

// Show a custom popup
mapRef.current.showPopup([lng, lat], "<h1>Hello!</h1>");
```

## Internal Architecture
- **`hooks/useMap.js`**: Custom hook that handles the MapLibre GL lifecycle, marker diffing, and bounds calculation.
- **`components/ReusableMap.module.css`**: Scoped styles for markers and popups to ensure no style leakage.
- **Performance**: Optimized using `useMemo` and `useCallback` to prevent unnecessary map re-renders. -->
