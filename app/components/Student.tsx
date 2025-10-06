/* @ts-nocheck */
import React, { useState, useEffect } from 'react';
import { Clock, Trophy, Smartphone, Wifi, User, Play, Users } from 'lucide-react';
import { getApiBase } from '../utils/api-config';

type GameState = 'joining' | 'waiting' | 'ready' | 'playing' | 'finished';

// Dynamic API base that auto-detects network IP
let API_BASE = '';

const StudentQuizApp: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('waiting');
  const [isAnswering, setIsAnswering] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [quizCode, setQuizCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [finalRank, setFinalRank] = useState(0);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [serverCode, setServerCode] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [toast, setToast] = useState<string>('');

  // Initialize API base
  useEffect(() => {
    const initApi = async () => {
      API_BASE = await getApiBase();
    };
    initApi();
  }, []);

  // Poll admin-controlled current question index when connected
  useEffect(() => {
    if (!quizId) return;
    const t = setInterval(async () => {
      try {
        // First check if quiz has started by trying to get questions
        if (!questions.length && (serverCode || quizCode)) {
          try {
            const qres = await fetch(`${API_BASE}/api/student/quiz-by-code?code=${encodeURIComponent((serverCode || quizCode).toString())}`);
            if (qres.ok) {
              const qdata = await qres.json();
              console.log('Polling quiz data:', qdata);
              
              // Check if quiz has started
              if (qdata.state && qdata.state.started === false) {
                // Quiz exists but hasn't started yet - stay in ready state
                setStatusMsg('Waiting for instructor to start the quiz...');
                return;
              }
              
              if (qdata.questions && qdata.questions.length > 0) {
                // Quiz has started! Load questions
                const mapped = qdata.questions.map((q: any) => ({
                  options: q.options,
                  correct: Math.max(0, (q.options || []).indexOf(q.correctAnswer)),
                  points: q.points || 1000,
                }));
                setQuestions(mapped);
                setStatusMsg('');
                if (gameState !== 'playing') {
                  setGameState('playing');
                  console.log('Quiz started! Moving to playing state');
                }
              }
            }
          } catch (err) {
            console.log('Polling error:', err);
          }
        }
        
        // If we have questions, poll for current question index
        if (questions.length > 0) {
          const res = await fetch(`${API_BASE}/api/student/quizzes/${quizId}/state`);
          if (res.ok) {
            const st = await res.json();
            console.log('Current quiz state:', st, 'Student current question:', currentQuestion);
            
            if (typeof st.currentIndex === 'number' && st.currentIndex !== currentQuestion) {
              // Admin has moved to a different question - sync immediately
              console.log(`Admin advanced to question ${st.currentIndex}, student was on ${currentQuestion}`);
              
              setCurrentQuestion(st.currentIndex);
              setSelectedAnswer(null);
              setShowResult(false);
              setTimeLeft(20);
              setIsAnswering(false);
              
              // Check if quiz is finished
              if (st.currentIndex >= questions.length || st.currentIndex >= (st.total || questions.length)) {
                console.log('Quiz finished - moving to results');
                setFinalRank(Math.floor(Math.random() * 10) + 1);
                setGameState('finished');
                return;
              }
            }
          }
        }
      } catch (err) {
        console.log('Polling error:', err);
      }
    }, 1000); // Poll every 1 second for better sync
    return () => clearInterval(t);
  }, [quizId, questions.length, serverCode, quizCode, gameState, isAnswering, currentQuestion]);

  // Remove demo auto-start. We'll enter 'playing' when we have real questions/state.

  // Show a quick toast when questions arrive and we enter 'playing'
  useEffect(() => {
    if (gameState === 'playing') {
      setToast('Questions received. Good luck!');
      const to = setTimeout(() => setToast(''), 2000);
      return () => clearTimeout(to);
    }
  }, [gameState]);

  // Helper function to process quiz data and update state
  interface Question {
    questionText?: string;
    question?: string;
    options?: string[];
    correctAnswer?: string;
    points?: number;
  }

  const processQuizData = (questions: Question[], quizId: string): boolean => {
    try {
      // Map the questions to the expected format
      const mapped = questions.map((q: Question) => ({
        question: q.questionText || q.question || 'No question text',
        options: Array.isArray(q.options) ? q.options : [],
        correct: Array.isArray(q.options) && q.correctAnswer ? 
          Math.max(0, q.options.indexOf(q.correctAnswer)) : 0,
        points: typeof q.points === 'number' ? q.points : 1000,
      }));
      
      console.log('Mapped questions:', mapped);
      
      // Validate that we have valid options
      const validQuestions = mapped.filter(q => q.options.length > 0);
      if (validQuestions.length === 0) {
        setStatusMsg('No valid questions found');
        return false;
      }
      
      setQuestions(validQuestions);
      setCurrentQuestion(0);
      setGameState('playing');
      setScore(0);
      setTimeLeft(20);
      setSelectedAnswer(null);
      setShowResult(false);
      setStatusMsg('');
      
      return true;
    } catch (error) {
      console.error('Error processing quiz data:', error);
      setStatusMsg('Error processing quiz data');
      return false;
    }
  };

  // Helper to load questions by join code; returns whether state became 'playing'
  const loadQuestionsByCode = async (code: string): Promise<boolean> => {
    try {
      const trimmedCode = code.trim().toUpperCase();
      if (!trimmedCode) {
        setStatusMsg('Please enter a quiz code');
        return false;
      }
      
      setStatusMsg('Loading questions...');
      
      // First, try to get the quiz data directly
      let quizData;
      try {
        const quizRes = await fetch(`${API_BASE}/api/student/quiz-by-code?code=${encodeURIComponent(trimmedCode)}`);
      console.log('Quiz data response status:', quizRes.status);
      
      if (!quizRes.ok) {
        const error = await quizRes.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load quiz data');
      }
      
      quizData = await quizRes.json();
      console.log('Quiz data:', quizData);
      
      // Check if this is the new format with quiz object and questions array
      if (quizData && quizData.quiz && Array.isArray(quizData.questions)) {
        const quizId = quizData.quiz._id;
        const questions = quizData.questions;
        
        if (!quizId) {
          setStatusMsg('Invalid quiz data: missing quiz ID');
          return false;
        }
        
        console.log('Using quiz data with ID:', quizId, 'and', questions.length, 'questions');
        
        try {
          // Join the quiz first
          const joinRes = await fetch(`${API_BASE}/api/student/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              code: trimmedCode,
              name: playerName.trim()
            })
          });
          
          if (!joinRes.ok) {
            const error = await joinRes.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to join quiz');
          }
          
          const joinResult = await joinRes.json();
          console.log('Join result:', joinResult);
          
          if (questions.length === 0) {
            setStatusMsg('No questions found in this quiz');
            return false;
          }
          
          setQuizId(quizId);
          return processQuizData(questions, quizId);
          
        } catch (error) {
          console.error('Error joining quiz:', error);
          setStatusMsg(error instanceof Error ? error.message : 'Failed to join quiz');
          return false;
        }
      }
    } catch (error) {
      console.error('Error fetching quiz data:', error);
      setStatusMsg(error instanceof Error ? error.message : 'Failed to load quiz data');
      return false;
    }      // If we don't have the quiz data with questions, try to join the quiz and get the questions
      const joinData = {
        code: trimmedCode,
        name: playerName.trim()
      };
      
      console.log('Joining quiz with:', joinData);
      
      const joinRes = await fetch(`${API_BASE}/api/student/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(joinData)
      });
      
      if (!joinRes.ok) {
        const error = await joinRes.json().catch(() => ({}));
        console.error('Failed to join quiz:', error);
        setStatusMsg(error.message || 'Failed to join quiz');
        return false;
      }
      
      const joinResult = await joinRes.json();
      console.log('Join result:', joinResult);
      
      // Get the quiz ID from the join result
      const { quizId } = joinResult;
      
      if (!quizId) {
        setStatusMsg('Invalid response: missing quiz ID');
        return false;
      }
      
      // Now fetch the quiz data with questions using the code
      const quizDataRes = await fetch(`${API_BASE}/api/student/quiz-by-code?code=${encodeURIComponent(trimmedCode)}`);
      
      if (!quizDataRes.ok) {
        const error = await quizDataRes.json().catch(() => ({}));
        console.error('Failed to get quiz data:', error);
        setStatusMsg(error.message || 'Failed to load quiz data');
        return false;
      }
      
      const fullQuizData = await quizDataRes.json();
      console.log('Full quiz data:', fullQuizData);
      
      // Process the questions from the full quiz data
      const questions = Array.isArray(fullQuizData.questions) ? fullQuizData.questions : [];
      if (questions.length === 0) {
        setStatusMsg('No questions found in this quiz');
        return false;
      }
      
      setQuizId(quizId);
      return processQuizData(questions, quizId);
    } catch (error) {
      console.error('Error loading questions:', error);
      setStatusMsg('Error loading quiz questions');
      return false;
    }
  };

  const reconnect = async () => {
    const code = String(serverCode || quizCode || '').trim();
    if (!code) return;
    await loadQuestionsByCode(code);
  };

  useEffect(() => {
    let timer: any;
    // Only run timer if we're playing, have time left, not showing result, and haven't answered yet
    if (gameState === 'playing' && timeLeft > 0 && !showResult && selectedAnswer === null) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && !showResult && gameState === 'playing' && selectedAnswer === null) {
      // Time's up - show result but don't auto-advance
      handleTimeUp();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, gameState, showResult, selectedAnswer]);

  const joinQuiz = async () => {
    const code = quizCode.trim().toUpperCase();
    const name = playerName.trim();
    
    if (!name || !code) {
      setStatusMsg('Please enter both name and quiz code');
      return;
    }
    
    setStatusMsg('Joining quiz...');
    
    try {
      console.log('Attempting to join quiz with code:', code, 'and name:', name);
      
      // Use the correct endpoint to join the quiz
      const joinRes = await fetch(`${API_BASE}/api/student/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: code,
          name: name
        }),
      });
      
      const result = await joinRes.json().catch(e => ({
        error: 'Failed to parse server response',
        details: e.message
      }));
      
      console.log('Join response:', {
        status: joinRes.status,
        ok: joinRes.ok,
        result: result
      });
      
      if (joinRes.ok) {
        const { quizId, title } = result;
        
        if (!quizId) {
          throw new Error('Missing quizId in response');
        }
        
        console.log('Successfully joined quiz:', { quizId, title, name });
        
        // Save the player name for future requests (backend uses name as identifier)
        localStorage.setItem('playerName', name);
        
        // Update the state
        setServerCode(code);
        setQuizId(quizId);
        setStatusMsg('');
        setGameState('ready');
        
        // Don't load questions yet - wait for admin to start the quiz
        // Questions will be loaded when the polling detects the quiz has started
      } else {
        const errorMsg = result.error || result.message || 'Failed to join quiz';
        console.error('Join quiz failed:', errorMsg);
        setStatusMsg(errorMsg);
      }
    } catch (error: any) {
      console.error('Error in joinQuiz:', error);
      setStatusMsg(error?.message || 'Error joining quiz');
    }
  };

  const handleTimeUp = () => {
    console.log('Time is up! Showing result but waiting for admin to advance...');
    setShowResult(true);
    // Don't auto-advance - wait for admin to click "Next Question"
  };

  const handleAnswerClick = async (answerIndex: number) => {
    if (selectedAnswer !== null || showResult) return;
    
    console.log(`Student answered: ${answerIndex}, waiting for admin to advance...`);
    setIsAnswering(true);
    if (navigator.vibrate) navigator.vibrate(50);
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    if (!questions.length || !questions[currentQuestion]) return;
    const isCorrect = answerIndex === questions[currentQuestion].correct;
    if (isCorrect) {
      const timeBonus = Math.floor((timeLeft / 20) * 500);
      setScore(score + questions[currentQuestion].points + timeBonus);
    }
    // Notify server about the answer to update leaderboard with speed bonus
    if (quizId) {
      try {
        const response = await fetch(`${API_BASE}/api/student/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizId,
            name: playerName.trim(),
            correct: isCorrect,
            points: isCorrect ? questions[currentQuestion].points : 0,
            timeLeft: timeLeft // Send time left for speed bonus calculation
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (isCorrect && result.speedBonus) {
            // Update score with server-calculated total including speed bonus
            setScore(result.score);
          }
        }
      } catch (error) {
        console.error('Error submitting answer:', error);
      }
    }
    setIsAnswering(false);
    // Don't auto-advance - wait for admin to click "Next Question"
  };

  const resetQuiz = () => {
    setGameState('waiting');
    setCurrentQuestion(0);
    setScore(0);
    setTimeLeft(20);
    setSelectedAnswer(null);
    setShowResult(false);
    setPlayerName('');
    setQuizCode('');
    setIsConnected(false);
    setQuizStarted(false);
  };

  const getAnswerClass = (index: number) => {
    const baseClass = 'w-full p-4 rounded-2xl font-bold text-lg transition-all duration-300 transform active:scale-95';
    if (!showResult) {
      if (selectedAnswer === index) return `${baseClass} bg-blue-500 text-white scale-105 shadow-lg`;
      return `${baseClass} bg-white text-gray-800 shadow-md hover:shadow-lg hover:scale-[1.02]`;
    }
    if (index === questions[currentQuestion].correct) return `${baseClass} bg-green-500 text-white shadow-lg`;
    if (selectedAnswer === index && index !== questions[currentQuestion].correct) return `${baseClass} bg-red-500 text-white shadow-lg`;
    return `${baseClass} bg-gray-300 text-gray-600`;
  };

  if (gameState === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-6 text-center">
            <Smartphone className="mx-auto text-white mb-2" size={48} />
            <h1 className="text-2xl font-bold text-white">Mobile Quiz</h1>
            <p className="text-white opacity-90 text-sm">Join the quiz session</p>
          </div>
          <div className="bg-white rounded-3xl shadow-2xl p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Join Quiz</h2>
              <p className="text-gray-600">Enter your details to participate</p>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              joinQuiz();
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">Quiz Code</label>
                <input
                  type="text"
                  placeholder="Enter quiz code"
                  value={quizCode}
                  onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
                  className="w-full p-4 rounded-xl text-lg font-semibold text-center bg-white text-gray-900 placeholder-gray-500 border-2 border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 focus:outline-none shadow-sm"
                  maxLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">Your Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full p-4 rounded-xl text-lg font-semibold text-center bg-white text-gray-900 placeholder-gray-500 border-2 border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 focus:outline-none shadow-sm"
                  required
                />
              </div>
              {statusMsg && (
                <div className="text-red-500 text-sm text-center">
                  {statusMsg}
                </div>
              )}
              <button 
                type="submit" 
                disabled={!playerName.trim() || !quizCode.trim()} 
                className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-xl text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Wifi className="mr-2" size={24} />
                {statusMsg === 'Joining...' ? 'Joining...' : 'Join Quiz'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }


  if (gameState === 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <div className="mb-8">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-blue-600" size={48} />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Waiting Room</h2>
              <p className="text-gray-600">Get ready for the quiz!</p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <div className="grid grid-cols-2 gap-6 text-center mb-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Your Name</div>
                  <div className="text-xl font-bold text-gray-800">{playerName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Quiz Code</div>
                  <div className="text-2xl font-bold text-blue-600">{serverCode || quizCode}</div>
                </div>
              </div>
              
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-center text-yellow-700">
                  <Clock className="mr-2" size={20} />
                  <span className="font-medium">{statusMsg || 'Waiting for the quiz to start...'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    const maxScore = questions.length * 1500;
    const percentage = Math.round((score / maxScore) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <Trophy className="mx-auto text-yellow-500 mb-4" size={64} />
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Quiz Complete!</h2>
            <p className="text-xl text-gray-600 mb-4">Great job, {playerName}!</p>
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl p-6 mb-6">
              <div className="text-4xl font-bold text-purple-600 mb-2">{score.toLocaleString()}</div>
              <div className="text-gray-600 mb-2">Your Score</div>
              <div className="text-lg font-semibold text-blue-600">#{finalRank} Position</div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-xl text-center">
                <div className="font-bold text-2xl text-green-600">{percentage}%</div>
                <div className="text-sm text-green-700">Accuracy</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl text-center">
                <div className="font-bold text-2xl text-blue-600">{questions.length}</div>
                <div className="text-sm text-blue-700">Questions</div>
              </div>
            </div>
            <div className="text-center text-gray-600 mb-6">
              <p>🎉 Thanks for participating! 🎉</p>
              <p className="text-sm mt-2">Results will be shared by your instructor</p>
            </div>
            <button onClick={resetQuiz} className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-4 px-6 rounded-xl text-lg hover:from-green-600 hover:to-blue-600 transition-all duration-300 flex items-center justify-center">
              <Play className="mr-2" size={24} />
              Join Another Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Playing the quiz - Kahoot style (no question text, just answer options)
  if (!questions.length || !questions[currentQuestion]) return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 p-4">
      <div className="text-center text-white/80">Waiting for instructor to start or send the first question...</div>
    </div>
  );

  const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
  const shapes = ['🔺', '🔷', '⭐', '⭕'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 p-4">
      {toast && (
        <div className="fixed top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>
      )}
      
      {/* Header */}
      <div className="mb-4">
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex justify-between items-center text-white">
          <div className="text-center">
            <div className="text-xl font-bold">{score.toLocaleString()}</div>
            <div className="text-xs opacity-90">Score</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold">Q{currentQuestion + 1}/{questions.length}</div>
            <div className="text-xs opacity-90">Question</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{timeLeft}</div>
            <div className="text-xs opacity-90">Time</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="bg-white/30 rounded-full h-2">
          <div className="bg-white h-2 rounded-full transition-all duration-1000" style={{ width: `${(timeLeft / 20) * 100}%` }} />
        </div>
      </div>

      {/* Instruction */}
      <div className="mb-6 text-center">
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
          <div className="text-white text-lg font-semibold mb-2">Look at the shared screen for the question!</div>
          <div className="text-white/80">Choose your answer below:</div>
        </div>
      </div>

      {/* Kahoot-Style Answer Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {questions.length && questions[currentQuestion]
          ? questions[currentQuestion].options.map((option: string, index: number) => (
              <button
                key={index}
                onClick={() => handleAnswerClick(index)}
                disabled={showResult}
                className={`relative h-32 rounded-3xl font-bold text-lg transition-all duration-300 transform active:scale-95 ${
                  selectedAnswer === index 
                    ? `${colors[index]} scale-105 shadow-2xl ring-4 ring-white` 
                    : `${colors[index]} shadow-lg hover:shadow-xl hover:scale-[1.02]`
                } ${showResult ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex flex-col items-center justify-center h-full text-white">
                  <div className="text-4xl mb-2">{shapes[index]}</div>
                  <div className="text-sm font-semibold px-2 text-center">
                    {option.length > 20 ? `${option.substring(0, 20)}...` : option}
                  </div>
                </div>
                
                {/* Selection Indicator */}
                {selectedAnswer === index && (
                  <div className="absolute inset-0 bg-white/20 rounded-3xl flex items-center justify-center">
                    <div className="text-6xl">✓</div>
                  </div>
                )}
              </button>
            ))
          : (
            <div className="col-span-2 text-center text-white/80">Waiting for instructor to start or send the first question...</div>
            )}
      </div>

      {/* Answer Result Modal */}
      {showResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 text-center max-w-sm mx-4">
            {selectedAnswer === questions[currentQuestion].correct ? (
              <>
                <div className="text-8xl mb-4">🎉</div>
                <h3 className="text-3xl font-bold text-green-600 mb-2">Correct!</h3>
                <p className="text-gray-600 text-lg">Amazing! +{questions[currentQuestion].points + Math.floor((timeLeft / 20) * 500)} points</p>
                <div className="mt-4 text-sm text-gray-500">
                  Speed bonus: +{Math.floor((timeLeft / 20) * 500)} pts
                </div>
              </>
            ) : (
              <>
                <div className="text-8xl mb-4">😔</div>
                <h3 className="text-3xl font-bold text-red-600 mb-2">Oops!</h3>
                <p className="text-gray-600 text-lg">Better luck next time!</p>
                <p className="text-sm text-gray-500 mt-2">
                  The correct answer was: <span className="font-semibold text-green-600">{shapes[questions[currentQuestion].correct]}</span>
                </p>
              </>
            )}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center text-blue-700">
                <Clock className="mr-2" size={20} />
                <span className="font-medium">Waiting for instructor to go to next question...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentQuizApp;
