import type { Route } from "./+types/student";
import Student from "../components/Student";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Quiz Student" },
    { name: "description", content: "Play quizzes" },
  ];
}

export default function StudentRoute() {
  return <Student />;
}
