// Google Maps TypeScript type declarations

declare namespace google {
  // Google Identity Services types
  namespace accounts {
    namespace id {
      interface IdConfiguration {
        client_id: string;
        auto_select?: boolean;
        callback: (response: CredentialResponse) => void;
        context?: string;
        nonce?: string;
        prompt_parent_id?: string;
        itp_support?: boolean;
        log_level?: string;
        cancel_on_tap_outside?: boolean;
      }

      interface CredentialResponse {
        credential: string;
        select_by: string;
      }

      interface PromptMomentNotification {
        isDisplayMoment: () => boolean;
        isDisplayed: () => boolean;
        isNotDisplayed: () => boolean;
        getNotDisplayedReason: () => string;
        isSkippedMoment: () => boolean;
        isSkipped: () => boolean;
        getSkippedReason: () => string;
        isDismissedMoment: () => boolean;
        isDismissed: () => boolean;
        getDismissedReason: () => string;
        getMomentType: () => string;
      }

      function initialize(config: IdConfiguration): void;
      function prompt(callback?: (notification: PromptMomentNotification) => void): void;
      function render(element: HTMLElement, config: IdConfiguration): void;
      function disableAutoSelect(): void;
      function revoke(token: string, callback: (done: { successful: boolean }) => void): void;
    }
  }

  namespace maps {
    // Map class
    class Map {
      constructor(mapDiv: Element | null, opts?: MapOptions);
      setCenter(latLng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      getCenter(): LatLng | null;
      getZoom(): number;
      fitBounds(bounds: LatLngBounds | LatLngBoundsLiteral, padding?: number): void;
      panTo(latLng: LatLng | LatLngLiteral): void;
    }

    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      styles?: MapTypeStyle[];
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      clickableIcons?: boolean;
      disableDefaultUI?: boolean;
    }

    // LatLng classes
    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
      equals(other: LatLng): boolean;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    // LatLngBounds
    class LatLngBounds {
      constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral);
      contains(latLng: LatLng | LatLngLiteral): boolean;
      extend(point: LatLng | LatLngLiteral): LatLngBounds;
      getCenter(): LatLng;
      getNorthEast(): LatLng;
      getSouthWest(): LatLng;
      isEmpty(): boolean;
      toJSON(): LatLngBoundsLiteral;
      toSpan(): LatLng;
      toString(): string;
      toUrlValue(precision?: number): string;
      union(other: LatLngBounds): LatLngBounds;
    }

    interface LatLngBoundsLiteral {
      north: number;
      south: number;
      east: number;
      west: number;
    }

