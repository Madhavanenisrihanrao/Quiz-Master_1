/* @ts-nocheck */
import React, { useState, useEffect } from 'react';
import { Users, Play, Square, Trophy, Clock, Tv, ChevronRight } from 'lucide-react';
import { getApiBase } from '../utils/api-config';

// Dynamic API base that auto-detects network IP
let API_BASE = '';

const HostScreen: React.FC = () => {
  const [quizId, setQuizId] = useState<string | null>(null);
  const [quizCode, setQuizCode] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [gameState, setGameState] = useState<'waiting' | 'question' | 'answers' | 'leaderboard' | 'finished'>('waiting');
  const [timeLeft, setTimeLeft] = useState(20);
  const [showAnswers, setShowAnswers] = useState(false);
  const [isQuestionActive, setIsQuestionActive] = useState(false);

  // Initialize API base
  useEffect(() => {
    const initApi = async () => {
      API_BASE = await getApiBase();
    };
    initApi();
  }, []);

  // Get quiz ID from URL params or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const quizIdFromUrl = urlParams.get('quizId');
    const codeFromUrl = urlParams.get('code');
    
    if (quizIdFromUrl) {
      setQuizId(quizIdFromUrl);
      
      // Load quiz questions
      const loadQuestions = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/student/quiz-by-code?code=${codeFromUrl}`);
          if (res.ok) {
            const data = await res.json();
            if (data.questions) {
              setQuestions(data.questions);
            }
          }
        } catch (error) {
          console.error('Error loading questions:', error);
        }
      };
      
      if (codeFromUrl) {
        loadQuestions();
      }
    }
    if (codeFromUrl) {
      setQuizCode(codeFromUrl);
    }
  }, []);

  // Poll for players and quiz state
  useEffect(() => {
    if (!quizId) return;
    
    const interval = setInterval(async () => {
      try {
        // Get participants
        const playersRes = await fetch(`${API_BASE}/api/admin/quizzes/${quizId}/participants`);
        if (playersRes.ok) {
          const playersList = await playersRes.json();
          setPlayers(Array.isArray(playersList) ? playersList : []);
        }
      } catch (error) {
        console.error('Error polling players:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [quizId]);

  // Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isQuestionActive && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && isQuestionActive) {
      // Time's up - show answers
      setIsQuestionActive(false);
      setShowAnswers(true);
    }
    return () => clearTimeout(timer);
  }, [timeLeft, isQuestionActive]);

  const startQuestion = async () => {
    setGameState('question');
    setTimeLeft(20);
    setShowAnswers(false);
    setIsQuestionActive(true);
    
    // Advance question on server
    try {
      await fetch(`${API_BASE}/api/admin/quizzes/${quizId}/next`, { method: 'PUT' });
    } catch (error) {
      console.error('Error advancing question:', error);
    }
  };

  const showResults = () => {
    setGameState('answers');
    setIsQuestionActive(false);
    setShowAnswers(true);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setGameState('question');
      setTimeLeft(20);
      setShowAnswers(false);
      setIsQuestionActive(true);
    } else {
      setGameState('finished');
    }
  };

  const showLeaderboard = () => {
    setGameState('leaderboard');
  };

  if (!quizCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-8 text-center max-w-md">
          <Tv className="mx-auto text-purple-600 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Host Screen Setup</h2>
          <p className="text-gray-600 mb-4">
            This screen should be displayed on a projector or large screen for all players to see.
          </p>
          <p className="text-sm text-gray-500">
            Go to Admin Panel to start a quiz and get the host screen link.
          </p>
        </div>
      </div>
    );
  }

  if (gameState === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold text-white mb-4">Quiz Master</h1>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 inline-block">
              <div className="text-4xl font-bold text-white mb-2">Game PIN: {quizCode}</div>
              <div className="text-white/90">Join at: 192.168.1.2:5173/student</div>
            </div>
          </div>

          {/* Players Grid */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white flex items-center">
                <Users className="mr-3" size={36} />
                Players ({players.length})
              </h2>
              <button 
                onClick={startQuestion}
                disabled={players.length === 0}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-xl text-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Play className="mr-2" size={24} />
                Start Quiz
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {players.map((player, index) => (
                <div key={index} className="bg-white/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-white">{player.name}</div>
                  <div className="text-white/80">Ready</div>
                </div>
              ))}
            </div>
            
            {players.length === 0 && (
              <div className="text-center text-white/80 py-12">
                <Users size={64} className="mx-auto mb-4 opacity-50" />
                <div className="text-xl">Waiting for players to join...</div>
                <div className="text-sm mt-2">Players can join using their phones at: 192.168.1.2:5173/student</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'question' || gameState === 'answers') {
    const question = questions[currentQuestion];
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
    const shapes = ['🔺', '🔷', '⭐', '⭕'];

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Question Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="text-white text-xl">Question {currentQuestion + 1} of {questions.length}</div>
              <div className="text-white text-xl">Game PIN: {quizCode}</div>
            </div>
            
            {isQuestionActive && (
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 inline-block mb-4">
                <div className="flex items-center text-white">
                  <Clock className="mr-2" size={24} />
                  <span className="text-2xl font-bold">{timeLeft}s</span>
                </div>
              </div>
            )}
          </div>

          {/* Question */}
          <div className="bg-white rounded-3xl p-8 mb-8 text-center">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              {question?.question || 'Sample Question: What is 2 + 2?'}
            </h2>
          </div>

          {/* Answer Options */}
          <div className="grid grid-cols-2 gap-6">
            {(question?.options || ['2', '3', '4', '5']).map((option: string, index: number) => (
              <div
                key={index}
                className={`${colors[index]} rounded-2xl p-8 text-center transform transition-all duration-300 ${
                  showAnswers ? (index === question?.correct ? 'scale-105 ring-4 ring-white' : 'opacity-60') : ''
                }`}
              >
                <div className="text-white">
                  <div className="text-6xl mb-4">{shapes[index]}</div>
                  <div className="text-2xl font-bold">{option}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex justify-center mt-8 space-x-4">
            {isQuestionActive && (
              <button 
                onClick={showResults}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-xl text-xl"
              >
                Show Answers
              </button>
            )}
            
            {showAnswers && (
              <>
                <button 
                  onClick={showLeaderboard}
                  className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-8 rounded-xl text-xl flex items-center"
                >
                  <Trophy className="mr-2" size={24} />
                  Leaderboard
                </button>
                
                <button 
                  onClick={nextQuestion}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-xl text-xl flex items-center"
                >
                  {currentQuestion < questions.length - 1 ? (
                    <>Next Question <ChevronRight className="ml-2" size={24} /></>
                  ) : (
                    'Finish Quiz'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'leaderboard') {
    const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const podiumColors = ['bg-yellow-500', 'bg-gray-400', 'bg-orange-500'];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold text-white mb-4">🏆 Leaderboard 🏆</h1>
            <div className="text-2xl text-white/90">Question {currentQuestion + 1} Results</div>
          </div>

          {/* Top 3 Podium */}
          <div className="flex justify-center items-end mb-8 space-x-4">
            {sortedPlayers.slice(0, 3).map((player, index) => {
              const positions = [1, 0, 2]; // Second, First, Third
              const actualIndex = positions[index];
              const heights = ['h-40', 'h-48', 'h-32'];
              
              return (
                <div key={player.name} className="text-center">
                  <div className={`${podiumColors[actualIndex]} ${heights[actualIndex]} w-32 rounded-t-2xl flex flex-col justify-end p-4`}>
                    <div className="text-white font-bold text-lg">{player.name}</div>
                    <div className="text-white text-2xl font-bold">{player.score || 0}</div>
                  </div>
                  <div className="bg-white/20 text-white font-bold py-2 px-4 rounded-b-2xl">
                    #{actualIndex + 1}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full Leaderboard */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 mb-8">
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div key={player.name} className="bg-white/20 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="text-2xl font-bold text-white w-12">#{index + 1}</div>
                    <div className="text-xl font-semibold text-white">{player.name}</div>
                  </div>
                  <div className="text-2xl font-bold text-white">{player.score || 0} pts</div>
                </div>
              ))}
            </div>
          </div>

          {/* Continue Button */}
          <div className="text-center">
            <button 
              onClick={() => setGameState('question')}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-xl text-xl flex items-center mx-auto"
            >
              {currentQuestion < questions.length - 1 ? (
                <>Continue <ChevronRight className="ml-2" size={24} /></>
              ) : (
                'Final Results'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-blue-600 to-purple-600 flex items-center justify-center p-8">
      <div className="text-center text-white">
        <Trophy size={64} className="mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-4">Quiz Complete!</h1>
        <p className="text-xl">Thanks for playing!</p>
      </div>
    </div>
  );
};

export default HostScreen;