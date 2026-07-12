import { useScan } from '../context/ScanContext'
import URLScanner from '../components/URLScanner'
import { Search } from 'lucide-react'

const URLScannerPage = () => {
    const { updateStats, addFeedEvent, addScanRecord } = useScan()

    const handleScanComplete = (type, data, duration) => {
        const input = data.input || ''
        const risk = data.label === 'phishing' ? (data.confidence || 0.5) * 100 : (1 - (data.confidence || 0.5)) * 100

        updateStats(risk)
        addScanRecord(type, input, data, duration)

        if (data.label === "phishing") {
            addFeedEvent(`⚠️ Phishing detected: ${input}`)
        } else if (risk >= 40) {
            addFeedEvent(`⚠️ Suspicious URL detected: ${input}`)
        } else {
            addFeedEvent(`✅ Safe: ${input}`)
        }
    }

    return (
        <div className="page-container">
            <div className="page-header animate-in">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/20 flex items-center justify-center">
                        <Search size={20} className="text-primary-400" />
                    </div>
                    <div>
                        <h1 className="page-title">URL Scanner</h1>
                        <p className="page-subtitle">Analyze URLs for phishing threats using AI</p>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto">
                <URLScanner onScanComplete={handleScanComplete} />
            </div>
        </div>
    )
}

export default URLScannerPage
