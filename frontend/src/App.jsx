import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from './utils/AuthContext'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import LoadingSpinner from './components/ui/LoadingSpinner'
import { ScanProvider } from './context/ScanContext'

function ProtectedLayout() {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020617]">
                <LoadingSpinner size="lg" text="Loading CyberSentinel..." />
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    return (
        <ScanProvider>
            <div className="min-h-screen flex flex-col bg-[#020617] text-white">
                <Navbar />
                <main className="flex-1">
                    <Outlet />
                </main>
                <Footer />
            </div>
        </ScanProvider>
    )
}

function PublicLayout({ children }) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020617]">
                <LoadingSpinner size="lg" text="Loading..." />
            </div>
        )
    }

    if (user) {
        return <Navigate to="/" replace />
    }

    return children
}

export { ProtectedLayout, PublicLayout }
