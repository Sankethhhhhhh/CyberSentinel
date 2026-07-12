const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
    const sizeClasses = {
        sm: 'h-5 w-5 border-2',
        md: 'h-8 w-8 border-[2.5px]',
        lg: 'h-12 w-12 border-[3px]',
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative">
                <div className={`${sizeClasses[size]} rounded-full border-slate-700/50 border-t-primary-400 animate-spin`} />
                <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full border-2 border-transparent border-b-primary-400/40 animate-spin`}
                    style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
            </div>
            {text && <p className="text-xs text-slate-500 font-medium">{text}</p>}
        </div>
    )
}

export default LoadingSpinner
