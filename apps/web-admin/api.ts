import axios from "axios";
export const api = axios.create({
  baseURL: "/",
  headers: { "Content-Type": "application/json" },
});
export async function pingService(path: string) {
  const { data } = await api.get(path);
  return data;
}
