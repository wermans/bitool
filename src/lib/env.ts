export function getAppUrl(): string {
  return process.env.APP_URL ?? "http://localhost:8080";
}
