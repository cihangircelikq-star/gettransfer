import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Car, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Minimal Header - Sadece Müşteri İçin */}
      <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="px-4">
          <div className="flex justify-between items-center h-14">
            {/* Sol: Logo */}
            <div className="flex items-center gap-3">
              <Car className="h-6 w-6 text-blue-500" />
              <span className="text-lg font-bold text-white">GetTransfer</span>
              <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">Müşteri</span>
            </div>

            {/* Sağ: Müşteri Adı + Çıkış */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <User className="h-4 w-4" />
                <span>{user?.name || 'Müşteri'}</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-400 hover:text-white hover:bg-gray-700"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Çıkış
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};
