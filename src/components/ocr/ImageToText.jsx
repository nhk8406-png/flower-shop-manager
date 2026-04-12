import { useState, useRef } from 'react'
import { Camera, Image, FileText, Loader2, Copy, Check, Download, RotateCcw } from 'lucide-react'

export default function ImageToText() {
  const [image, setImage] = useState(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const [mode, setMode] = useState('image') // 'image' or 'text'
  const fileRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [cameraOn, setCameraOn] = useState(false)

  // 파일 선택
  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImage(ev.target.result)
      setText('')
      setMode('image')
    }
    reader.readAsDataURL(file)
  }

  // 카메라 캡처
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      videoRef.current.srcObject = stream
      setCameraOn(true)
    } catch {
      alert('카메라 접근 권한이 필요합니다.')
    }
  }

  const captureCamera = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    setImage(canvas.toDataURL('image/png'))
    setText('')
    setMode('image')
    // stop camera
    video.srcObject?.getTracks().forEach((t) => t.stop())
    setCameraOn(false)
  }

  // OCR 실행
  const runOCR = async () => {
    if (!image) return
    setLoading(true)
    setProgress(0)
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('kor+eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100))
        },
      })
      const { data } = await worker.recognize(image)
      setText(data.text)
      setMode('text')
      await worker.terminate()
    } catch (e) {
      alert('텍스트 변환 실패: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // 텍스트 복사
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 텍스트 파일로 다운로드
  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `OCR_결과_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 리셋
  const handleReset = () => {
    setImage(null)
    setText('')
    setMode('image')
    setProgress(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-500" />
          이미지 → 텍스트 변환 (OCR)
        </h2>
        {(image || text) && (
          <button onClick={handleReset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition">
            <RotateCcw className="w-3 h-3" />
            초기화
          </button>
        )}
      </div>

      {/* 모드 토글 */}
      {image && text && (
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setMode('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${mode === 'image' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
          >
            <Image className="w-3 h-3" />
            이미지
          </button>
          <button
            onClick={() => setMode('text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${mode === 'text' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
          >
            <FileText className="w-3 h-3" />
            텍스트
          </button>
        </div>
      )}

      {/* 이미지 업로드 영역 */}
      {!image && !cameraOn && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
          <Image className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-4">스크린샷 또는 사진을 업로드하세요</p>
          <div className="flex gap-3 justify-center">
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 transition">
              <Image className="w-4 h-4" />
              파일 선택
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </label>
            <button
              onClick={startCamera}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
            >
              <Camera className="w-4 h-4" />
              카메라
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">발주서, 영수증, 메모 사진 등에서 텍스트를 추출합니다</p>
        </div>
      )}

      {/* 카메라 */}
      {cameraOn && (
        <div className="relative rounded-xl overflow-hidden bg-black">
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl" />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <button
              onClick={captureCamera}
              className="px-6 py-2 bg-white text-gray-800 rounded-full text-sm font-bold shadow-lg"
            >
              촬영
            </button>
            <button
              onClick={() => { videoRef.current.srcObject?.getTracks().forEach(t => t.stop()); setCameraOn(false) }}
              className="px-4 py-2 bg-gray-800/70 text-white rounded-full text-sm"
            >
              취소
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {/* 이미지 미리보기 */}
      {image && mode === 'image' && (
        <div className="relative">
          <img src={image} alt="업로드 이미지" className="w-full rounded-xl border border-gray-200 max-h-80 object-contain bg-gray-50" />
          {!text && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={runOCR}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    텍스트 변환 중... {progress}%
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    텍스트로 변환
                  </>
                )}
              </button>
              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">
                <Image className="w-4 h-4" />
                변경
                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </label>
            </div>
          )}
          {loading && (
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* 텍스트 결과 */}
      {text && mode === 'text' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-medium text-gray-500">추출된 텍스트</span>
            <div className="flex gap-1">
              <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? '복사됨' : '복사'}
              </button>
              <button onClick={handleDownload} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
                <Download className="w-3 h-3" />
                저장
              </button>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-4 text-sm text-gray-700 leading-relaxed resize-none min-h-[200px] focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}
