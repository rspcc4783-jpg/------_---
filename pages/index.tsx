import { useState, useEffect } from 'react';
import LoginPage from '@/components/LoginPage';
import AdminDashboard from '@/components/AdminDashboard';
import EvaluatorWorkspace from '@/components/EvaluatorWorkspace';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'evaluator';
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查本地存储的登录状态
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: User, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user.role === 'admin' ? (
        <AdminDashboard currentUser={user} onLogout={handleLogout} />
      ) : (
        <EvaluatorWorkspace currentUser={user} onLogout={handleLogout} />
      )}
    </div>
  );
}
