import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import type { RideMapPreview } from "../lib/api";

type RideRouteMapProps = {
  preview: RideMapPreview;
  interactive?: boolean;
  focusTarget?: "origin" | "destination" | null;
  focusRevision?: number;
};

function buildMapHtml(
  preview: RideMapPreview,
  interactive: boolean,
  focusTarget: "origin" | "destination" | null,
  focusRevision: number
): string | null {
  if (!preview.origin || !preview.destination) {
    return null;
  }

  const routePath =
    preview.path && preview.path.length >= 2
      ? preview.path
      : [
          { lat: preview.origin.lat, lng: preview.origin.lng },
          { lat: preview.destination.lat, lng: preview.destination.lng }
        ];

  const originLat = preview.origin.lat;
  const originLng = preview.origin.lng;
  const destinationLat = preview.destination.lat;
  const destinationLng = preview.destination.lng;
  const originLabel = JSON.stringify(preview.origin.label || "Origem");
  const destinationLabel = JSON.stringify(preview.destination.label || "Destino");
  const polylineCoordinates = JSON.stringify(routePath.map((point) => [point.lat, point.lng]));
  const dragging = interactive ? "true" : "false";
  const zoomControl = interactive ? "true" : "false";
  const targetToFocus = JSON.stringify(focusTarget);
  const targetRevision = JSON.stringify(focusRevision);

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: #eee8ff;
        overflow: hidden;
      }

      .leaflet-container {
        font-family: Arial, sans-serif;
        background: #f6f3ff;
      }

      .leaflet-control-attribution {
        font-size: 10px;
        padding: 2px 6px;
        background: rgba(255, 255, 255, 0.82);
        border-radius: 10px 0 0 0;
      }

      .route-pin {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        border: 3px solid #ffffff;
        box-shadow: 0 8px 18px rgba(55, 35, 140, 0.20);
      }

      .route-pin.origin {
        background: #6b4eeb;
      }

      .route-pin.destination {
        background: #fb8a1c;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      const map = L.map("map", {
        zoomControl: ${zoomControl},
        attributionControl: ${interactive ? "true" : "false"},
        dragging: ${dragging},
        doubleClickZoom: ${dragging},
        boxZoom: ${dragging},
        keyboard: false,
        scrollWheelZoom: false,
        tapHold: ${dragging},
        touchZoom: ${dragging}
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19
      }).addTo(map);

      const origin = L.latLng(${originLat}, ${originLng});
      const destination = L.latLng(${destinationLat}, ${destinationLng});
      const routeCoordinates = ${polylineCoordinates}.map(([lat, lng]) => L.latLng(lat, lng));

      const originMarker = L.marker(origin, {
        icon: L.divIcon({
          className: "",
          html: '<div class="route-pin origin"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        })
      }).addTo(map).bindPopup(${originLabel});

      const destinationMarker = L.marker(destination, {
        icon: L.divIcon({
          className: "",
          html: '<div class="route-pin destination"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        })
      }).addTo(map).bindPopup(${destinationLabel});

      L.polyline(routeCoordinates, {
        color: "rgba(107, 78, 235, 0.18)",
        weight: 10,
        opacity: 1,
        lineJoin: "round"
      }).addTo(map);

      const routeLine = L.polyline(routeCoordinates, {
        color: "#6B4EEB",
        weight: 5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
        dashArray: ${interactive ? "null" : '"10, 8"'}
      }).addTo(map);

      const bounds = routeLine.getBounds().pad(0.12);
      map.fitBounds(bounds);

      if (${interactive ? "true" : "false"}) {
        setTimeout(() => {
          map.invalidateSize();
          const targetToFocus = ${targetToFocus};
          const targetRevision = ${targetRevision};

          void targetRevision;

          if (targetToFocus === "origin") {
            map.flyTo(origin, 16, { duration: 0.55 });
            originMarker.openPopup();
            return;
          }

          if (targetToFocus === "destination") {
            map.flyTo(destination, 16, { duration: 0.55 });
            destinationMarker.openPopup();
          }
        }, 180);
      }
    </script>
  </body>
</html>`;
}

function RideRouteMapComponent({
  preview,
  interactive = false,
  focusTarget = null,
  focusRevision = 0
}: RideRouteMapProps) {
  const html = useMemo(
    () => buildMapHtml(preview, interactive, focusTarget, focusRevision),
    [focusRevision, focusTarget, interactive, preview]
  );

  if (!html) {
    return <View style={styles.fallback} />;
  }

  return (
    <View style={styles.container} pointerEvents={interactive ? "auto" : "none"}>
      <WebView
        style={styles.webview}
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        nestedScrollEnabled={interactive}
        overScrollMode="never"
        bounces={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

export const RideRouteMap = memo(RideRouteMapComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 160,
    backgroundColor: "#EEE8FF"
  },
  webview: {
    flex: 1,
    backgroundColor: "#EEE8FF"
  },
  fallback: {
    flex: 1,
    minHeight: 160,
    backgroundColor: "#EEE8FF"
  }
});
