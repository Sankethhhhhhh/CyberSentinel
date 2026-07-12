import { useEffect } from 'react'
import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react'

const variants = {
    success: { icon: CheckCircle, bg: 'bg-green-500/10', border: 'border-green-500/20', color: 'text-green-400' },
    warning: { icon: AlertTriangle, bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', color: 'text-yellow-400' },
    error: { icon: XCircle, bg: 'bg-red-500/10', border: 'border-red-500/20', color: 'text-red-400' },
}

const Notification = ({ message, type = 'success', onClose, duration = 4000 }) => {
    const variant = variants[type] || variants.success
    const Icon = variant.icon

    useEffect(() => {
        const timer = setTimeout(onClose, duration)
        return () => clearTimeout(timer)
    }, [onClose, duration])

    return (
        <div className={`fixed top-4 right-4 z-[100] ${variant.bg} ${variant.border} border rounded-xl px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl flex items-center gap-3 min-w-[300px] max-w-[420px] animate-in`}>
            <Icon size={18} className={variant.color} />
            <p className="text-sm text-slate-200 flex-1">{message}</p>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X size={16} />
            </button>
        </div>
    )
}

export default Notification