    // Marker class
    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      setPosition(latLng: LatLng | LatLngLiteral): void;
      getTitle(): string;
      addListener(eventName: string, handler: (event: any) => void): void;
    }

    interface MarkerOptions {
      position?: LatLng | LatLngLiteral;
      map?: Map | null;
      title?: string;
      icon?: string | Icon | Symbol;
      label?: string | MarkerLabel;
      animation?: Animation;
      clickable?: boolean;
      draggable?: boolean;
    }

    interface MarkerLabel {
      text: string;
      color?: string;
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: string;
    }

    interface Icon {
      url?: string;
      size?: Size;
      scaledSize?: Size;
      origin?: Point;
      anchor?: Point;
      labelOrigin?: Point;
      path?: string;
    }

    // Symbol
    class Symbol {
      path: SymbolPath | string;
      anchor?: Point;
      fillColor?: string;
      fillOpacity?: number;
      labelOrigin?: Point;
      rotation?: number;
      scale?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
    }

    const enum SymbolPath {
      CIRCLE = 0,
      FORWARD_CLOSED_ARROW = 1,
      FORWARD_OPEN_ARROW = 2,
      BACKWARD_CLOSED_ARROW = 3,
      BACKWARD_OPEN_ARROW = 4,
    }

    // Animation
    const enum Animation {
      BOUNCE = 1,
      DROP = 2,
    }

    // Point and Size
    class Point {
      constructor(x: number, y: number);
      x: number;
      y: number;
      equals(other: Point): boolean;
      toString(): string;
    }

    class Size {
      constructor(width: number, height: number, widthUnit?: string, heightUnit?: string);
      width: number;
      height: number;
      equals(other: Size): boolean;
      toString(): string;
    }

    // Directions Service
    class DirectionsService {
      route(request: DirectionsRequest, callback: (result: DirectionsResult | null, status: DirectionsStatus) => void): void;
    }

    class DirectionsRenderer {
      constructor(opts?: DirectionsRendererOptions);
      setDirections(result: DirectionsResult): void;
      setMap(map: Map | null): void;
    }

    interface DirectionsRendererOptions {
      directions?: DirectionsResult;
      map?: Map;
      polylineOptions?: PolylineOptions;
      suppressMarkers?: boolean;
      suppressBicyclingLegs?: boolean;
      suppressInfoWindows?: boolean;
      suppressPolylines?: boolean;
      preserveViewport?: boolean;
      markerOptions?: MarkerOptions;
    }

    interface DirectionsRequest {
      origin: LatLng | LatLngLiteral | string;
      destination: LatLng | LatLngLiteral | string;
      travelMode: TravelMode;
      waypoints?: DirectionsWaypoint[];
      optimizeWaypoints?: boolean;
      provideRouteAlternatives?: boolean;
      avoidFerries?: boolean;
      avoidHighways?: boolean;
      avoidTolls?: boolean;
      region?: string;
    }

    interface DirectionsResult {
      routes: DirectionsRoute[];
      request: DirectionsRequest;
    }

    interface DirectionsRoute {
      bounds: LatLngBounds;
      copyrights: string;
      legs: DirectionsLeg[];
      overview_path: LatLng[];
      overview_polyline: { points: string };
      summary: string;
      warnings: string[];
      waypoint_order: number[];
    }

    interface DirectionsLeg {
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      end_address: string;
      end_location: LatLng;
      start_address: string;
      start_location: LatLng;
      steps: DirectionsStep[];
    }

    interface DirectionsStep {
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      end_location: LatLng;
      instructions: string;
      path: LatLng[];
      start_location: LatLng;
      travel_mode: TravelMode;
    }

    interface DirectionsWaypoint {
      location: LatLng | LatLngLiteral | string | Place;
      stopover?: boolean;
    }

    interface DirectionsStatus {
      OK: string;
      UNKNOWN_ERROR: string;
      REQUEST_DENIED: string;
      OVER_QUERY_LIMIT: string;
      NOT_FOUND: string;
      ZERO_RESULTS: string;
      INVALID_REQUEST: string;
      MAX_WAYPOINTS_EXCEEDED: string;
      MAX_ROUTE_LENGTH_EXCEEDED: string;
    }

    // Travel Mode
    const enum TravelMode {
      BICYCLING = 'BICYCLING',
      DRIVING = 'DRIVING',
      TRANSIT = 'TRANSIT',
      WALKING = 'WALKING',
    }

    // Polyline
    class Polyline {
      constructor(opts?: PolylineOptions);
      setMap(map: Map | null): void;
      setPath(path: (LatLng | LatLngLiteral)[]): void;
      getPath(): MVCArray<LatLng>;
    }

    interface PolylineOptions {
      path?: (LatLng | LatLngLiteral)[];
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      geodesic?: boolean;
      map?: Map;
      clickable?: boolean;
      draggable?: boolean;
      editable?: boolean;
      visible?: boolean;
      zIndex?: number;
    }

    // MVCArray
    class MVCArray<T> {
      getArray(): T[];
      forEach(callback: (elem: T, i: number) => void): void;
      push(elem: T): number;
      getAt(i: number): T;
      setAt(i: number, elem: T): void;
      removeAt(i: number): T;
    }

    // MapTypeStyle
    interface MapTypeStyle {
      featureType?: string;
      elementType?: string;
      stylers: MapTypeStyler[];
    }

    interface MapTypeStyler {
      hue?: string;
      lightness?: number;
      saturation?: number;
      gamma?: number;
      invert_lightness?: boolean;
      visibility?: string;
      color?: string;
      weight?: number;
    }

    // Places
    namespace places {
      class Autocomplete {
        constructor(inputField: HTMLInputElement, opts?: AutocompleteOptions);
        getPlace(): PlaceResult;
        addListener(eventName: string, handler: (event: any) => void): void;
        setBounds(bounds: LatLngBounds | LatLngBoundsLiteral): void;
        setComponentRestrictions(restrictions: ComponentRestrictions): void;
        setTypes(types: string[]): void;
      }

      interface AutocompleteOptions {
        bounds?: LatLngBounds | LatLngBoundsLiteral;
        componentRestrictions?: ComponentRestrictions;
        fields?: string[];
        strictBounds?: boolean;
        types?: string[];
        placeIdOnly?: boolean;
      }

      interface ComponentRestrictions {
        country: string | string[];
      }

      interface PlaceResult {
        geometry?: {
          location: LatLng;
          viewport: LatLngBounds;
        };
        name?: string;
        formatted_address?: string;
        place_id?: string;
        types?: string[];
        address_components?: GeocoderAddressComponent[];
      }

      interface GeocoderAddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
      }

      class PlacesService {
        constructor(attrContainer: HTMLDivElement | Map);
        getDetails(request: PlacesDetailsRequest, callback: (result: PlaceResult | null, status: PlacesServiceStatus) => void): void;
        nearbySearch(request: PlaceSearchRequest, callback: (results: PlaceResult[] | null, status: PlacesServiceStatus, pagination: Pagination | null) => void): void;
        textSearch(request: TextSearchRequest, callback: (results: PlaceResult[] | null, status: PlacesServiceStatus, pagination: Pagination | null) => void): void;
      }

      interface PlacesDetailsRequest {
        placeId: string;
        fields?: string[];
        region?: string;
        sessionToken?: AutocompleteSessionToken;
      }

      interface PlaceSearchRequest {
        bounds?: LatLngBounds | LatLngBoundsLiteral;
        keyword?: string;
        location?: LatLng | LatLngLiteral;
        maxPriceLevel?: number;
        minPriceLevel?: number;
        name?: string;
        openNow?: boolean;
        radius?: number;
        rankBy?: RankBy;
        type?: string;
      }

      interface TextSearchRequest {
        query: string;
        bounds?: LatLngBounds | LatLngBoundsLiteral;
        location?: LatLng | LatLngLiteral;
        radius?: number;
        region?: string;
        type?: string;
      }

      interface Pagination {
        hasNextPage: boolean;
        nextPage(): void;
      }

      class AutocompleteSessionToken {
        constructor();
      }

      interface PlacesServiceStatus {
        OK: string;
        UNKNOWN_ERROR: string;
        REQUEST_DENIED: string;
        OVER_QUERY_LIMIT: string;
        NOT_FOUND: string;
        ZERO_RESULTS: string;
        INVALID_REQUEST: string;
      }

      const enum RankBy {
        DISTANCE,
        PROMINENCE,
      }
    }

    // Geometry
    namespace geometry {
      namespace spherical {
        function computeDistanceBetween(from: LatLng | LatLngLiteral, to: LatLng | LatLngLiteral, radius?: number): number;
        function computeHeading(from: LatLng | LatLngLiteral, to: LatLng | LatLngLiteral): number;
        function computeLength(path: (LatLng | LatLngLiteral)[], radius?: number): number;
        function computeOffset(from: LatLng | LatLngLiteral, distance: number, heading: number, radius?: number): LatLng;
        function computeOffsetOrigin(to: LatLng | LatLngLiteral, distance: number, heading: number, radius?: number): LatLng | null;
        function interpolate(from: LatLng | LatLngLiteral, to: LatLng | LatLngLiteral, fraction: number): LatLng;
      }

      namespace encoding {
        function decodePath(encodedPath: string): LatLng[];
        function encodePath(path: (LatLng | LatLngLiteral)[]): string;
      }

      namespace poly {
        function containsLocation(point: LatLng | LatLngLiteral, polygon: Polygon): boolean;
        function isLocationOnEdge(point: LatLng | LatLngLiteral, polygon: Polygon | Polyline, tolerance?: number): boolean;
      }
    }

    // Place interface (used in DirectionsWaypoint)
    interface Place {
      placeId?: string;
      query?: string;
      location?: LatLng | LatLngLiteral;
    }

    // Polygon
    class Polygon {
      constructor(opts?: PolygonOptions);
      setMap(map: Map | null): void;
      setPath(path: (LatLng | LatLngLiteral)[][]): void;
      setPaths(paths: (LatLng | LatLngLiteral)[][]): void;
    }

    interface PolygonOptions {
      paths?: (LatLng | LatLngLiteral)[][];
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      fillColor?: string;
      fillOpacity?: number;
      map?: Map;
      clickable?: boolean;
      draggable?: boolean;
      editable?: boolean;
      geodesic?: boolean;
      visible?: boolean;
      zIndex?: number;
    }
  }
}

declare global {
  interface Window {
    google: typeof google;
  }
}

export {};
