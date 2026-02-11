import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  Autocomplete,
  Polyline,
  Marker,
} from "@react-google-maps/api";
import PhotoManager from "./PhotoManager";
import TripTimeline from "./TripTimeline";
import Slideshow from "./Slideshow";
import AIChat from "./AIChat";
import ExportButton from "./ExportButton";
import SuccessModal from "./SuccessModal";
import WeatherTrafficInfo from "./WeatherTrafficInfo";
import API_URL from "../config";

// Icon components
const CarIcon = ({ size = 24, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
    <circle cx="7" cy="17" r="2"/>
    <path d="M9 17h6"/>
    <circle cx="17" cy="17" r="2"/>
  </svg>
);

const PlaneIcon = ({ size = 24, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
  </svg>
);

const SaveIcon = ({ size = 24, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
    <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/>
    <path d="M7 3v4a1 1 0 0 0 1 1h7"/>
  </svg>
);

const containerStyle = {
  width: "100%",
  height: "60vh",
  minHeight: "400px",
  borderRadius: "12px",
  overflow: "hidden",
};
const defaultCenter = { lat: 1.3521, lng: 103.8198 }; // Singapore

export default function TripPlanner({ token, user, tripId, onBack }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  const [tripName, setTripName] = useState("");
  const [tripDescription, setTripDescription] = useState("");
  const [tripBudget, setTripBudget] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  // Ensure currentTripId is always a number or null
  const [currentTripId, setCurrentTripId] = useState(
    tripId && typeof tripId === 'number' ? tripId : 
    tripId && typeof tripId === 'object' && tripId.id ? tripId.id :
    tripId && !isNaN(Number(tripId)) ? Number(tripId) : null
  );
  const [origin, setOrigin] = useState({ name: "", lat: "", lng: "", country: "" });
  const [originAutocomplete, setOriginAutocomplete] = useState(null);
  const [locations, setLocations] = useState([{ name: "", lat: "", lng: "", country: "" }]);
  const [autocompleteRefs, setAutocompleteRefs] = useState([]);
  const [directions, setDirections] = useState(null);
  const [airportDirections, setAirportDirections] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [routeMode, setRouteMode] = useState("DRIVING");
  const [flightPaths, setFlightPaths] = useState([]);
  const [airportMarkers, setAirportMarkers] = useState([]);
  const [travelPreference, setTravelPreference] = useState("auto");
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [photos, setPhotos] = useState({});
  const [photoViewMode, setPhotoViewMode] = useState("gallery"); // "gallery" or "timeline"
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedData, setLastSavedData] = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [budgetItems, setBudgetItems] = useState([]);
  const [monthlyTripCount, setMonthlyTripCount] = useState({ trips_used: 0, limit: 2 });
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: "", description: "", amount: "" });
  const [isEnded, setIsEnded] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const mapRef = useRef(null);
  const timelineRef = useRef(null);
  const [mapKey, setMapKey] = useState(0);

  const loadTripPhotos = useCallback(async (id) => {
    try {
      const res = await axios.get(`${API_URL}/api/photos/trip/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const photosList = res.data.photos;
      const photosByLocation = {};
      photosList.forEach(photo => {
        if (!photosByLocation[photo.location_name]) {
          photosByLocation[photo.location_name] = [];
        }
        photosByLocation[photo.location_name].push(photo);
      });
      setPhotos(photosByLocation);
    } catch (err) {
      console.error("Error loading photos:", err);
    }
  }, [token]);

  const loadTrip = useCallback(async (id) => {
    try {
      const res = await axios.get(`${API_URL}/api/trips/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const trip = res.data.trip;
      setTripName(trip.name);
      setTripDescription(trip.description || "");
      setTripBudget(trip.budget ? trip.budget.toString() : "");
      setTripStartDate(trip.start_date ? trip.start_date.split('T')[0] : "");
      // Ensure trip.id is converted to a number
      setCurrentTripId(trip.id ? Number(trip.id) : null);
      setTravelPreference(trip.travel_preference || "auto");
      setTotalDistance(trip.total_distance_km || 0);
      setRouteMode(trip.route_mode || "DRIVING");
      
      // Check if trip has already ended
      if (trip.end_date) {
        setIsEnded(true);
      } else {
        setIsEnded(false);
      }
      
      // Store initial state for comparison
      const initialData = {
        name: trip.name,
        description: trip.description || "",
        budget: trip.budget ? trip.budget.toString() : "",
        startDate: trip.start_date ? trip.start_date.split('T')[0] : "",
        travelPreference: trip.travel_preference || "auto"
      };
      setLastSavedData(JSON.stringify(initialData));
      setHasUnsavedChanges(false);
      
      if (trip.origin) {
        setOrigin(trip.origin);
      }
      // Ensure destinations is always an array
      if (trip.destinations) {
        const destinations = Array.isArray(trip.destinations) ? trip.destinations : [];
        setLocations(destinations.length > 0 ? destinations : [{ name: "", lat: "", lng: "", country: "" }]);
      }
      // Ensure optimized_route is always an array
      const route = Array.isArray(trip.optimized_route) ? trip.optimized_route : [];
      setOptimizedRoute(route);
      
      if (route.length > 0) {
        const hasAirports = route.some(loc => loc.type === "airport");
        if (hasAirports) {
          renderMixedRoute(route);
        } else {
          renderDrivingRoute(route);
        }
      }

      // Load photos
      loadTripPhotos(id);
      
      // Load budget data
      loadBudgetData(id);
    } catch (err) {
      console.error("Error loading trip:", err);
    }
  }, [token, loadTripPhotos]);

  const loadMonthlyTripCount = useCallback(async () => {
    if (!token || !user) return;
    try {
      const res = await axios.get(`${API_URL}/api/trips/monthly-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMonthlyTripCount({
        trips_used: res.data.trips_used || 0,
        limit: res.data.limit || 2
      });
    } catch (err) {
      console.error("Error loading monthly trip count:", err);
    }
  }, [token, user]);

  // Load existing trip if tripId provided
  useEffect(() => {
    // Normalize tripId to a number
    const normalizedTripId = tripId && typeof tripId === 'number' ? tripId : 
                             tripId && typeof tripId === 'object' && tripId.id ? tripId.id :
                             tripId && !isNaN(Number(tripId)) ? Number(tripId) : null;
    
    if (normalizedTripId && token) {
      setCurrentTripId(normalizedTripId);
      loadTrip(normalizedTripId);
    } else if (!tripId) {
      // Reset if no tripId provided (new trip)
      setCurrentTripId(null);
      setTripName("");
      setTripDescription("");
      setTripBudget("");
      setTripStartDate("");
      setLastSavedData(null);
      setHasUnsavedChanges(false);
    }
  }, [tripId, token, loadTrip]);

  // Load monthly trip count on mount
  useEffect(() => {
    if (token && user) {
      loadMonthlyTripCount();
    }
  }, [token, user, loadMonthlyTripCount]);

  const clearMap = () => {
    setDirections(null);
    setAirportDirections(null);
    setFlightPaths([]);
    setAirportMarkers([]);
    setTotalDistance(0);
    setRouteMode("DRIVING");
    setOrigin({ name: "", lat: "", lng: "", country: "" });
    setLocations([{ name: "", lat: "", lng: "", country: "" }]);
    setOptimizedRoute([]);
    setPhotos({});
    setMapKey(prev => prev + 1);

    if (mapRef.current) {
      mapRef.current.panTo(defaultCenter);
      mapRef.current.setZoom(3);
    }
  };

  const onOriginChanged = () => {
    const place = originAutocomplete.getPlace();
    if (place && place.geometry) {
      const country = getCountry(place);
      setOrigin({
        name: place.name,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        country,
      });
      checkForUnsavedChanges();
    }
  };

  const onPlaceChanged = (index) => {
    const place = autocompleteRefs[index].getPlace();
    if (place && place.geometry) {
      const country = getCountry(place);
      const safeLocations = Array.isArray(locations) ? locations : [];
      const updated = [...safeLocations];
      updated[index] = {
        name: place.name,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        country,
      };
      setLocations(updated);
      checkForUnsavedChanges();
    }
  };

  const getCountry = (place) => {
    const comp = place.address_components?.find((c) =>
      c.types.includes("country")
    );
    return comp ? comp.long_name : "";
  };

  const addLocation = () => {
    const safeLocations = Array.isArray(locations) ? locations : [];
    setLocations([...safeLocations, { name: "", lat: "", lng: "", country: "" }]);
    checkForUnsavedChanges();
  };

  const removeLocation = (index) => {
    const safeLocations = Array.isArray(locations) ? locations : [];
    setLocations(safeLocations.filter((_, i) => i !== index));
    checkForUnsavedChanges();
  };

  const checkForUnsavedChanges = () => {
    if (!lastSavedData) {
      setHasUnsavedChanges(true);
      return;
    }
    
    const currentData = {
      name: tripName,
      description: tripDescription,
      budget: tripBudget,
      startDate: tripStartDate,
      travelPreference: travelPreference
    };
    
    const currentDataStr = JSON.stringify(currentData);
    setHasUnsavedChanges(currentDataStr !== lastSavedData);
  };

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to leave? Your changes will be lost.")) {
        return;
      }
    }
    if (onBack) {
      onBack();
    }
  };

  const loadBudgetData = async (tripId) => {
    try {
      const res = await axios.get(`${API_URL}/api/budget/trip/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Only set budget data if there's actually a budget set (initial_budget > 0)
      if (res.data && res.data.initial_budget && typeof res.data.initial_budget === 'number' && res.data.initial_budget > 0) {
        setBudgetData(res.data);
        setBudgetItems(res.data.items || []);
      } else {
        // Clear budget data if no budget is set
        setBudgetData(null);
        setBudgetItems([]);
      }
    } catch (err) {
      console.error("Error loading budget:", err);
      // Clear budget data on error
      setBudgetData(null);
      setBudgetItems([]);
    }
  };

  const addExpense = async () => {
    if (!newExpense.category || !newExpense.amount) {
      alert("Please fill in category and amount");
      return;
    }

    try {
      await axios.post(`${API_URL}/api/budget/trip/${currentTripId}`, {
        category: newExpense.category,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewExpense({ category: "", description: "", amount: "" });
      loadBudgetData(currentTripId);
    } catch (err) {
      console.error("Error adding expense:", err);
      alert("Failed to add expense");
    }
  };

  const deleteExpense = async (itemId) => {
    try {
      await axios.delete(`${API_URL}/api/budget/item/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadBudgetData(currentTripId);
    } catch (err) {
      console.error("Error deleting expense:", err);
    }
  };

  const endTrip = async () => {
    if (!window.confirm("Are you sure you want to end this trip? This action cannot be undone.")) {
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      await axios.put(`${API_URL}/api/trips/${currentTripId}`, {
        end_date: today
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsEnded(true);
      
      // Reload photos to ensure we have the latest data before showing slideshow
      await loadTripPhotos(currentTripId);
      
      // Always show slideshow when trip ends (for both free and premium users)
      // The slideshow component will show "End of Trip" message if no photos exist
      // Free users can view slideshow but cannot export to MP4
      setShowSlideshow(true);
    } catch (err) {
      console.error("Error ending trip:", err);
      alert("Failed to end trip");
    }
  };

  const handleSubmit = async (e) => {
    // Prevent submission if trip has ended
    if (currentTripId && isEnded) {
      return;
    }
    e.preventDefault();
    
    if (!tripName.trim()) {
      alert("Please enter a trip name");
      return;
    }

    if (!tripStartDate) {
      alert("Please enter a trip start date");
      return;
    }

    const safeLocations = Array.isArray(locations) ? locations : [];
    const cleaned = safeLocations.filter((l) => l.name && l.lat && l.lng);
    if (!origin.name || cleaned.length < 1) {
      alert("Please enter an origin and at least one destination.");
      return;
    }

    setLoading(true);

    try {
      // Validate that origin and destinations have coordinates
      if (!origin.lat || !origin.lng) {
        alert("Please select a valid starting point from the autocomplete suggestions.");
        setLoading(false);
        return;
      }

      for (const dest of cleaned) {
        if (!dest.lat || !dest.lng) {
          alert("Please select valid destinations from the autocomplete suggestions.");
          setLoading(false);
          return;
        }
      }

      // Plan the route
      const planRes = await axios.post(`${API_URL}/api/trip-planner/plan`, {
        origin: {
          name: origin.name,
          lat: parseFloat(origin.lat),
          lng: parseFloat(origin.lng),
          country: origin.country || ""
        },
        destinations: cleaned.map(dest => ({
          name: dest.name,
          lat: parseFloat(dest.lat),
          lng: parseFloat(dest.lng),
          country: dest.country || ""
        })),
        preference: travelPreference,
      });

      const { optimized_route, total_distance_km } = planRes.data;
      setTotalDistance(total_distance_km);
      
      // Ensure optimized_route is always an array
      const route = Array.isArray(optimized_route) ? optimized_route : [];
      setOptimizedRoute(route);

      const hasAirports = route.some(loc => loc.type === "airport");
      const routeModeValue = hasAirports ? "MIXED" : "DRIVING";
      setRouteMode(routeModeValue);
      
      if (hasAirports) {
        renderMixedRoute(route);
      } else {
        renderDrivingRoute(route);
      }

      // Save trip to database (only if authenticated)
      if (token) {
        const tripData = {
          name: tripName,
          description: tripDescription,
          origin: {
            name: origin.name,
            lat: origin.lat,
            lng: origin.lng,
            country: origin.country || ""
          },
          destinations: cleaned.map(dest => ({
            name: dest.name,
            lat: dest.lat,
            lng: dest.lng,
            country: dest.country || ""
          })),
          optimized_route: route,
          total_distance_km,
          route_mode: routeModeValue,
          travel_preference: travelPreference,
          budget: tripBudget ? parseFloat(tripBudget) : null,
          start_date: tripStartDate || null
        };

        try {
          // Ensure currentTripId is a number before using it
          const tripIdNum = currentTripId ? Number(currentTripId) : null;
          
          if (tripIdNum && !isNaN(tripIdNum)) {
            // Update existing trip
            await axios.put(`${API_URL}/api/trips/${tripIdNum}`, tripData, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setHasUnsavedChanges(false);
            setLastSavedData(JSON.stringify(tripData));
            // Reload budget data to reflect the updated initial budget
            loadBudgetData(tripIdNum);
            // Also save any pending timeline edits
            if (timelineRef.current?.save) {
              await timelineRef.current.save();
            }
            setSuccessMessage("Your trip has been updated successfully!");
            setShowSuccessModal(true);
          } else {
            // Create new trip
            const saveRes = await axios.post(`${API_URL}/api/trips/`, tripData, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const newTripId = saveRes.data.trip.id ? Number(saveRes.data.trip.id) : null;
            setCurrentTripId(newTripId);
            setHasUnsavedChanges(false);
            setLastSavedData(JSON.stringify(tripData));
            // Load budget data for the newly created trip
            if (newTripId) {
              loadBudgetData(newTripId);
            }
            // Also save any pending timeline edits
            if (timelineRef.current?.save) {
              await timelineRef.current.save();
            }
            setSuccessMessage("Your trip has been created successfully!");
            setShowSuccessModal(true);
            // Refresh monthly trip count after creating a trip
            loadMonthlyTripCount();
          }
        } catch (saveErr) {
          console.error("Error saving trip:", saveErr);
          let errorMsg = "Trip planned successfully, but could not save.";
          
          if (saveErr.response) {
            if (saveErr.response.status === 401) {
              errorMsg = "Authentication failed. Please sign in again to save trips.";
            } else if (saveErr.response.status === 403) {
              // Monthly trip limit reached
              errorMsg = saveErr.response.data?.message || saveErr.response.data?.error || "Monthly trip limit reached. Free plan allows up to 2 trips per month. Upgrade to Premium for unlimited trips.";
            } else if (saveErr.response.data?.error) {
              errorMsg = `Error saving trip: ${saveErr.response.data.error}`;
            } else {
              errorMsg = `Error saving trip: ${saveErr.response.status} ${saveErr.response.statusText}`;
            }
          } else if (saveErr.message) {
            errorMsg = `Error saving trip: ${saveErr.message}`;
          }
          
          alert(errorMsg);
        }
      } else {
        alert("Trip planned successfully! Sign in to save your trip.");
      }
    } catch (err) {
      console.error("Error planning/saving trip:", err);
      
      let errorMessage = "Failed to plan trip. ";
      
      if (!err.response) {
        errorMessage += `Cannot connect to server. Make sure the backend is running on ${API_URL}`;
      } else if (err.response.status === 400) {
        errorMessage += err.response.data?.error || "Invalid request. Please check your inputs.";
      } else if (err.response.status === 500) {
        errorMessage += "Server error: " + (err.response.data?.error || "Internal server error");
      } else {
        errorMessage += err.response.data?.error || "Unknown error occurred";
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderDrivingRoute = (route) => {
    const waypoints = route.slice(1, -1).map((loc) => ({
      location: { lat: loc.lat, lng: loc.lng },
      stopover: true,
    }));

    const directionsService = new window.google.maps.DirectionsService();
    
    // Use traffic-aware routing with departure time (current time)
    const request = {
      origin: route[0],
      destination: route[route.length - 1],
      waypoints,
      travelMode: window.google.maps.TravelMode.DRIVING,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: window.google.maps.TrafficModel.OPTIMISTIC
      },
      provideRouteAlternatives: true, // Get multiple routes to find fastest
      optimizeWaypoints: false // Keep waypoint order
    };

    directionsService.route(
      request,
      (result, status) => {
        if (status === "OK" && result) {
          // Select the fastest route if multiple routes are available
          let bestRoute = result.routes[0];
          if (result.routes.length > 1) {
            // Find route with shortest duration in traffic
            bestRoute = result.routes.reduce((best, current) => {
              const bestDuration = best.legs.reduce((sum, leg) => 
                sum + (leg.duration_in_traffic?.value || leg.duration.value), 0
              );
              const currentDuration = current.legs.reduce((sum, leg) => 
                sum + (leg.duration_in_traffic?.value || leg.duration.value), 0
              );
              return currentDuration < bestDuration ? current : best;
            });
          }
          
          // Create result object with the best route
          const optimizedResult = {
            ...result,
            routes: [bestRoute]
          };
          
          setDirections(optimizedResult);
        } else {
          console.error("Error fetching directions:", status);
        }
      }
    );
  };

  const renderMixedRoute = (route) => {
    const directionsService = new window.google.maps.DirectionsService();
    const airportMarkers = [];
    const flightPaths = [];
    const drivingSegments = [];

    const airports = route.filter(loc => loc.type === "airport");
    
    for (let i = 0; i < airports.length - 1; i++) {
      flightPaths.push({
        originAirport: airports[i],
        destAirport: airports[i + 1],
      });
    }

    let currentDrivingSegment = [];
    for (let i = 0; i < route.length; i++) {
      const loc = route[i];
      
      if (loc.type === "airport") {
        airportMarkers.push(loc);
        
        if (currentDrivingSegment.length > 0) {
          currentDrivingSegment.push(loc);
          drivingSegments.push([...currentDrivingSegment]);
          currentDrivingSegment = [];
        }
      } else {
        if (currentDrivingSegment.length === 0 && i > 0 && route[i-1].type === "airport") {
          currentDrivingSegment = [route[i-1], loc];
        } else {
          currentDrivingSegment.push(loc);
        }
      }
    }
    
    if (currentDrivingSegment.length > 1) {
      drivingSegments.push(currentDrivingSegment);
    }

    drivingSegments.forEach((segment, idx) => {
      if (segment.length >= 2) {
        const waypoints = segment.slice(1, -1).map((loc) => ({
          location: { lat: loc.lat, lng: loc.lng },
          stopover: true,
        }));

        const request = {
          origin: segment[0],
          destination: segment[segment.length - 1],
          waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: window.google.maps.TrafficModel.OPTIMISTIC
          },
          provideRouteAlternatives: true
        };

        directionsService.route(
          request,
          (result, status) => {
            if (status === "OK" && result) {
              // Select fastest route based on traffic
              let bestRoute = result.routes[0];
              if (result.routes.length > 1) {
                bestRoute = result.routes.reduce((best, current) => {
                  const bestDuration = best.legs.reduce((sum, leg) => 
                    sum + (leg.duration_in_traffic?.value || leg.duration.value), 0
                  );
                  const currentDuration = current.legs.reduce((sum, leg) => 
                    sum + (leg.duration_in_traffic?.value || leg.duration.value), 0
                  );
                  return currentDuration < bestDuration ? current : best;
                });
              }
              
              const optimizedResult = {
                ...result,
                routes: [bestRoute]
              };
              
              if (idx === 0) {
                setDirections(optimizedResult);
              } else {
                setAirportDirections(optimizedResult);
              }
            } else {
              console.error(`Error fetching directions for segment ${idx}:`, status);
            }
          }
        );
      }
    });

    setFlightPaths(flightPaths);
    setAirportMarkers(airportMarkers);
  };

  // Ensure optimizedRoute is always an array before using filter
  const safeOptimizedRoute = Array.isArray(optimizedRoute) ? optimizedRoute : [];
  // Ensure locations is always an array before using filter
  const safeLocations = Array.isArray(locations) ? locations : [];
  const allRouteLocations = safeOptimizedRoute.length > 0 
    ? safeOptimizedRoute.filter(loc => !loc.type || loc.type !== "airport")
    : [origin, ...safeLocations.filter(l => l.name && l.lat && l.lng)];

  if (!isLoaded) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        fontSize: "18px",
        color: "#64748b"
      }}>
        Loading Google Maps...
      </div>
    );
  }

  return (
    <div style={{ 
      width: "100%",
      maxWidth: "1000px",
      margin: "0 auto",
      padding: "clamp(24px, 4vw, 48px) clamp(24px, 4vw, 48px) clamp(120px, 15vw, 150px) clamp(24px, 4vw, 48px)",
      position: "relative",
      zIndex: 1,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column"
    }}>
      {onBack && (
        <button
          onClick={handleBackClick}
          style={{
            marginBottom: "24px",
            padding: "clamp(14px, 2vw, 16px) clamp(24px, 3vw, 32px)",
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            color: "#667eea",
            border: "1.5px solid rgba(102, 126, 234, 0.3)",
            borderRadius: "16px",
            cursor: "pointer",
            fontSize: "clamp(14px, 2vw, 15px)",
            fontWeight: "600",
            transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 4px 16px rgba(102, 126, 234, 0.15), 0 0 0 0px rgba(102, 126, 234, 0.1) inset",
            position: "relative",
            overflow: "hidden"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
            e.currentTarget.style.color = "white";
            e.currentTarget.style.transform = "translateX(-6px) translateY(-2px) scale(1.02)";
            e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.4), 0 4px 16px rgba(118, 75, 162, 0.3)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
            const arrow = e.currentTarget.querySelector('.back-arrow');
            if (arrow) {
              arrow.style.transform = "translateX(-4px)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
            e.currentTarget.style.color = "#667eea";
            e.currentTarget.style.transform = "translateX(0) translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(102, 126, 234, 0.15), 0 0 0 0px rgba(102, 126, 234, 0.1) inset";
            e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.3)";
            const arrow = e.currentTarget.querySelector('.back-arrow');
            if (arrow) {
              arrow.style.transform = "translateX(0)";
            }
          }}
        >
          <span 
            className="back-arrow"
            style={{ 
              fontSize: "18px",
              display: "inline-block",
              transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: "translateX(0)"
            }}
          >
            ←
          </span>
          <span>Back to Trips</span>
        </button>
      )}

      <div style={{ 
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "24px", 
        padding: "clamp(40px, 6vw, 64px) clamp(32px, 5vw, 48px)", 
        marginBottom: "clamp(16px, 3vw, 24px)",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        animation: "fadeInUp 0.6s ease-out",
        width: "100%"
      }}>
        <h1 style={{ 
          fontSize: "clamp(28px, 5vw, 36px)", 
          fontWeight: "800", 
          marginBottom: "12px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "-0.03em",
          lineHeight: "1.2",
          marginTop: "0"
        }}>
          {currentTripId ? "Edit Trip" : "Plan New Trip"}
        </h1>
        <p style={{
          fontSize: "clamp(14px, 2vw, 16px)",
          color: "#64748b",
          marginBottom: "32px",
          fontWeight: "400"
        }}>
          Create your perfect travel itinerary with ease
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ 
            marginBottom: "28px",
            animation: "fadeInUp 0.6s ease-out 0.1s both"
          }}>
            <label style={{ 
              display: "block", 
              marginBottom: "10px", 
              fontSize: "14px", 
              fontWeight: "600",
              color: "#1e293b",
              letterSpacing: "0.01em"
            }}>
              Trip Name
            </label>
            <input
              type="text"
              value={tripName}
              onChange={(e) => {
                setTripName(e.target.value);
                checkForUnsavedChanges();
              }}
              placeholder="e.g., Summer Europe Adventure"
              required
              disabled={currentTripId && isEnded}
                style={{
                  width: "100%",
                  maxWidth: "600px",
                  padding: "14px 18px",
                  borderRadius: "12px",
                  border: "2px solid #e2e8f0",
                  fontSize: "15px",
                  background: currentTripId && isEnded 
                    ? "rgba(241, 245, 249, 0.8)" 
                    : "linear-gradient(to bottom, #ffffff, #f8fafc)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  outline: "none",
                  fontFamily: "inherit",
                  fontWeight: "500",
                  cursor: currentTripId && isEnded ? "not-allowed" : "text",
                  opacity: currentTripId && isEnded ? 0.7 : 1
                }}
                onFocus={(e) => {
                  if (!(currentTripId && isEnded)) {
                    e.currentTarget.style.borderColor = "#667eea";
                    e.currentTarget.style.boxShadow = "0 0 0 4px rgba(102, 126, 234, 0.1), 0 4px 12px rgba(102, 126, 234, 0.15)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
            />
          </div>

          <div style={{ 
            marginBottom: "28px",
            animation: "fadeInUp 0.6s ease-out 0.2s both"
          }}>
            <label style={{ 
              display: "block", 
              marginBottom: "10px", 
              fontSize: "14px", 
              fontWeight: "600",
              color: "#1e293b",
              letterSpacing: "0.01em"
            }}>
              Description <span style={{ fontWeight: "400", fontSize: "12px", color: "#94a3b8" }}>(optional)</span>
            </label>
            <textarea
              value={tripDescription}
              onChange={(e) => {
                setTripDescription(e.target.value);
                checkForUnsavedChanges();
              }}
              placeholder="Add a description for your trip..."
              rows={4}
              disabled={currentTripId && isEnded}
              style={{
                width: "100%",
                maxWidth: "600px",
                padding: "14px 18px",
                borderRadius: "12px",
                border: "2px solid #e2e8f0",
                fontSize: "15px",
                background: currentTripId && isEnded 
                  ? "rgba(241, 245, 249, 0.8)" 
                  : "linear-gradient(to bottom, #ffffff, #f8fafc)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                outline: "none",
                fontFamily: "inherit",
                resize: "vertical",
                fontWeight: "500",
                lineHeight: "1.6",
                cursor: currentTripId && isEnded ? "not-allowed" : "text",
                opacity: currentTripId && isEnded ? 0.7 : 1
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#667eea";
                e.currentTarget.style.boxShadow = "0 0 0 4px rgba(102, 126, 234, 0.1), 0 4px 12px rgba(102, 126, 234, 0.15)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            />
          </div>

          <div style={{ 
            marginBottom: "28px",
            animation: "fadeInUp 0.6s ease-out 0.3s both"
          }}>
            <label style={{ 
              display: "block", 
              marginBottom: "10px", 
              fontSize: "14px", 
              fontWeight: "600",
              color: "#1e293b",
              letterSpacing: "0.01em"
            }}>
              Starting Budget <span style={{ fontWeight: "400", fontSize: "12px", color: "#94a3b8" }}>(optional)</span>
            </label>
            <input
              type="number"
              value={tripBudget}
              onChange={(e) => {
                setTripBudget(e.target.value);
                checkForUnsavedChanges();
              }}
              placeholder="Enter your starting budget..."
              min="0"
              step="0.01"
              disabled={currentTripId && isEnded}
              style={{
                width: "100%",
                maxWidth: "600px",
                padding: "14px 18px",
                borderRadius: "12px",
                border: "2px solid #e2e8f0",
                fontSize: "15px",
                background: currentTripId && isEnded 
                  ? "rgba(241, 245, 249, 0.8)" 
                  : "linear-gradient(to bottom, #ffffff, #f8fafc)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                outline: "none",
                fontFamily: "inherit",
                fontWeight: "500",
                cursor: currentTripId && isEnded ? "not-allowed" : "text",
                opacity: currentTripId && isEnded ? 0.7 : 1
              }}
              onFocus={(e) => {
                if (!(currentTripId && isEnded)) {
                  e.currentTarget.style.borderColor = "#667eea";
                  e.currentTarget.style.boxShadow = "0 0 0 4px rgba(102, 126, 234, 0.1), 0 4px 12px rgba(102, 126, 234, 0.15)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            />
          </div>

          <div style={{ 
            marginBottom: "28px",
            animation: "fadeInUp 0.6s ease-out 0.4s both"
          }}>
            <label style={{ 
              display: "block", 
              marginBottom: "10px", 
              fontSize: "14px", 
              fontWeight: "600",
              color: "#1e293b",
              letterSpacing: "0.01em"
            }}>
              Trip Start Date
            </label>
            <input
              type="date"
              value={tripStartDate}
              required
              onChange={(e) => {
                setTripStartDate(e.target.value);
                checkForUnsavedChanges();
              }}
              disabled={currentTripId && isEnded}
              style={{
                width: "100%",
                maxWidth: "600px",
                padding: "14px 18px",
                borderRadius: "12px",
                border: "2px solid #e2e8f0",
                fontSize: "15px",
                background: currentTripId && isEnded 
                  ? "rgba(241, 245, 249, 0.8)" 
                  : "linear-gradient(to bottom, #ffffff, #f8fafc)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                outline: "none",
                fontFamily: "inherit",
                fontWeight: "500",
                cursor: currentTripId && isEnded ? "not-allowed" : "text",
                opacity: currentTripId && isEnded ? 0.7 : 1
              }}
              onFocus={(e) => {
                if (!(currentTripId && isEnded)) {
                  e.currentTarget.style.borderColor = "#667eea";
                  e.currentTarget.style.boxShadow = "0 0 0 4px rgba(102, 126, 234, 0.1), 0 4px 12px rgba(102, 126, 234, 0.15)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "10px", 
              fontSize: "13px", 
              fontWeight: "600",
              color: "#475569"
            }}>
              Travel Preference
            </label>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {[
                { value: "auto", label: "Auto", icon: "both" },
                { value: "driving", label: "Driving", icon: "car" },
                { value: "flying", label: "Flying", icon: "plane" }
              ].map((option) => (
                <label
                  key={option.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "14px 24px",
                    borderRadius: "14px",
                    border: `2px solid ${travelPreference === option.value ? "#667eea" : "#e2e8f0"}`,
                    background: currentTripId && isEnded
                      ? "rgba(241, 245, 249, 0.8)"
                      : travelPreference === option.value 
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
                      : "linear-gradient(to bottom, #ffffff, #f8fafc)",
                    color: currentTripId && isEnded
                      ? "#94a3b8"
                      : travelPreference === option.value ? "white" : "#475569",
                    cursor: currentTripId && isEnded ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    opacity: currentTripId && isEnded ? 0.7 : 1,
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: travelPreference === option.value 
                      ? "0 4px 16px rgba(102, 126, 234, 0.3)" 
                      : "0 2px 8px rgba(0, 0, 0, 0.05)",
                    transform: travelPreference === option.value ? "scale(1.02)" : "scale(1)",
                    flex: "1",
                    minWidth: "140px",
                    justifyContent: "center"
                  }}
                  onMouseEnter={(e) => {
                    if (!(currentTripId && isEnded) && travelPreference !== option.value) {
                      e.currentTarget.style.borderColor = "#667eea";
                      e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.2)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(currentTripId && isEnded) && travelPreference !== option.value) {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.05)";
                    }
                  }}
                >
                  <input
                    type="radio"
                    name="preference"
                    value={option.value}
                    checked={travelPreference === option.value}
                    onChange={(e) => {
                      setTravelPreference(e.target.value);
                      checkForUnsavedChanges();
                    }}
                    disabled={currentTripId && isEnded}
                    style={{ 
                      margin: 0,
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                      accentColor: "#667eea"
                    }}
                  />
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "18px" }}>
                    {option.icon === "both" ? (
                      <>
                        <CarIcon size={18} color={travelPreference === option.value ? "white" : "#475569"} />
                        <PlaneIcon size={18} color={travelPreference === option.value ? "white" : "#475569"} />
                      </>
                    ) : option.icon === "car" ? (
                      <CarIcon size={18} color={travelPreference === option.value ? "white" : "#475569"} />
                    ) : (
                      <PlaneIcon size={18} color={travelPreference === option.value ? "white" : "#475569"} />
                    )}
                  </span>
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ 
            marginBottom: "28px",
            animation: "fadeInUp 0.6s ease-out 0.6s both"
          }}>
            <label style={{ 
              display: "block", 
              marginBottom: "10px", 
              fontSize: "14px", 
              fontWeight: "600",
              color: "#1e293b",
              letterSpacing: "0.01em"
            }}>
              Starting Point
            </label>
            <Autocomplete
              onLoad={(ref) => setOriginAutocomplete(ref)}
              onPlaceChanged={onOriginChanged}
            >
              <input
                type="text"
                placeholder="Enter your starting location..."
                defaultValue={origin.name}
                style={{
                  width: "100%",
                  maxWidth: "600px",
                  padding: "14px 18px",
                  borderRadius: "12px",
                  border: "2px solid #e2e8f0",
                  fontSize: "15px",
                  background: "linear-gradient(to bottom, #ffffff, #f8fafc)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  outline: "none",
                  fontFamily: "inherit",
                  fontWeight: "500"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#667eea";
                  e.currentTarget.style.boxShadow = "0 0 0 4px rgba(102, 126, 234, 0.1), 0 4px 12px rgba(102, 126, 234, 0.15)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              />
            </Autocomplete>
          </div>

          <div style={{ 
            marginBottom: "28px",
            animation: "fadeInUp 0.6s ease-out 0.7s both"
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginBottom: "12px"
            }}>
              <label style={{ 
                fontSize: "14px", 
                fontWeight: "600",
                color: "#1e293b",
                letterSpacing: "0.01em"
              }}>
                Destinations
              </label>
              <button
                type="button"
                onClick={addLocation}
                style={{
                  padding: "10px 20px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "white",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
                }}
              >
                + Add Destination
              </button>
            </div>
            {(Array.isArray(locations) ? locations : []).map((loc, index) => {
              const safeLocations = Array.isArray(locations) ? locations : [];
              return (
              <div key={index} style={{ 
                marginBottom: "12px", 
                display: "flex", 
                gap: "8px",
                alignItems: "center"
              }}>
                <Autocomplete
                  onLoad={(ref) => {
                    const newRefs = [...autocompleteRefs];
                    newRefs[index] = ref;
                    setAutocompleteRefs(newRefs);
                  }}
                  onPlaceChanged={() => onPlaceChanged(index)}
                >
                  <input
                    type="text"
                    placeholder={`Destination ${index + 1}...`}
                    defaultValue={safeLocations[index]?.name || ""}
                    style={{
                      flex: 1,
                      padding: "14px 18px",
                      borderRadius: "12px",
                      border: "2px solid #e2e8f0",
                      fontSize: "15px",
                      background: "linear-gradient(to bottom, #ffffff, #f8fafc)",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      outline: "none",
                      fontFamily: "inherit",
                      fontWeight: "500"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#667eea";
                      e.currentTarget.style.boxShadow = "0 0 0 4px rgba(102, 126, 234, 0.1), 0 4px 12px rgba(102, 126, 234, 0.15)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  />
                </Autocomplete>
                {Array.isArray(locations) && locations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLocation(index)}
                    style={{
                      padding: "12px 20px",
                      background: "linear-gradient(to bottom, #ffffff, #fef2f2)",
                      color: "#dc2626",
                      border: "2px solid #fecaca",
                      borderRadius: "12px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "600",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: "0 2px 8px rgba(220, 38, 38, 0.1)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)";
                      e.currentTarget.style.borderColor = "#f87171";
                      e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(220, 38, 38, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "linear-gradient(to bottom, #ffffff, #fef2f2)";
                      e.currentTarget.style.borderColor = "#fecaca";
                      e.currentTarget.style.transform = "translateY(0) scale(1)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(220, 38, 38, 0.1)";
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              );
            })}
          </div>

          <div style={{ 
            display: "flex", 
            gap: "12px", 
            flexWrap: "wrap",
            animation: "fadeInUp 0.6s ease-out 0.8s both"
          }}>
            <button
              type="button"
              onClick={clearMap}
              style={{
                padding: "12px 24px",
                background: "linear-gradient(to bottom, #ffffff, #f8fafc)",
                color: "#64748b",
                border: "2px solid #e2e8f0",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#667eea";
                e.currentTarget.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                e.currentTarget.style.color = "white";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(102, 126, 234, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.background = "linear-gradient(to bottom, #ffffff, #f8fafc)";
                e.currentTarget.style.color = "#64748b";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.05)";
              }}
            >
              Clear
            </button>
          </div>
        </form>

        {totalDistance > 0 && (
          <div style={{
            marginTop: "20px",
            padding: "12px 16px",
            background: "#f8fafc",
            borderRadius: "10px",
            fontSize: "13px",
            color: "#64748b",
            border: "1px solid #e2e8f0"
          }}>
            {routeMode === "DRIVING" && `Total Distance: ${totalDistance.toFixed(1)} km`}
            {routeMode === "MIXED" && `Mixed Route: ${totalDistance.toFixed(1)} km`}
          </div>
        )}
      </div>

        {Array.isArray(optimizedRoute) && optimizedRoute.length > 0 && (
        <div style={{ 
          background: "white", 
          borderRadius: "16px", 
          padding: "clamp(16px, 3vw, 24px)", 
          marginBottom: "clamp(16px, 3vw, 24px)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          border: "1px solid #f1f5f9"
        }}>
          <GoogleMap
            key={mapKey}
            mapContainerStyle={containerStyle}
            center={(() => {
              // Calculate center from route locations if available
              const routeLocations = optimizedRoute.filter(loc => loc.type !== "airport");
              if (routeLocations.length > 0) {
                const validLocs = routeLocations.filter(loc => loc.lat && loc.lng);
                if (validLocs.length > 0) {
                  const avgLat = validLocs.reduce((sum, loc) => sum + parseFloat(loc.lat), 0) / validLocs.length;
                  const avgLng = validLocs.reduce((sum, loc) => sum + parseFloat(loc.lng), 0) / validLocs.length;
                  return { lat: avgLat, lng: avgLng };
                }
              }
              // Fallback to origin or first location
              if (origin.lat && origin.lng) {
                return { lat: parseFloat(origin.lat), lng: parseFloat(origin.lng) };
              }
              if (locations.length > 0 && locations[0].lat && locations[0].lng) {
                return { lat: parseFloat(locations[0].lat), lng: parseFloat(locations[0].lng) };
              }
              return defaultCenter;
            })()}
            zoom={(() => {
              // Set appropriate zoom based on number of locations
              const routeLocations = optimizedRoute.filter(loc => loc.type !== "airport");
              const totalLocations = routeLocations.length > 0 ? routeLocations.length : 
                                    (origin.lat && origin.lng ? 1 : 0) + locations.filter(l => l.lat && l.lng).length;
              if (totalLocations === 0) return 3;
              if (totalLocations === 1) return 10;
              if (totalLocations === 2) return 8;
              return 6;
            })()}
            onLoad={(map) => {
              mapRef.current = map;
              // Fit bounds to show all markers if there are locations
              const routeLocations = optimizedRoute.filter(loc => loc.type !== "airport");
              const allLocations = routeLocations.length > 0 ? routeLocations : 
                                  [origin, ...locations].filter(loc => loc.lat && loc.lng);
              
              if (allLocations.length > 0) {
                const bounds = new window.google.maps.LatLngBounds();
                allLocations.forEach(loc => {
                  if (loc.lat && loc.lng) {
                    bounds.extend({ lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) });
                  }
                });
                // Also include airport markers if any
                airportMarkers.forEach(airport => {
                  bounds.extend({ lat: airport.lat, lng: airport.lng });
                });
                
                if (bounds.isEmpty() === false) {
                  map.fitBounds(bounds);
                  // Add padding to prevent markers from being at the edge
                  map.fitBounds(bounds, { padding: 50 });
                }
              }
            }}
            options={{
              styles: [
                {
                  featureType: "poi",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }]
                }
              ]
            }}
          >
            {airportDirections && (routeMode === "MIXED") && (
              <DirectionsRenderer 
                directions={airportDirections}
                options={{
                  suppressMarkers: true, // Use our custom markers instead
                  polylineOptions: {
                    strokeColor: "#1E90FF",
                    strokeWeight: 3,
                    strokeOpacity: 0.6,
                  }
                }}
              />
            )}

            {flightPaths.map((flightPath, idx) => (
              <Polyline
                key={idx}
                path={[
                  { lat: flightPath.originAirport.lat, lng: flightPath.originAirport.lng },
                  { lat: flightPath.destAirport.lat, lng: flightPath.destAirport.lng },
                ]}
                options={{
                  strokeColor: "#1E90FF",
                  strokeOpacity: 0.8,
                  strokeWeight: 3,
                  icons: [
                    {
                      icon: {
                        path: "M 0,-1 0,1",
                        strokeOpacity: 1,
                        scale: 4,
                      },
                      offset: "0",
                      repeat: "20px",
                    },
                  ],
                }}
              />
            ))}

            {directions && (routeMode === "DRIVING" || routeMode === "MIXED") && (
              <DirectionsRenderer 
                directions={directions}
                options={{
                  suppressMarkers: true, // Use our custom markers instead
                  polylineOptions: {
                    strokeColor: "#4285F4",
                    strokeWeight: 4,
                    strokeOpacity: 0.8,
                  },
                  preserveViewport: false // Allow map to fit bounds
                }}
                onDirectionsChanged={() => {
                  // Fit bounds after directions are rendered
                  if (mapRef.current && directions) {
                    const bounds = new window.google.maps.LatLngBounds();
                    directions.routes.forEach(route => {
                      route.legs.forEach(leg => {
                        bounds.extend(leg.start_location);
                        bounds.extend(leg.end_location);
                      });
                    });
                    if (bounds.isEmpty() === false) {
                      mapRef.current.fitBounds(bounds, { padding: 50 });
                    }
                  }
                }}
              />
            )}

            {airportMarkers.map((a, i) => {
              // Create custom icon for plane marker using SVG data URL
              const planeIcon = {
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
                  </svg>
                `)}`,
                scaledSize: { width: 24, height: 24 },
                anchor: { x: 12, y: 12 }
              };
              return (
                <Marker
                  key={`airport-${i}`}
                  position={{ lat: a.lat, lng: a.lng }}
                  icon={planeIcon}
                  title={a.name}
                />
              );
            })}

            {/* Origin and Destination Markers */}
            {(() => {
              // Filter out airports to get only origin and destinations
              const routeLocations = optimizedRoute.filter(loc => loc.type !== "airport");
              if (routeLocations.length === 0) return null;

              const origin = routeLocations[0];
              const destinations = routeLocations.slice(1);

              return (
                <>
                  {/* Origin Marker */}
                  {origin && (
                    <Marker
                      key="origin"
                      position={{ lat: origin.lat, lng: origin.lng }}
                      icon={{
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: "#10b981",
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 4,
                      }}
                      label={{
                        text: "START",
                        color: "#ffffff",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                      title={`Origin: ${origin.name}`}
                      zIndex={1000}
                    />
                  )}

                  {/* Destination Markers */}
                  {destinations.map((dest, idx) => (
                    <Marker
                      key={`dest-${idx}`}
                      position={{ lat: dest.lat, lng: dest.lng }}
                      icon={{
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: "#ef4444",
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 4,
                      }}
                      label={{
                        text: `${idx + 1}`,
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: "bold",
                      }}
                      title={`Destination ${idx + 1}: ${dest.name}`}
                      zIndex={999 - idx}
                    />
                  ))}
                </>
              );
            })()}
          </GoogleMap>
        </div>
      )}

      {/* Weather & Traffic Info - Show for all trips with routes */}
      {optimizedRoute && optimizedRoute.length > 0 && (routeMode === "DRIVING" || routeMode === "MIXED") && allRouteLocations && allRouteLocations.length > 0 && (
        <WeatherTrafficInfo 
          locations={allRouteLocations} 
          routeMode={routeMode}
          directions={directions}
        />
      )}

      {optimizedRoute.length > 0 && currentTripId && (
        <>
          {/* Photo View Toggle */}
          <div style={{
            display: "flex",
            gap: "12px",
            marginTop: "clamp(24px, 4vw, 32px)",
            marginBottom: "16px"
          }}>
            <button
              onClick={() => setPhotoViewMode("gallery")}
              style={{
                padding: "12px 24px",
                background: photoViewMode === "gallery"
                  ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                  : "rgba(255, 255, 255, 0.7)",
                color: photoViewMode === "gallery" ? "white" : "#64748b",
                border: "1px solid rgba(226, 232, 240, 0.5)",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
                transition: "all 0.3s",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)"
              }}
            >
              Gallery
            </button>
            <button
              onClick={() => setPhotoViewMode("timeline")}
              style={{
                padding: "12px 24px",
                background: photoViewMode === "timeline"
                  ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                  : "rgba(255, 255, 255, 0.7)",
                color: photoViewMode === "timeline" ? "white" : "#64748b",
                border: "1px solid rgba(226, 232, 240, 0.5)",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
                transition: "all 0.3s",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)"
              }}
            >
              Timeline
            </button>
          </div>

          {photoViewMode === "gallery" ? (
            <PhotoManager
              locations={allRouteLocations}
              onPhotosUpdate={setPhotos}
              tripId={currentTripId}
              token={token}
              photos={photos}
              user={user}
            />
          ) : (
            <TripTimeline
              ref={timelineRef}
              tripId={currentTripId}
              token={token}
              onPhotoDeleted={() => {
                if (currentTripId) {
                  loadTripPhotos(currentTripId);
                }
              }}
            />
          )}


          {/* Budget Tracking Section */}
          {currentTripId && ((tripBudget && tripBudget.trim() !== "" && parseFloat(tripBudget) > 0) || (budgetData && budgetData.initial_budget && typeof budgetData.initial_budget === 'number' && budgetData.initial_budget > 0)) && (
            <div style={{
              background: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: "24px",
              padding: "clamp(32px, 5vw, 48px)",
              marginTop: "clamp(24px, 4vw, 32px)",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 4px 16px rgba(0, 0, 0, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "clamp(24px, 4vw, 32px)",
                flexWrap: "wrap",
                gap: "12px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)"
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                      <path d="M12 18V6"/>
                    </svg>
                  </div>
                  <h3 style={{
                    fontSize: "clamp(20px, 4vw, 24px)",
                    fontWeight: "700",
                    margin: 0,
                    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    letterSpacing: "-0.02em"
                  }}>
                    Budget Tracker
                  </h3>
                </div>
                {isEnded && (
                  <span style={{
                    padding: "8px 14px",
                    background: "linear-gradient(135deg, rgba(100, 116, 139, 0.1) 0%, rgba(148, 163, 184, 0.1) 100%)",
                    color: "#64748b",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    border: "1px solid rgba(100, 116, 139, 0.2)",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
                  }}>
                    Trip Ended
                  </span>
                )}
              </div>

              {budgetData && budgetData.initial_budget && typeof budgetData.initial_budget === 'number' && budgetData.initial_budget > 0 && (
                <>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "clamp(16px, 3vw, 20px)",
                    marginBottom: "clamp(24px, 4vw, 32px)"
                  }}>
                    <div style={{
                      padding: "clamp(20px, 3vw, 28px)",
                      background: "rgba(255, 255, 255, 0.6)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      borderRadius: "18px",
                      border: "1px solid rgba(255, 255, 255, 0.4)",
                      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.02) inset",
                      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(102, 126, 234, 0.1) inset";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.02) inset";
                    }}
                    >
                      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Initial Budget
                      </div>
                      <div style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: "800", color: "#1e293b", letterSpacing: "-0.02em" }}>
                        ${budgetData.initial_budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{
                      padding: "clamp(20px, 3vw, 28px)",
                      background: "rgba(255, 255, 255, 0.6)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      borderRadius: "18px",
                      border: "1px solid rgba(255, 255, 255, 0.4)",
                      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.02) inset",
                      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(102, 126, 234, 0.1) inset";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.02) inset";
                    }}
                    >
                      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Total Spent
                      </div>
                      <div style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: "800", color: budgetData.exceeded ? "#dc2626" : "#1e293b", letterSpacing: "-0.02em" }}>
                        ${budgetData.total_spent && budgetData.total_spent > 0 ? budgetData.total_spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                      </div>
                    </div>
                    <div style={{
                      padding: "clamp(20px, 3vw, 28px)",
                      background: budgetData.exceeded 
                        ? "linear-gradient(135deg, rgba(254, 242, 242, 0.8) 0%, rgba(254, 202, 202, 0.4) 100%)" 
                        : "linear-gradient(135deg, rgba(240, 253, 244, 0.8) 0%, rgba(187, 247, 208, 0.4) 100%)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      borderRadius: "18px",
                      border: `1px solid ${budgetData.exceeded ? "rgba(254, 202, 202, 0.5)" : "rgba(187, 247, 208, 0.5)"}`,
                      boxShadow: `0 4px 16px ${budgetData.exceeded ? "rgba(220, 38, 38, 0.1)" : "rgba(22, 163, 74, 0.1)"}, 0 0 0 1px ${budgetData.exceeded ? "rgba(254, 202, 202, 0.3)" : "rgba(187, 247, 208, 0.3)"} inset`,
                      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
                      e.currentTarget.style.boxShadow = `0 8px 24px ${budgetData.exceeded ? "rgba(220, 38, 38, 0.15)" : "rgba(22, 163, 74, 0.15)"}, 0 0 0 1px ${budgetData.exceeded ? "rgba(254, 202, 202, 0.4)" : "rgba(187, 247, 208, 0.4)"} inset`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0) scale(1)";
                      e.currentTarget.style.boxShadow = `0 4px 16px ${budgetData.exceeded ? "rgba(220, 38, 38, 0.1)" : "rgba(22, 163, 74, 0.1)"}, 0 0 0 1px ${budgetData.exceeded ? "rgba(254, 202, 202, 0.3)" : "rgba(187, 247, 208, 0.3)"} inset`;
                    }}
                    >
                      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Remaining
                      </div>
                      <div style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: "800", color: budgetData.exceeded ? "#dc2626" : "#16a34a", letterSpacing: "-0.02em" }}>
                        ${budgetData.remaining !== undefined && budgetData.remaining !== null ? budgetData.remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                      </div>
                    </div>
                  </div>

                  {!isEnded && (
                    <div style={{
                      padding: "clamp(24px, 4vw, 32px)",
                      background: "rgba(255, 255, 255, 0.5)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      borderRadius: "18px",
                      marginBottom: "clamp(24px, 4vw, 32px)",
                      border: "1px solid rgba(255, 255, 255, 0.4)",
                      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.02) inset"
                    }}>
                      <div style={{ fontSize: "clamp(15px, 2vw, 16px)", fontWeight: "700", color: "#1e293b", marginBottom: "clamp(16px, 3vw, 20px)", letterSpacing: "-0.01em" }}>
                        Add Expense
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "clamp(12px, 2vw, 16px)", alignItems: "end" }}>
                        <div>
                          <input
                            type="text"
                            placeholder="Category (e.g., Food, Transport)"
                            value={newExpense.category}
                            onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                            style={{
                              width: "100%",
                              padding: "clamp(12px, 2vw, 14px) clamp(16px, 3vw, 18px)",
                              borderRadius: "12px",
                              border: "1px solid rgba(226, 232, 240, 0.8)",
                              fontSize: "clamp(13px, 2vw, 14px)",
                              background: "rgba(255, 255, 255, 0.8)",
                              backdropFilter: "blur(10px)",
                              WebkitBackdropFilter: "blur(10px)",
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                              outline: "none"
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = "#667eea";
                              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = "rgba(226, 232, 240, 0.8)";
                              e.currentTarget.style.boxShadow = "none";
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
                            }}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Description (optional)"
                            value={newExpense.description}
                            onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                            style={{
                              width: "100%",
                              padding: "clamp(12px, 2vw, 14px) clamp(16px, 3vw, 18px)",
                              borderRadius: "12px",
                              border: "1px solid rgba(226, 232, 240, 0.8)",
                              fontSize: "clamp(13px, 2vw, 14px)",
                              background: "rgba(255, 255, 255, 0.8)",
                              backdropFilter: "blur(10px)",
                              WebkitBackdropFilter: "blur(10px)",
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                              outline: "none"
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = "#667eea";
                              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = "rgba(226, 232, 240, 0.8)";
                              e.currentTarget.style.boxShadow = "none";
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
                            }}
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={newExpense.amount}
                            onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                            min="0"
                            step="0.01"
                            style={{
                              width: "100%",
                              padding: "clamp(12px, 2vw, 14px) clamp(16px, 3vw, 18px)",
                              borderRadius: "12px",
                              border: "1px solid rgba(226, 232, 240, 0.8)",
                              fontSize: "clamp(13px, 2vw, 14px)",
                              background: "rgba(255, 255, 255, 0.8)",
                              backdropFilter: "blur(10px)",
                              WebkitBackdropFilter: "blur(10px)",
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                              outline: "none"
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = "#667eea";
                              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = "rgba(226, 232, 240, 0.8)";
                              e.currentTarget.style.boxShadow = "none";
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
                            }}
                          />
                        </div>
                        <button
                          onClick={addExpense}
                          style={{
                            padding: "clamp(12px, 2vw, 14px) clamp(24px, 4vw, 28px)",
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            color: "white",
                            border: "none",
                            borderRadius: "12px",
                            cursor: "pointer",
                            fontSize: "clamp(13px, 2vw, 14px)",
                            fontWeight: "600",
                            whiteSpace: "nowrap",
                            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                            boxShadow: "0 4px 16px rgba(102, 126, 234, 0.3)"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                            e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0) scale(1)";
                            e.currentTarget.style.boxShadow = "0 4px 16px rgba(102, 126, 234, 0.3)";
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  {budgetItems.length > 0 && (
                    <div>
                      <div style={{ fontSize: "clamp(15px, 2vw, 16px)", fontWeight: "700", color: "#1e293b", marginBottom: "clamp(16px, 3vw, 20px)", letterSpacing: "-0.01em" }}>
                        Expenses
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "clamp(12px, 2vw, 14px)" }}>
                        {budgetItems.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              padding: "clamp(16px, 3vw, 20px)",
                              background: "rgba(255, 255, 255, 0.6)",
                              backdropFilter: "blur(10px)",
                              WebkitBackdropFilter: "blur(10px)",
                              borderRadius: "16px",
                              border: "1px solid rgba(255, 255, 255, 0.4)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.02) inset",
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateX(4px)";
                              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(102, 126, 234, 0.1) inset";
                              e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.3)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateX(0)";
                              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.02) inset";
                              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "clamp(14px, 2vw, 15px)", fontWeight: "700", color: "#1e293b", marginBottom: "4px" }}>
                                {item.category}
                              </div>
                              {item.description && (
                                <div style={{ fontSize: "clamp(12px, 2vw, 13px)", color: "#64748b", marginBottom: "4px" }}>
                                  {item.description}
                                </div>
                              )}
                              <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "500" }}>
                                {new Date(item.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "clamp(12px, 2vw, 16px)" }}>
                              <div style={{ fontSize: "clamp(16px, 3vw, 18px)", fontWeight: "800", color: "#1e293b", letterSpacing: "-0.02em" }}>
                                ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              {!isEnded && (
                                <button
                                  onClick={() => deleteExpense(item.id)}
                                  style={{
                                    padding: "8px 12px",
                                    background: "rgba(239, 68, 68, 0.1)",
                                    border: "1px solid rgba(239, 68, 68, 0.2)",
                                    color: "#dc2626",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    borderRadius: "10px",
                                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
                                    e.currentTarget.style.transform = "scale(1.1)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                                    e.currentTarget.style.transform = "scale(1)";
                                  }}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <AIChat locations={allRouteLocations} photos={photos} token={token} user={user} tripId={currentTripId} />

          <ExportButton
            locations={allRouteLocations}
            photos={photos}
            routeData={{ optimizedRoute, totalDistance, routeMode }}
            token={token}
            user={user}
          />
        </>
      )}
      

      {showSlideshow && (
        <Slideshow 
          photos={photos}
          locations={allRouteLocations}
          routeData={{ optimizedRoute, totalDistance, routeMode }}
          token={token}
          user={user}
          onClose={() => {
            setShowSlideshow(false);
            if (onBack) {
              onBack();
            }
          }}
          onBackToTrip={() => {
            setShowSlideshow(false);
            if (onBack) {
              onBack();
            }
          }}
        />
      )}

      {/* Action Buttons at Bottom */}
      <div style={{
        position: "sticky",
        bottom: "0",
        left: "0",
        right: "0",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        padding: "20px 24px",
        borderRadius: "24px 24px 0 0",
        boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
        borderTop: "1px solid rgba(255, 255, 255, 0.3)",
        display: "flex",
        gap: "12px",
        justifyContent: "center",
        flexWrap: "wrap",
        alignItems: "center",
        zIndex: 10,
        marginTop: "auto",
        width: "100%"
      }}>
        {!user?.is_premium && !currentTripId && (
          <span style={{ 
            fontSize: "12px", 
            color: monthlyTripCount.trips_used >= monthlyTripCount.limit ? "#dc2626" : "#f59e0b", 
            fontWeight: "600", 
            background: monthlyTripCount.trips_used >= monthlyTripCount.limit 
              ? "linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%)" 
              : "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)", 
            padding: "8px 14px", 
            borderRadius: "12px",
            border: `1px solid ${monthlyTripCount.trips_used >= monthlyTripCount.limit ? "rgba(220, 38, 38, 0.2)" : "rgba(245, 158, 11, 0.2)"}`,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
          }}>
            {monthlyTripCount.trips_used >= monthlyTripCount.limit 
              ? `Monthly limit reached (${monthlyTripCount.trips_used}/${monthlyTripCount.limit})`
              : `Trips this month: ${monthlyTripCount.trips_used}/${monthlyTripCount.limit}`
            }
          </span>
        )}
        {currentTripId && isEnded ? (
          <div
            style={{
              padding: "16px 40px",
              background: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
              color: "white",
              border: "none",
              borderRadius: "14px",
              fontSize: "16px",
              fontWeight: "700",
              minWidth: "200px",
              boxShadow: "0 4px 12px rgba(100, 116, 139, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              justifyContent: "center",
              letterSpacing: "0.01em"
            }}
          >
            <span style={{ fontSize: "20px" }}>✓</span>
            Trip Ended
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => handleSubmit(e)}
            disabled={loading}
            style={{
              padding: "16px 40px",
              background: loading 
                ? "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)"
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "14px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "700",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              minWidth: "200px",
              boxShadow: loading 
                ? "0 4px 12px rgba(148, 163, 184, 0.3)"
                : "0 8px 24px rgba(102, 126, 234, 0.4)",
              transform: "scale(1)",
              letterSpacing: "0.01em",
              animation: loading ? "pulse 2s ease-in-out infinite" : "none",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              justifyContent: "center"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.5)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.4)";
              }
            }}
          >
            <span style={{ display: "flex", alignItems: "center", fontSize: "20px" }}>
              {loading ? "⏳" : currentTripId ? <SaveIcon size={20} color="white" /> : "✨"}
            </span>
            {loading ? "Planning..." : currentTripId ? "Update Trip" : (token ? "Plan & Save Trip" : "Plan Trip")}
          </button>
        )}
        {currentTripId && !isEnded && (
          <button
            type="button"
            onClick={endTrip}
            style={{
              padding: "12px 24px",
              background: "#fee2e2",
              color: "#dc2626",
              border: "1px solid #fecaca",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fecaca";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fee2e2";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            End Trip
          </button>
        )}
        {currentTripId && (
          <button
            type="button"
            onClick={handleBackClick}
            style={{
              padding: "clamp(14px, 2vw, 16px) clamp(24px, 3vw, 32px)",
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              color: "#667eea",
              border: "1.5px solid rgba(102, 126, 234, 0.3)",
              borderRadius: "16px",
              cursor: "pointer",
              fontSize: "clamp(14px, 2vw, 15px)",
              fontWeight: "600",
              transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 4px 16px rgba(102, 126, 234, 0.15), 0 0 0 0px rgba(102, 126, 234, 0.1) inset",
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.transform = "translateX(-6px) translateY(-2px) scale(1.02)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.4), 0 4px 16px rgba(118, 75, 162, 0.3)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
              const arrow = e.currentTarget.querySelector('.back-arrow');
              if (arrow) {
                arrow.style.transform = "translateX(-4px)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
              e.currentTarget.style.color = "#667eea";
              e.currentTarget.style.transform = "translateX(0) translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(102, 126, 234, 0.15), 0 0 0 0px rgba(102, 126, 234, 0.1) inset";
              e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.3)";
              const arrow = e.currentTarget.querySelector('.back-arrow');
              if (arrow) {
                arrow.style.transform = "translateX(0)";
              }
            }}
          >
            <span 
              className="back-arrow"
              style={{ 
                fontSize: "18px",
                display: "inline-block",
                transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                transform: "translateX(0)"
              }}
            >
              ←
            </span>
            <span>Back to Trips</span>
          </button>
        )}
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNavigate={() => {
          setShowSuccessModal(false);
          if (onBack) {
            onBack();
          }
        }}
        message={successMessage}
        title="Success!"
        showConfetti={true}
      />
    </div>
  );
}
