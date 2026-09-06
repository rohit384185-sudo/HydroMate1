export type HydroMateSpeechPermissionState = "granted" | "requestable" | "blocked";

export function getHydroMateSpeechPermissionState(permission: {
  granted: boolean;
  canAskAgain: boolean;
  restricted?: boolean;
}): HydroMateSpeechPermissionState {
  if (permission.granted) return "granted";
  return permission.canAskAgain && !permission.restricted ? "requestable" : "blocked";
}
