import { Github, Linkedin, Shield, Zap } from 'lucide-react'

const Footer = () => {
    return (
        <footer className="border-t border-slate-800/50 bg-slate-950/40 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid md:grid-cols-3 gap-8">

                    {/* Brand */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2.5">
                            <Shield size={20} className="text-primary-400" />
                            <span className="text-sm font-bold text-gradient">CyberSentinel</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                            AI-powered multi-modal phishing detection platform. Protecting users across web, SMS, and QR channels.
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-medium">
                            <Zap size={10} className="text-primary-500/50" />
                            v1.0.0
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Links</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'URL Scanner', to: '/url-scanner' },
                                { label: 'SMS Scanner', to: '/sms-scanner' },
                                { label: 'QR Scanner', to: '/qr-scanner' },
                                { label: 'Scan History', to: '/history' },
                            ].map(link => (
                                <a key={link.label} href={link.to}
                                    className="text-xs text-slate-500 hover:text-primary-400 transition-colors">
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Developer */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Developer</h4>
                        <p className="text-xs text-slate-500">Built with React, FastAPI &amp; XGBoost</p>
                        <div className="flex items-center gap-3">
                            <a href="#" className="h-8 w-8 rounded-lg bg-slate-800/50 border border-slate-700/30 flex items-center justify-center hover:bg-slate-700/50 hover:border-slate-600/50 transition-all duration-200 group">
                                <Github size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                            </a>
                            <a href="#" className="h-8 w-8 rounded-lg bg-slate-800/50 border border-slate-700/30 flex items-center justify-center hover:bg-slate-700/50 hover:border-slate-600/50 transition-all duration-200 group">
                                <Linkedin size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                            </a>
                        </div>
                    </div>

                </div>

                <div className="mt-8 pt-6 border-t border-slate-800/30 text-center">
                    <p className="text-[10px] text-slate-600">
                        &copy; {new Date().getFullYear()} CyberSentinel. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
