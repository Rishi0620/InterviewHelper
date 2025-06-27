"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card"
import { Badge } from "@/frontend/components/ui/badge"
import { ScrollArea } from "@/frontend/components/ui/scroll-area"
import { Mic, MicOff, MessageSquare } from "lucide-react"

interface TranscriptionSegment {
  id: string
  text: string
  timestamp: number
  confidence?: number
}

interface TranscriptionPanelProps {
  transcription: TranscriptionSegment[]
  currentTranscript: string
  isTranscribing: boolean
  isConnected: boolean
}

export function TranscriptionPanel({
  transcription,
  currentTranscript,
  isTranscribing,
  isConnected,
}: TranscriptionPanelProps) {
  // Show each transcription segment individually with timestamps
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const getSessionStartTime = () => {
    if (transcription.length === 0) return ""
    return formatTime(transcription[0].timestamp)
  }

  const getLastUpdateTime = () => {
    if (transcription.length === 0) return ""
    return formatTime(transcription[transcription.length - 1].timestamp)
  }

  const combinedText = ""

  return (
    <Card className="shadow-2xl bg-slate-800 border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-white">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          Live Transcription
        </CardTitle>
        <div className="flex items-center justify-between">
          <Badge
            variant={isTranscribing ? "default" : "outline"}
            className={`gap-1 text-xs ${isTranscribing ? "bg-green-600" : "border-gray-600 text-gray-400"}`}
          >
            {isTranscribing ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            {isTranscribing ? "Listening" : "Silent"}
          </Badge>
          {transcription.length > 0 && <div className="text-xs text-blue-300">Started: {getSessionStartTime()}</div>}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!isConnected ? (
          <div className="p-4 text-center text-gray-400">
            <MicOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Transcription service not connected</p>
            <p className="text-xs mt-1">Connect to start voice analysis</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            {transcription.length === 0 && !currentTranscript ? (
              <div className="p-4 text-center text-gray-400">
                <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Start speaking to see transcription</p>
                <p className="text-xs mt-1">Explain your coding approach</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {/* Show all transcription segments */}
                {transcription.map((segment, index) => (
                  <div key={segment.id} className="bg-slate-900 rounded-lg p-3 border border-blue-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-blue-300">Segment #{transcription.length - index}</span>
                      <span className="text-xs text-gray-400">{formatTime(segment.timestamp)}</span>
                    </div>
                    <div className="text-sm text-gray-200 leading-relaxed">{segment.text}</div>
                    {segment.confidence && (
                      <div className="mt-2 text-xs text-gray-500">
                        Confidence: {Math.round(segment.confidence * 100)}%
                      </div>
                    )}
                  </div>
                ))}

                {/* Current/Live transcription */}
                {currentTranscript && (
                  <div className="bg-blue-950 rounded-lg p-3 border border-blue-500">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-blue-300">Live</span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-xs text-red-400">Recording</span>
                      </div>
                    </div>
                    <div className="text-sm text-blue-200 leading-relaxed">
                      {currentTranscript}
                      {isTranscribing && <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse"></span>}
                    </div>
                  </div>
                )}

                {/* Session stats */}
                {transcription.length > 0 && (
                  <div className="flex items-center justify-between text-xs text-gray-400 px-2 pt-2 border-t border-slate-700">
                    <span>{transcription.length} segments captured</span>
                    <span>
                      {transcription.reduce((total, segment) => total + segment.text.split(" ").length, 0)} words total
                    </span>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
