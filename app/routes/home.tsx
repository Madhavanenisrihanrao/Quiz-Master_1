import type { Route } from "./+types/home";
import { Link } from "react-router";
import { Users, Settings, Gamepad2, Trophy } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Quiz Master - Interactive Quiz Platform" },
    { name: "description", content: "Create and join interactive quizzes in real-time!" },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 mr-4">
              <Trophy className="text-white" size={48} />
            </div>
            <h1 className="text-5xl font-bold text-white">Quiz Master</h1>
          </div>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Interactive quiz platform for real-time learning and engagement. 
            Create quizzes as an admin or join as a student!
          </p>
        </div>

        {/* Main Options */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Student Option */}
          <Link to="/student" className="group">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 text-center hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
              <div className="bg-white/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 group-hover:bg-white/30 transition-colors">
                <Users className="text-white" size={40} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">📱 Join as Student</h2>
              <p className="text-white/80 mb-4 text-sm">
                Enter a game PIN to participate in interactive quizzes on your mobile device!
              </p>
              <div className="bg-white/20 rounded-xl p-3">
                <div className="flex items-center justify-center text-white/90">
                  <Gamepad2 className="mr-2" size={18} />
                  <span className="font-medium text-sm">Ready to play?</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Admin Option */}
          <Link to="/admin" className="group">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 text-center hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
              <div className="bg-white/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 group-hover:bg-white/30 transition-colors">
                <Settings className="text-white" size={40} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">⚙️ Admin Panel</h2>
              <p className="text-white/80 mb-4 text-sm">
                Create and manage quizzes, control quiz flow, and monitor student responses.
              </p>
              <div className="bg-white/20 rounded-xl p-3">
                <div className="flex items-center justify-center text-white/90">
                  <Trophy className="mr-2" size={18} />
                  <span className="font-medium text-sm">Create amazing quizzes</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Host Screen Option */}
          <Link to="/host" className="group">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 text-center hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
              <div className="bg-white/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 group-hover:bg-white/30 transition-colors">
                <div className="text-white text-4xl">📺</div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">🖥️ Host Screen</h2>
              <p className="text-white/80 mb-4 text-sm">
                Display questions on a projector or large screen for Kahoot-style gameplay.
              </p>
              <div className="bg-white/20 rounded-xl p-3">
                <div className="flex items-center justify-center text-white/90">
                  <span className="font-medium text-sm">For projectors & TVs</span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8">
          <h3 className="text-2xl font-bold text-white text-center mb-6">Features</h3>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="text-white">
              <div className="text-4xl mb-2">⚡</div>
              <h4 className="font-semibold mb-2">Real-time</h4>
              <p className="text-white/80 text-sm">Instant question delivery and live scoring</p>
            </div>
            <div className="text-white">
              <div className="text-4xl mb-2">📱</div>
              <h4 className="font-semibold mb-2">Mobile-First</h4>
              <p className="text-white/80 text-sm">Optimized for all devices and screen sizes</p>
            </div>
            <div className="text-white">
              <div className="text-4xl mb-2">🏆</div>
              <h4 className="font-semibold mb-2">Competitive</h4>
              <p className="text-white/80 text-sm">Leaderboards and instant feedback</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
