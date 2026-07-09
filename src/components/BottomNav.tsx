import { useLocation, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, History, Shield, Settings } from 'lucide-react';

const navItems = [
  { path: '/', icon: Home, label: 'Главная' },
  { path: '/add', icon: PlusCircle, label: 'Запись' },
  { path: '/history', icon: History, label: 'История' },
  { path: '/safety', icon: Shield, label: 'Безопасность' },
  { path: '/settings', icon: Settings, label: 'Настройки' }
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="glass fixed bottom-0 left-0 right-0 z-40 border-t border-usnee-border">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-1 transition-colors ${
                active ? 'text-usnee-accent' : 'text-usnee-text2'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
