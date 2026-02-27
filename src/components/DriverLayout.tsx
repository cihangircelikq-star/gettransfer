import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDriverStore } from '@/stores/driverStore';
import { Button } from '@/components/ui/Button';
import { Car, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DriverLayoutProps {
  children: React.ReactNode;
}

export const DriverLayout: React.FC<DriverLayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const { me } = useDriverStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Sürücü müsait mi?
  const isAvailable = me?.available ?? false;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Minimal Header - Sadece Sürücü İçin */}
      <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="px-4">
          <div className="flex justify-between items-center h-14">
            {/* Sol: Logo + Durum */}
            <div className="flex items-center gap-3">
              <Car className="h-6 w-6 text-green-500" />
              <span className="text-lg font-bold text-white">GetTransfer</span>

              {/* Online/Offline Durum Göstergesi */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                isAvailable
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isAvailable ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                }`}></div>
                {isAvailable ? 'Online' : 'Mola'}
              </div>
            </div>

            {/* Sağ: Sürücü Adı + Çıkış */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <User className="h-4 w-4" />
                <span>{user?.name || me?.name || 'Sürücü'}</span>
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
