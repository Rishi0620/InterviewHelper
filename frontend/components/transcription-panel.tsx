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
  // Combine all transcription into a flowing conversation
  const getCombinedTranscription = () => {
    if (transcription.length === 0 && !currentTranscript) return ""
    
    const allText = transcription.map(segment => segment.text).join(" ")
    return currentTranscript ? `${allText} ${currentTranscript}` : allText
  }

  const formatSessionTime = () => {
    if (transcription.length === 0) return ""
    const now = Date.now()
    const start = transcription[0].timestamp
    const minutes = Math.floor((now - start) / 60000)
    return minutes > 0 ? `${minutes}m` : "Just started"
  }

  return (
    <Card className="shadow-2xl bg-slate-800 border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-white">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          Your Explanation
        </CardTitle>
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-200">
            {isTranscribing ? "You're speaking..." : isConnected ? "Speak to explain your approach" : "Connecting audio..."}
          </span>
          {transcription.length > 0 && (
            <span className="text-xs text-blue-300">{formatSessionTime()}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!isConnected ? (
          <div className="p-6 text-center text-gray-400">
            <MicOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium mb-1">Audio Setup Required</p>
            <p className="text-xs">We're setting up your microphone...</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            {transcription.length === 0 && !currentTranscript ? (
              <div className="p-6 text-center text-gray-400">
                <Mic className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium mb-1">Ready to Listen</p>
                <p className="text-xs">Start explaining your approach out loud</p>
              </div>
            ) : (
              <div className="p-4">
                {/* Combined transcription display */}
                <div className="bg-slate-900 rounded-lg p-4 border border-blue-700 min-h-[200px]">
                  <div className="prose prose-sm prose-invert max-w-none">
                    <p className="text-gray-200 leading-relaxed text-sm">
                      {getCombinedTranscription()}
                      {isTranscribing && (
                        <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse"></span>
                      )}
                    </p>
                  </div>
                  
                  {/* Live indicator */}
                  {isTranscribing && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                      <span className="text-xs text-red-400">Speaking...</span>
                    </div>
                  )}
                </div>

                {/* Subtle session info */}
                {transcription.length > 0 && (
                  <div className="mt-3 text-center">
                    <span className="text-xs text-gray-500">
                      {transcription.reduce((total, segment) => total + segment.text.split(" ").length, 0)} words spoken
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
