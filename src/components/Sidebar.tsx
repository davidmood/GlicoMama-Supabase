import {
  LayoutDashboard,
  List,
  PlusCircle,
  BarChart3,
  FileText,
  Target,
  Bell,
  User,
  Settings,
  Moon,
  Sun,
  LogOut,
  Users,
  Share2,
  Activity,
} from 'lucide-react';
import type { UserRole } from '../types';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
  userRole?: UserRole;
}

const patientNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'records', label: 'Registros', icon: List },
  { id: 'new-record', label: 'Novo Registro', icon: PlusCircle },
  { id: 'charts', label: 'Gráficos', icon: BarChart3 },
  { id: 'libre', label: 'CGM Libre', icon: Activity },
  { id: 'reports', label: 'Relatórios', icon: FileText },
  { id: 'goals', label: 'Metas', icon: Target },
  { id: 'reminders', label: 'Lembretes', icon: Bell },
  { id: 'share', label: 'Compartilhar', icon: Share2 },
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

const viewerNavItems = [
  { id: 'patients', label: 'Pacientes', icon: Users },
  { id: 'share', label: 'Adicionar Paciente', icon: Share2 },
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export default function Sidebar({
  currentPage,
  onNavigate,
  darkMode,
  onToggleDarkMode,
  userName,
  isOpen,
  onClose,
  onLogout,
  userRole = 'paciente',
}: SidebarProps) {
  const navItems = userRole === 'paciente' ? patientNavItems : viewerNavItems;
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/logo-192.png" alt="GlicoMama" className="sidebar-logo-img" />
            <div>
              <h1>Glicemia & Mama</h1>
              <span>Beta v1.0</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
            >
              <item.icon />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="dark-mode-toggle">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {darkMode ? <Moon size={14} /> : <Sun size={14} />}
              Modo Escuro
            </span>
            <div
              className={`toggle-switch ${darkMode ? 'active' : ''}`}
              onClick={onToggleDarkMode}
            />
          </div>

          <div className="sidebar-profile" onClick={() => onNavigate('profile')}>
            <div className="profile-avatar">{initials}</div>
            <div className="profile-info">
              <div className="name">{userName}</div>
              <div className="link">Ver perfil</div>
            </div>
          </div>

          {onLogout && (
            <button
              className="nav-item"
              onClick={onLogout}
              style={{ marginTop: 8, color: 'var(--text-muted)' }}
            >
              <LogOut size={18} />
              Sair
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
