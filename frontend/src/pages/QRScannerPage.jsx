import { useScan } from '../context/ScanContext'
import QRScanner from '../components/QRScanner'
import { QrCode } from 'lucide-react'

const QRScannerPage = () => {
    const { updateStats, addFeedEvent, addScanRecord } = useScan()

    const handleScanComplete = (type, data, duration) => {
        const input = data.input || ''
        const risk = data.label === 'phishing' ? (data.confidence || 0.5) * 100 : (1 - (data.confidence || 0.5)) * 100

        updateStats(risk)
        addScanRecord(type, input, data, duration)

        if (data.label === "phishing") {
            addFeedEvent(`⚠️ QR Phishing: ${input}`)
        } else {
            addFeedEvent(`✅ QR Safe: ${input}`)
        }
    }

    return (
        <div className="page-container">
            <div className="page-header animate-in">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
                        <QrCode size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="page-title">QR Scanner</h1>
                        <p className="page-subtitle">Upload QR code images to check for hidden malicious URLs</p>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto">
                <QRScanner onScanComplete={handleScanComplete} />
            </div>
        </div>
    )
}

export default QRScannerPage
