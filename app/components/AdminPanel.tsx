/* @ts-nocheck */
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Play, Square, Users, Trophy, Clock, Edit3 } from 'lucide-react';
import { getApiBase } from '../utils/api-config';

type QuestionItem = {
  question: string;
  options: string[];
  correct: number;
  points: number;
};

type StudentItem = {
  name: string;
  score: number;
  answered: number;
};

// Dynamic API base that auto-detects network IP
let API_BASE = '';
// Turn off simulated/demo students; real-time integration can populate from server later
const DEMO_MODE = false;

const AdminPanel: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [quizActive, setQuizActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdQuizId, setCreatedQuizId] = useState<string | null>(null);
  const [quizCode, setQuizCode] = useState<string | null>(null);
  const [activeQuizzes, setActiveQuizzes] = useState<any[]>([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [newQuestion, setNewQuestion] = useState<QuestionItem>({
    question: '',
    options: ['', '', '', ''],
    correct: 0,
    points: 1000
  });
  const [editingIndex, setEditingIndex] = useState(-1);

  // Initialize API base
  useEffect(() => {
    const initApi = async () => {
      API_BASE = await getApiBase();
    };
    initApi();
  }, []);

  // Poll real participants from server when quiz is active
  useEffect(() => {
    if (!quizActive || !createdQuizId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/quizzes/${createdQuizId}/participants`);
        if (res.ok) {
          const list = await res.json();
          setStudents(Array.isArray(list) ? list : []);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [quizActive, createdQuizId]);

  useEffect(() => {
    const fetchActive = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/student/quizzes`);
        if (!res.ok) throw new Error('Failed to fetch active quizzes');
        const data = await res.json();
        setActiveQuizzes(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchActive();
  }, []);

  const addQuestion = () => {
    if (newQuestion.question.trim() && newQuestion.options.every(opt => opt.trim())) {
      if (editingIndex >= 0) {
        const updatedQuestions = [...questions];
        updatedQuestions[editingIndex] = { ...newQuestion };
        setQuestions(updatedQuestions);
        setEditingIndex(-1);
      } else {
        setQuestions([...questions, { ...newQuestion }]);
      }
      setNewQuestion({
        question: '',
        options: ['', '', '', ''],
        correct: 0,
        points: 1000
      });
    }
  };

  const editQuestion = (index: number) => {
    setNewQuestion({ ...questions[index] });
    setEditingIndex(index);
  };

  const saveQuiz = async () => {
    if (questions.length === 0 || saving) return;
    setError('');
    setSaving(true);
    try {
      const mappedQuestions = questions.map((q) => ({
        questionText: q.question,
        options: q.options,
        correctAnswer: q.options[q.correct],
        points: q.points || 1000
      }));

      const title = quizTitle.trim() || `Quiz ${new Date().toLocaleString()}`;
      const createRes = await fetch(`${API_BASE}/api/admin/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, questions: mappedQuestions })
      });
      if (!createRes.ok) {
        const errBody = await createRes.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to create quiz');
      }
      const createdQuiz = await createRes.json();
      setCreatedQuizId(createdQuiz._id);

      try {
        const res = await fetch(`${API_BASE}/api/student/quizzes`);
        if (res.ok) setActiveQuizzes(await res.json());
      } catch {}
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const startQuiz = async () => {
    if (questions.length === 0 || saving) return;
    setError('');
    setSaving(true);
    try {
      const mappedQuestions = questions.map((q) => ({
        questionText: q.question,
        options: q.options,
        correctAnswer: q.options[q.correct],
        points: q.points || 1000
      }));

      const title = quizTitle.trim() || `Quiz ${new Date().toLocaleString()}`;
      const createRes = await fetch(`${API_BASE}/api/admin/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, questions: mappedQuestions })
      });
      if (!createRes.ok) {
        const errBody = await createRes.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to create quiz');
      }
      const createdQuiz = await createRes.json();
      const newQuizId = createdQuiz._id;
      setCreatedQuizId(newQuizId);

      const startRes = await fetch(`${API_BASE}/api/admin/quizzes/${newQuizId}/start`, {
        method: 'PUT'
      });
      if (!startRes.ok) {
        const errBody = await startRes.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to start quiz');
      }
      const started = await startRes.json();
      setQuizCode(started.code || null);

      setQuizActive(true);
      setCurrentQuestion(-1); // Start at -1 to show "Start First Question"
      setShowResults(false);
      setStudents([]);

      // Fetch the actual questions from database to ensure admin sees the same as students
      try {
        const dbQuestionsRes = await fetch(`${API_BASE}/api/student/quiz-by-code?code=${started.code}`);
        if (dbQuestionsRes.ok) {
          const dbQuizData = await dbQuestionsRes.json();
          console.log('Raw database quiz data:', dbQuizData);
          if (dbQuizData.questions && Array.isArray(dbQuizData.questions)) {
            // Update the questions array to match what students see
            const dbQuestions = dbQuizData.questions.map((q: any) => ({
              question: q.questionText || q.question,
              options: q.options || [],
              correct: q.options ? Math.max(0, q.options.indexOf(q.correctAnswer)) : 0,
              points: q.points || 1000
            }));
            setQuestions(dbQuestions);
            console.log('Updated admin questions to match database:', dbQuestions);
            console.log('Questions synchronized - Admin now sees same as students!');
          }
        }
      } catch (err) {
        console.warn('Could not fetch database questions for admin sync:', err);
      }

      // Generate host screen URL
      const hostUrl = `${window.location.origin}/host?quizId=${newQuizId}&code=${started.code}`;
      
      // Show host screen instructions
      setError(`Quiz started! 🎉\n\nHost Screen URL (for projector):\n${hostUrl}\n\nStudent join at: ${window.location.origin}/student\nGame PIN: ${started.code}`);

      try {
        const res = await fetch(`${API_BASE}/api/student/quizzes`);
        if (res.ok) setActiveQuizzes(await res.json());
      } catch {}
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const stopQuiz = () => {
    setQuizActive(false);
    setShowResults(true);
  };

  const nextQuestion = async () => {
    try {
      if (!createdQuizId) return;
      const res = await fetch(`${API_BASE}/api/admin/quizzes/${createdQuizId}/next`, { method: 'PUT' });
      if (res.ok) {
        const st = await res.json();
        if (typeof st.currentIndex === 'number') {
          setCurrentQuestion(st.currentIndex);
          
          // Check if we've moved beyond the last question (quiz completion)
          if (st.currentIndex >= questions.length) {
            stopQuiz();
            return;
          }
        }
      } else {
        // If the API call fails, fallback to local advance
        if (currentQuestion < questions.length - 1) {
          setCurrentQuestion(currentQuestion + 1);
        } else {
          stopQuiz();
        }
      }
    } catch {
      // fallback to local advance
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        stopQuiz();
      }
    }
  };

  const updateQuestionField = (field: string, value: any) => {
    setNewQuestion({ ...newQuestion, [field]: value });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = value;
    setNewQuestion({ ...newQuestion, options: newOptions });
  };

  if (showResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <Trophy className="mx-auto text-yellow-500 mb-4" size={64} />
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Quiz Results</h1>
              <p className="text-xl text-gray-600">Final Leaderboard</p>
            </div>
            <div className="max-w-2xl mx-auto">
              {students.length > 0 ? (
                <>
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 mb-6 text-center text-white">
                    <Trophy size={48} className="mx-auto mb-4" />
                    <h2 className="text-3xl font-bold mb-2">🏆 Winner 🏆</h2>
                    <div className="text-2xl font-bold">{students[0].name}</div>
                    <div className="text-xl">{students[0].score.toLocaleString()} points</div>
                  </div>
                  <div className="space-y-4">
                    {students.slice(1).map((student, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center font-bold text-gray-700 mr-4">
                            {index + 2}
                          </div>
                          <div className="font-semibold text-gray-800">{student.name}</div>
                        </div>
                        <div className="font-bold text-blue-600">{student.score.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-600 bg-gray-50 rounded-2xl p-8">
                  No participants yet. Ask students to join and play the quiz.
                </div>
              )}
            </div>
            <div className="text-center mt-8">
              <button
                onClick={() => {
                  setShowResults(false);
                  setQuizActive(false);
                  setCurrentQuestion(0);
                  setStudents([]);
                }}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-8 rounded-xl text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
              >
                Create New Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Quiz Control Header */}
          <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl shadow-xl p-6 mb-6 text-white">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-3xl font-bold">🎯 Quiz Active - Kahoot Style!</h2>
                <p className="text-lg opacity-90">
                  {currentQuestion === -1 ? 'Ready to Start' : `Question ${currentQuestion + 1} of ${questions.length}`}
                </p>
                {quizCode && (
                  <p className="text-xl font-bold mt-2">Game PIN: {quizCode}</p>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center bg-white/20 rounded-xl p-3">
                  <div className="text-2xl font-bold">{students.length}</div>
                  <div className="text-sm">Players</div>
                </div>
                <button onClick={stopQuiz} className="bg-red-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-red-600 transition-all duration-300 flex items-center">
                  <Square className="mr-2" size={20} />
                  Stop Quiz
                </button>
              </div>
            </div>
            
            {/* Host Screen Instructions */}
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4">
              <h3 className="text-lg font-bold mb-2">📺 Host Screen (for projector):</h3>
              <div className="flex items-center space-x-4">
                <code className="bg-black/20 px-3 py-2 rounded flex-1 text-sm">
                  {window.location.origin}/host?quizId={createdQuizId}&code={quizCode}
                </code>
                <button
                  onClick={() => {
                    const hostUrl = `${window.location.origin}/host?quizId=${createdQuizId}&code=${quizCode}`;
                    window.open(hostUrl, '_blank');
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg whitespace-nowrap"
                >
                  🖥️ Open Host Screen
                </button>
              </div>
            </div>

            {/* Student Instructions */}
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <h3 className="text-lg font-bold mb-2">📱 Tell students to:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>1. Go to: <code className="bg-black/20 px-2 py-1 rounded">{window.location.origin.replace('http://', '')}/student</code></div>
                <div>2. Enter PIN: <span className="font-bold text-xl">{quizCode}</span></div>
                <div>3. Enter name & join!</div>
              </div>
            </div>
          </div>

          {/* Quiz Controls */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-800">Quiz Controls</h3>
              <button onClick={nextQuestion} className="bg-green-500 text-white font-bold py-4 px-8 rounded-xl hover:bg-green-600 transition-all duration-300 text-lg">
                {currentQuestion === -1 ? '🚀 Start First Question' : 
                 currentQuestion < questions.length - 1 ? '➡️ Next Question' : '🏁 Finish Quiz'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Current Question</h3>
              <div className="bg-blue-50 rounded-xl p-6">
                {currentQuestion === -1 ? (
                  <div className="text-center text-gray-600">
                    <h4 className="text-lg font-semibold mb-2">Ready to Start!</h4>
                    <p>Click "Start First Question" to begin the quiz.</p>
                    <p className="text-sm mt-2">Students are in the waiting room.</p>
                  </div>
                ) : (
                  <>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">{questions[currentQuestion]?.question}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {questions[currentQuestion]?.options.map((option, index) => (
                        <div key={index} className={`p-3 rounded-lg font-medium ${index === questions[currentQuestion].correct ? 'bg-green-100 text-green-800 border-2 border-green-300' : 'bg-gray-100 text-gray-700'}`}>
                          {String.fromCharCode(65 + index)}: {option}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Live Leaderboard</h3>
              {students.length === 0 ? (
                <div className="text-sm text-gray-500">No answers yet. Leaderboard will appear here when students answer.</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {students.map((student, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${index === 0 ? 'bg-amber-200 border-2 border-amber-400 text-gray-900' : 'bg-white border border-gray-200 text-gray-800'}`}>
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 ${index === 0 ? 'bg-amber-600 text-white' : 'bg-gray-300 text-gray-700'}`}>
                          {index + 1}
                        </div>
                        <span className="font-medium">{student.name}</span>
                      </div>
                      <span className="font-bold text-indigo-600">{student.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Quiz Admin Panel</h1>
            <p className="text-xl text-gray-600">Create and manage your quiz questions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{editingIndex >= 0 ? 'Edit Question' : 'Add New Question'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title</label>
                <input type="text" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400" placeholder="Enter quiz title (optional)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                <textarea value={newQuestion.question} onChange={(e) => updateQuestionField('question', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black placeholder-gray-400" rows={3} placeholder="Enter your question..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                {newQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <input type="radio" name="correct" checked={newQuestion.correct === index} onChange={() => updateQuestionField('correct', index)} className="mr-3" />
                    <input type="text" value={option} onChange={(e) => updateOption(index, e.target.value)} className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400" placeholder={`Option ${String.fromCharCode(65 + index)}`} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                <input type="number" value={newQuestion.points} onChange={(e) => updateQuestionField('points', parseInt(e.target.value) || 1000)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400" min={100} max={5000} />
              </div>
              <button onClick={addQuestion} className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:from-green-600 hover:to-blue-600 transition-all duration-300 flex items-center justify-center">
                <Plus className="mr-2" size={20} />
                {editingIndex >= 0 ? 'Update Question' : 'Add Question'}
              </button>
              {editingIndex >= 0 && (
                <button onClick={() => { setEditingIndex(-1); setNewQuestion({ question: '', options: ['', '', '', ''], correct: 0, points: 1000 }); }} className="w-full bg-gray-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600 transition-all duration-300">
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
                  <div className="text-sm text-gray-600">Questions</div>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{questions.reduce((sum, q) => sum + q.points, 0).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Points</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">{questions.length * 20}s</div>
                  <div className="text-sm text-gray-600">Est. Time</div>
                </div>
              </div>

              <div className="mt-4 text-left">
                <div className="text-sm font-semibold text-gray-700 mb-2">Active Quizzes on Server</div>
                {activeQuizzes.length === 0 ? (
                  <div className="text-sm text-gray-500">No active quizzes</div>
                ) : (
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {activeQuizzes.map((q: any) => (
                      <li key={q._id || q.title}>{q.title}</li>
                    ))}
                  </ul>
                )}
              </div>

              {error && (<div className="mt-4 text-red-600 text-sm font-medium">{error}</div>)}
              {createdQuizId && (<div className="mt-2 text-green-700 text-sm font-medium">Saved! Quiz ID: {createdQuizId}</div>)}

              <button onClick={saveQuiz} disabled={questions.length === 0 || saving} className="w-full mt-4 bg-blue-600 text-white font-bold py-3 px-6 rounded-xl text-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Saving...' : 'Save Quiz (Draft)'}
              </button>

              <button onClick={startQuiz} disabled={questions.length === 0 || saving} className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-xl text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                <Play className="mr-2" size={24} />
                {saving ? 'Starting...' : `Start Quiz (${questions.length} questions)`}
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Questions ({questions.length})</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {questions.map((q, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-800 flex-1 mr-4">{q.question}</h4>
                      <div className="flex space-x-2">
                        <button onClick={() => editQuestion(index)} className="text-blue-500 hover:text-blue-700 p-1"><Edit3 size={16} /></button>
                        <button onClick={() => setQuestions(questions.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">Correct: {String.fromCharCode(65 + q.correct)} - {q.options[q.correct]} ({q.points} pts)</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
