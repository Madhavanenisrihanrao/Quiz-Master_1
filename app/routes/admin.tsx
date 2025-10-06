import type { Route } from "./+types/admin";
import AdminPanel from "../components/AdminPanel";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Quiz Admin" },
    { name: "description", content: "Create and manage quizzes" },
  ];
}

export default function AdminRoute() {
  return <AdminPanel />;
}
