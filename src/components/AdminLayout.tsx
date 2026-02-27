import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { 
  LogOut, User, Settings, Users, DollarSign, Menu, 
  LayoutDashboard, Car, FileText, MessageSquare, Bell,
  ChevronLeft, Bug
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { path: '/admin/drivers', label: 'Sürücüler', icon: Users },
    { path: '/admin/bookings', label: 'Rezervasyonlar', icon: FileText },
    { path: '/admin/customers', label: 'Müşteriler', icon: User },
    { path: '/admin/feedback', label: 'Geri Bildirimler', icon: MessageSquare },
    { path: '/admin/pricing', label: 'Fiyatlandırma', icon: DollarSign },
    { path: '/admin/settings', label: 'Ayarlar', icon: Settings },
    { path: '/admin/debug', label: 'Hata Ayıklama', icon: Bug },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        bg-gray-800 border-r border-gray-700
        transform transition-all duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
        w-64
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/20">
                <Settings className="h-6 w-6 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <span className="text-lg font-bold text-white">GetTransfer</span>
                  <div className="text-xs text-red-400 font-medium">Admin Paneli</div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all
                  ${isActive(item.path, item.exact) 
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/20' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive(item.path, item.exact) ? 'text-white' : ''}`} />
                {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Collapse Button (Desktop) */}
          <div className="hidden lg:block p-2 border-t border-gray-700">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className={`h-4 w-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
              {!sidebarCollapsed && <span className="text-sm">Daralt</span>}
            </button>
          </div>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-gray-700">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} mb-3`}>
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name || 'Admin'}</p>
                  <p className="text-xs text-gray-400">Yönetici</p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <Button
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-red-600 hover:border-red-600 hover:text-white transition-colors"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Çıkış Yap
              </Button>
            )}
            {sidebarCollapsed && (
              <button
                onClick={handleLogout}
                className="w-full p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                title="Çıkış Yap"
              >
                <LogOut className="h-5 w-5 mx-auto" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-400 hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-red-500" />
              <span className="text-white font-bold">Admin</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
