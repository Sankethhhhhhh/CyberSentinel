import { useAuth } from '../utils/AuthContext'
import { useScan } from '../context/ScanContext'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Shield, Activity, Calendar, Clock, LogOut, BarChart3, ScanLine } from 'lucide-react'
import { useEffect, useState } from 'react'

const Profile = () => {
    const { user, logout } = useAuth()
    const { stats } = useScan()
    const navigate = useNavigate()
    const [joinDate] = useState(() => {
        const stored = localStorage.getItem('cybersentinel_join_date')
        if (stored) return stored
        const now = new Date().toISOString()
        localStorage.setItem('cybersentinel_join_date', now)
        return now
    })

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className="page-container">
            <div className="page-header animate-in">
                <h1 className="page-title">Profile</h1>
                <p className="page-subtitle">Manage your account and view statistics</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* User Info Card */}
                <div className="md:col-span-1">
                    <div className="glass rounded-2xl p-6 animate-in">
                        <div className="flex flex-col items-center text-center">
                            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-2xl shadow-primary-500/25 mb-4">
                                <User size={36} className="text-white" />
                            </div>
                            <h2 className="text-lg font-bold text-white">{user?.name}</h2>
                            <p className="text-xs text-slate-400 mt-1">{user?.email}</p>

                            <div className="w-full mt-6 space-y-3">
                                <div className="flex items-center gap-3 bg-slate-800/40 rounded-xl px-4 py-3">
                                    <Mail size={14} className="text-primary-400" />
                                    <div className="text-left">
                                        <p className="text-[10px] text-slate-500 font-semibold">Email</p>
                                        <p className="text-xs text-slate-300">{user?.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-slate-800/40 rounded-xl px-4 py-3">
                                    <Calendar size={14} className="text-primary-400" />
                                    <div className="text-left">
                                        <p className="text-[10px] text-slate-500 font-semibold">Member Since</p>
                                        <p className="text-xs text-slate-300">
                                            {new Date(joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="btn-secondary w-full mt-6 flex items-center justify-center gap-2"
                            >
                                <LogOut size={14} />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats & Activity */}
                <div className="md:col-span-2 space-y-6">
                    {/* Account Stats */}
                    <div className="glass rounded-2xl p-6 animate-in" style={{ animationDelay: '80ms' }}>
                        <h3 className="text-sm font-bold text-slate-200 mb-5 flex items-center gap-2">
                            <BarChart3 size={16} className="text-primary-400" />
                            Account Statistics
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Total Scans', value: stats.total, icon: ScanLine, color: 'text-primary-300', bg: 'bg-primary-500/10' },
                                { label: 'Safe', value: stats.safe, icon: Shield, color: 'text-green-300', bg: 'bg-green-500/10' },
                                { label: 'Suspicious', value: stats.suspicious, icon: Activity, color: 'text-yellow-300', bg: 'bg-yellow-500/10' },
                                { label: 'Phishing', value: stats.phishing, icon: Shield, color: 'text-red-300', bg: 'bg-red-500/10' },
                            ].map((stat, i) => {
                                const Icon = stat.icon
                                return (
                                    <div key={i} className={`${stat.bg} border border-slate-700/30 rounded-xl p-4 text-center`}>
                                        <Icon size={20} className={`${stat.color} mx-auto mb-2`} />
                                        <p className={`text-xl font-bold ${stat.color} tabular-nums`}>{stat.value}</p>
                                        <p className="text-[10px] text-slate-500 font-medium mt-1">{stat.label}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="glass rounded-2xl p-6 animate-in" style={{ animationDelay: '160ms' }}>
                        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                            <Clock size={16} className="text-primary-400" />
                            Quick Links
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'URL Scanner', desc: 'Analyze URLs', to: '/url-scanner' },
                                { label: 'SMS Scanner', desc: 'Check messages', to: '/sms-scanner' },
                                { label: 'QR Scanner', desc: 'Scan QR codes', to: '/qr-scanner' },
                                { label: 'Scan History', desc: 'View past scans', to: '/history' },
                            ].map((link, i) => (
                                <button
                                    key={i}
                                    onClick={() => navigate(link.to)}
                                    className="bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-3 text-left hover:bg-slate-700/40 hover:border-slate-600/50 transition-all duration-200 group"
                                >
                                    <p className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">{link.label}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{link.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* About */}
                    <div className="glass rounded-2xl p-6 animate-in" style={{ animationDelay: '240ms' }}>
                        <h3 className="text-sm font-bold text-slate-200 mb-3">About CyberSentinel</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            CyberSentinel is an AI-powered multi-modal phishing detection platform. 
                            It uses machine learning models (XGBoost, RandomForest) to detect phishing 
                            threats across URLs, SMS messages, and QR codes in real-time.
                        </p>
                        <div className="flex items-center gap-4 mt-4 text-[10px] text-slate-500">
                            <span>v1.0.0</span>
                            <span className="h-1 w-1 rounded-full bg-slate-600" />
                            <span>FastAPI + React</span>
                            <span className="h-1 w-1 rounded-full bg-slate-600" />
                            <span>XGBoost ML</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Profile
