import { useScan } from '../context/ScanContext'
import SMSAnalyzer from '../components/SMSAnalyzer'
import { MessageSquare } from 'lucide-react'

const SMSAnalyzerPage = () => {
    const { updateStats, addFeedEvent, addScanRecord } = useScan()

    const handleScanComplete = (type, data, duration) => {
        const input = data.input || data.message || ''
        const risk = data.label === 'phishing' ? (data.confidence || 0.5) * 100 : (1 - (data.confidence || 0.5)) * 100

        updateStats(risk)
        addScanRecord(type, input, data, duration)

        if (data.label === "phishing") {
            addFeedEvent("⚠️ Suspicious SMS detected")
        } else {
            addFeedEvent("✅ Legitimate SMS verified")
        }
    }

    return (
        <div className="page-container">
            <div className="page-header animate-in">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center">
                        <MessageSquare size={20} className="text-violet-400" />
                    </div>
                    <div>
                        <h1 className="page-title">SMS Scanner</h1>
                        <p className="page-subtitle">Detect smishing and spam messages with AI</p>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto">
                <SMSAnalyzer onScanComplete={handleScanComplete} />
            </div>
        </div>
    )
}

export default SMSAnalyzerPage
