type FleetOperationLane = "PROBLEM" | "PENDING" | "ACTIVE" | "AVAILABLE";
type FleetMaintenanceLane = "OVERDUE" | "UPCOMING" | "OK";

export function FleetOperationLaneIcon({ lane }: { lane: FleetOperationLane }) {
  if (lane === "PROBLEM") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      </svg>
    );
  }

  if (lane === "PENDING") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5" />
        <path d="M12 16h.01" />
      </svg>
    );
  }

  if (lane === "ACTIVE") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 16 4.5 12.2A2 2 0 0 1 6.36 9.5h11.28a2 2 0 0 1 1.86 2.7L18 16" />
        <path d="M5 16h14v3a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1V18h-7v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-3Z" />
        <circle cx="7.5" cy="16.5" r="1.2" />
        <circle cx="16.5" cy="16.5" r="1.2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function FleetMaintenanceLaneIcon({ lane }: { lane: FleetMaintenanceLane }) {
  if (lane === "OVERDUE") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      </svg>
    );
  }

  if (lane === "UPCOMING") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M3 10h18" />
        <path d="M12 14h.01" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
