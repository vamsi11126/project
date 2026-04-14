import axios from "axios";
import { API } from "@/lib/api";

export const adminApi = axios.create({
  baseURL: API,
  withCredentials: true,
});

export default adminApi;
