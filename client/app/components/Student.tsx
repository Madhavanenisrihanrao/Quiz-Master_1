/* @ts-nocheck */
import React, { useState, useEffect } from 'react';
import { Clock, Trophy, Smartphone, Wifi, User, Play } from 'lucide-react';
import { getApiBase } from '../utils/api-config';

let API_BASE = '';

const Student: React.FC = () => {
  const [screen, setScreen] = useState<'join' | 'waiting' | 'question' | 'results' | 'final'>('join');
  const [name, setName] = useState('');
  const [quizCode, setQuizCode] = useState('');
  const [quizId, setQuizId] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [rank, setRank] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Initialize API base
  useEffect(() => {
    const initApi = async () => {
      API_BASE = await getApiBase();
    };
    initApi();
  }, []);

  // Auto-fill quiz code from URL params (QR code scan)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get('code');
      if (codeFromUrl) {
        setQuizCode(codeFromUrl.toUpperCase());
        showToast('Quiz code filled from QR scan! Enter your name to join.', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const joinQuiz = async () => {
    if (!name.trim() || !quizCode.trim()) {
      showToast('Please enter your name and quiz code', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/student/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), code: quizCode.toUpperCase() })
      });

      if (res.ok) {
        const data = await res.json();
        setQuizId(data.quizId);
        setScreen('waiting');
        showToast('Successfully joined! Waiting for quiz to start...', 'success');
        pollForQuizStart(data.quizId);
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to join quiz', 'error');
      }
    } catch (error) {
      showToast('Connection error. Please try again.', 'error');
    }
  };

  const pollForQuizStart = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/student/quizzes/${id}/state`);
        if (res.ok) {
          const data = await res.json();
          if (data.started && data.currentIndex >= 0) {
            clearInterval(interval);
            fetchCurrentQuestion(id);
          }
        }
      } catch (error) {
        console.error('Error polling quiz state:', error);
      }
    }, 2000);
  };

  const fetchCurrentQuestion = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/student/quizzes/${id}/current-question`);
      if (res.ok) {
        const data = await res.json();
        if (data.questionText) {
          setCurrentQuestion(data);
          setScreen('question');
          setTimeLeft(20);
          setIsAnswered(false);
          setShowResult(false);
          setSelectedAnswer(null);
        } else {
          // No more questions - quiz ended
          setScreen('final');
        }
      } else if (res.status === 404) {
        // Quiz finished
        setScreen('final');
      }
    } catch (error) {
      console.error('Error fetching question:', error);
    }
  };

  const submitAnswer = async (answerIndex: number) => {
    if (isAnswered) return;

    setSelectedAnswer(answerIndex);
    setIsAnswered(true);

    try {
      const res = await fetch(`${API_BASE}/api/student/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId,
          name,
          answer: answerIndex,
          timeLeft
        })
      });

      if (res.ok) {
        const data = await res.json();
        setIsCorrect(data.correct);
        setScore(data.score);
        setShowResult(true);
      }
    } catch (error) {
      showToast('Failed to submit answer', 'error');
    }
  };

  // Poll for next question after answering
  useEffect(() => {
    if (showResult && quizId) {
      const pollNext = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/api/student/quizzes/${quizId}/current-question`);
          if (res.ok) {
            const data = await res.json();
            if (data.questionText !== currentQuestion?.questionText) {
              // New question available
              setCurrentQuestion(data);
              setTimeLeft(20);
              setIsAnswered(false);
              setShowResult(false);
              setSelectedAnswer(null);
            }
          }
        } catch (err) {
          console.error('Poll next question error:', err);
        }
      }, 2000);
      return () => clearInterval(pollNext);
    }
  }, [showResult, quizId, currentQuestion]);

  useEffect(() => {
    if (screen === 'question' && timeLeft > 0 && !isAnswered) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [screen, timeLeft, isAnswered]);

  const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
  const shapes = ['🔺', '🔷', '⭐', '⭕'];

  if (screen === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <Smartphone className="mx-auto mb-4 text-purple-600" size={64} />
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Join Quiz</h1>
            <p className="text-gray-600">Enter your details to participate</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Code</label>
              <input
                type="text"
                value={quizCode}
                onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
                placeholder="Enter quiz code"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none uppercase"
                maxLength={6}
              />
            </div>

            <button
              onClick={joinQuiz}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
            >
              Join Quiz
            </button>
          </div>
        </div>

        {toast && (
          <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-500' :
            toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
          } text-white`}>
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  if (screen === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 text-center">
          <Wifi className="mx-auto mb-4 text-white animate-pulse" size={64} />
          <h2 className="text-3xl font-bold text-white mb-4">You're In!</h2>
          <p className="text-white/90 text-xl">Waiting for quiz to start...</p>
          <div className="mt-4 text-white/80">
            <User className="inline mr-2" size={20} />
            {name}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'question') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 text-center max-w-md mx-auto">
          <Play className="mx-auto mb-4 text-purple-600 animate-bounce" size={64} />
          <h2 className="text-3xl font-bold text-purple-700 mb-4">Quiz in Progress</h2>
          <p className="text-xl text-gray-700 mb-4">Please watch the host screen for the question and options.<br/>Tap your answer below.</p>
          <div className="grid grid-cols-2 gap-6 mt-8">
            {[0,1,2,3].map((index) => (
              <button
                key={index}
                onClick={() => submitAnswer(index)}
                disabled={isAnswered}
                className={`${colors[index]} rounded-2xl p-8 text-center transform transition-all duration-300 ${isAnswered ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'} ${selectedAnswer === index ? 'ring-4 ring-white' : ''}`}
              >
                <div className="text-white">
                  <div className="text-6xl mb-4">{shapes[index]}</div>
                  <div className="text-2xl font-bold">{String.fromCharCode(65+index)}</div>
                </div>
              </button>
            ))}
          </div>
          {isAnswered && (
            <div className="mt-6 p-4 rounded-xl bg-purple-100 text-purple-700 font-bold text-xl">
              Answer submitted!
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'final') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md w-full">
          <Trophy className="mx-auto text-yellow-500 mb-4" size={64} />
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Quiz Complete!</h2>
          <p className="text-xl text-gray-600 mb-4">Great job, {name}!</p>
          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <div className="text-4xl font-bold text-blue-600 mb-2">{score}</div>
            <div className="text-gray-600">Final Score</div>
          </div>
          <p className="text-gray-600">Results will be shared by your instructor</p>
        </div>
      </div>
    );
  }

  return null;
};

export default Student;

