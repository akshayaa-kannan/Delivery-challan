import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  FileText, 
  Truck,
  RotateCcw,
  Scale,
  Users,
  Package,
  Boxes,
  Settings as SettingsIcon, 
  LogOut, 
  LogIn,
  X,
  Zap,
  BarChart,
  Trash2,
  Building,
  Building2,
  UserCheck,
  CreditCard,
  History,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isOpen, onClose, onOpenSubscription }) {
  const { 
    currentUser, 
    currentCompany, 
    userCompanies, 
    role, 
    isAdmin, 
    logout, 
    switchCompany 
  } = useAuth();

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/new', label: 'New Challan', icon: PlusCircle },
    { to: '/challans', label: 'All Challans', icon: FileText },
    { to: '/deliveries', label: 'Deliveries', icon: Truck },
    { to: '/transport', label: 'Transport & Weight', icon: Scale },
    { to: '/returnable-goods', label: 'Returnable Goods', icon: RotateCcw },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/products', label: 'Products', icon: Package },
    { to: '/inventory', label: 'Inventory', icon: Boxes },
    { to: '/branches', label: 'Branches', icon: Building2 },
    { to: '/team', label: 'Team', icon: UserCheck },
    { to: '/reports', label: 'Reports', icon: BarChart },
  ];

  if (isAdmin) {
    links.push({ to: '/subscription', label: 'Subscription', icon: CreditCard });
    links.push({ to: '/audit-logs', label: 'Audit Trail', icon: History });
    links.push({ to: '/settings', label: 'Settings', icon: SettingsIcon });
    links.push({ to: '/recycle-bin', label: 'Recycle Bin', icon: Trash2 });
  }

  const companyDisplayName = currentCompany?.displayName || currentCompany?.legalName || "My Company";

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#1e293b] text-white select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#334155]">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-base shadow-md shadow-amber-500/20">
              N
            </div>
            <div>
              <div className="text-sm font-black tracking-tight text-white leading-tight">NAYARUVI</div>
              <div className="text-[10px] text-amber-400 font-bold tracking-widest uppercase">Delivery Challan</div>
            </div>
          </Link>

          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded lg:hidden"
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Company Card / Switcher */}
        {currentCompany && (
          <div className="relative mt-4 p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center p-1 shrink-0 overflow-hidden rounded-md">
              {currentCompany.logoUrl ? (
                <img src={currentCompany.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <Building size={16} className="text-slate-800" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Tenant Workspace</div>
              <div className="text-xs font-bold text-white truncate" title={companyDisplayName}>
                {companyDisplayName}
              </div>
            </div>

            {/* Multiple company selector dropdown if user has more than 1 company */}
            {userCompanies && userCompanies.length > 1 && (
              <div className="relative shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer" title="Switch Company">
                <ChevronDown size={14} className="pointer-events-none" />
                <select
                  value={currentCompany.id}
                  onChange={(e) => switchCompany(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                  title="Switch Company"
                >
                  {userCompanies.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white py-1">
                      {c.displayName || c.legalName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={({ isActive }) => 
              `flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10' 
                  : 'text-slate-300 hover:bg-[#334155] hover:text-white'
              }`
            }
            end={link.to === '/'}
          >
            <link.icon size={18} className="shrink-0" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer Info & Auth Actions */}
      <div className="p-4 border-t border-[#334155] bg-[#0f172a]/60 space-y-3">
        {/* User Role Badge & Signout */}
        {currentUser ? (
          <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-300 bg-slate-800/80 rounded-lg border border-slate-700/50">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-semibold">{currentUser.email}</span>
              <span className="font-extrabold text-amber-400 uppercase text-[10px] tracking-wider">{role}</span>
            </div>
            <button 
              onClick={logout}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <Link 
            to="/login"
            className="flex items-center justify-center gap-1.5 w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-all"
          >
            <LogIn size={14} />
            Sign In
          </Link>
        )}

        {/* Subscription Plan Action */}
        {onOpenSubscription && (
          <button
            onClick={onOpenSubscription}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-md cursor-pointer"
          >
            <Zap size={14} className="fill-current" />
            <span>Subscription & Billing</span>
          </button>
        )}

        {/* Quick Compliance Links (Razorpay Verification) */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
          <Link to="/about" className="hover:text-amber-400 transition-colors">About</Link>
          <span>•</span>
          <Link to="/pricing" className="hover:text-amber-400 transition-colors">Pricing</Link>
          <span>•</span>
          <Link to="/terms" className="hover:text-amber-400 transition-colors">Terms</Link>
          <span>•</span>
          <Link to="/privacy-policy" className="hover:text-amber-400 transition-colors">Privacy</Link>
          <span>•</span>
          <Link to="/refund-policy" className="hover:text-amber-400 transition-colors">Refunds</Link>
          <span>•</span>
          <Link to="/contact" className="hover:text-amber-400 transition-colors">Contact</Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Desktop Sidebar (Persistent) */}
      <aside className="hidden lg:block w-64 h-screen shrink-0 sticky top-0 border-r border-slate-200 print:hidden">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Slide in) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {sidebarContent}
      </aside>
    </>
  );
}
