import { useEffect, useRef, useState } from 'react'

const AnimatedValue = ({ value, duration = 800 }) => {
    const [display, setDisplay] = useState(0)
    const ref = useRef(null)
    const hasAnimated = useRef(false)

    useEffect(() => {
        if (hasAnimated.current) { setDisplay(value); return }
        hasAnimated.current = true
        const start = performance.now()
        const from = 0
        const to = value

        const animate = (now) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setDisplay(Math.round(from + (to - from) * eased))
            if (progress < 1) requestAnimationFrame(animate)
        }
        requestAnimationFrame(animate)
    }, [value, duration])

    return <>{display}</>
}

const statConfig = {
    total: {
        gradient: 'from-primary-500/20 to-primary-600/10',
        border: 'border-primary-500/20',
        iconBg: 'from-primary-500 to-primary-600',
        iconColor: 'text-white',
        textColor: 'text-primary-300',
    },
    safe: {
        gradient: 'from-green-500/20 to-green-600/10',
        border: 'border-green-500/20',
        iconBg: 'from-green-500 to-emerald-600',
        iconColor: 'text-white',
        textColor: 'text-green-300',
    },
    suspicious: {
        gradient: 'from-yellow-500/20 to-yellow-600/10',
        border: 'border-yellow-500/20',
        iconBg: 'from-yellow-500 to-amber-600',
        iconColor: 'text-white',
        textColor: 'text-yellow-300',
    },
    phishing: {
        gradient: 'from-red-500/20 to-red-600/10',
        border: 'border-red-500/20',
        iconBg: 'from-red-500 to-rose-600',
        iconColor: 'text-white',
        textColor: 'text-red-300',
    },
}

const StatCard = ({ label, value, icon: Icon, type = 'total', delay = 0 }) => {
    const cfg = statConfig[type] || statConfig.total

    return (
        <div
            className="glass rounded-2xl p-5 flex items-center justify-between group hover:border-slate-600/50 transition-all duration-300 animate-in"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">{label}</p>
                <p className={`text-3xl font-bold mt-1.5 ${cfg.textColor} tabular-nums`}>
                    <AnimatedValue value={value} />
                </p>
            </div>
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${cfg.gradient} border ${cfg.border} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                <Icon size={20} className={cfg.iconColor} />
            </div>
        </div>
    )
}

export default StatCard
