import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

const QuickActionCard = ({ title, description, icon: Icon, to, gradient = 'from-primary-500 to-primary-600', delay = 0 }) => {
    const navigate = useNavigate()

    return (
        <button
            onClick={() => navigate(to)}
            className="glass rounded-2xl p-5 text-left w-full group hover:border-slate-600/50 transition-all duration-300 animate-in cursor-pointer"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <Icon size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{title}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-slate-800/50 border border-slate-700/30 flex items-center justify-center shrink-0 mt-1 group-hover:bg-primary-500/20 group-hover:border-primary-500/30 transition-all duration-300">
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-primary-400 transition-colors" />
                </div>
            </div>
        </button>
    )
}

export default QuickActionCard
