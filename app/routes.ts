import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("admin", "routes/admin.tsx"),
  route("student", "routes/student.tsx"),
  route("host", "routes/host.tsx"),
] satisfies RouteConfig;
