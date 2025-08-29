"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card"
import { Button } from "@/frontend/components/ui/button"
import { Badge } from "@/frontend/components/ui/badge"
import { ScrollArea } from "@/frontend/components/ui/scroll-area"
import { Brain, TrendingUp, MessageCircle, Code, CheckCircle, AlertTriangle, Zap, Loader2 } from "lucide-react"

interface AIFeedback {
  id: string
  timestamp: number
  score: number
  strengths: string[]
  improvements: string[]
  optimizations: string[]
  codeAnalysis: string
  speechAnalysis: string
}

interface FeedbackPanelProps {
  feedback: AIFeedback[]
  onRequestFeedback: () => void
  isEvaluating: boolean
}

export function FeedbackPanel({ feedback, onRequestFeedback, isEvaluating }: FeedbackPanelProps) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-400 border-green-400"
    if (score >= 6) return "text-yellow-400 border-yellow-400"
    if (score >= 4) return "text-orange-400 border-orange-400"
    return "text-red-400 border-red-400"
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 8) return "bg-green-600"
    if (score >= 6) return "bg-yellow-600"
    if (score >= 4) return "bg-orange-600"
    return "bg-red-600"
  }

  return (
    <Card className="shadow-2xl bg-slate-800 border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-white">
          <Brain className="w-5 h-5 text-blue-400" />
          AI Feedback
        </CardTitle>
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-200">
            {isEvaluating ? "Analyzing your solution..." : "Get insights on your approach"}
          </span>
          <Button
            onClick={onRequestFeedback}
            variant="outline"
            size="sm"
            disabled={isEvaluating}
            className="h-7 px-2 text-xs border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black disabled:border-gray-600 disabled:text-gray-600"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-3 h-3 mr-1" />
                Get Feedback
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {feedback.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium mb-1">No feedback yet</p>
              <p className="text-xs">Write some code and explain your approach to get AI insights</p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {feedback.map((item, index) => (
                <div key={item.id} className="border border-blue-700 rounded-lg p-4 space-y-4 bg-slate-900">
                  {/* Header with Score */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      Feedback #{feedback.length - index}
                    </span>
                    <Badge variant="outline" className={`${getScoreColor(item.score)} font-bold`}>
                      Score: {item.score}/10
                    </Badge>
                  </div>

                  {/* Score Visualization */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">Overall Score</span>
                      <span className={`text-sm font-bold ${getScoreColor(item.score).split(" ")[0]}`}>
                        {item.score}/10
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getScoreBadgeColor(item.score)}`}
                        style={{ width: `${(item.score / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Strengths */}
                  {item.strengths.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium text-white">Strengths</span>
                      </div>
                      <ul className="text-sm text-gray-300 pl-6 space-y-1">
                        {item.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-green-400 mt-1">✓</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvements */}
                  {item.improvements.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium text-white">Areas for Improvement</span>
                      </div>
                      <ul className="text-sm text-gray-300 pl-6 space-y-1">
                        {item.improvements.map((improvement, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-yellow-400 mt-1">!</span>
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Optimizations */}
                  {item.optimizations.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-white">Optimizations</span>
                      </div>
                      <ul className="text-sm text-gray-300 pl-6 space-y-1">
                        {item.optimizations.map((optimization, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1">⚡</span>
                            <span>{optimization}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Code Analysis - only show if meaningful */}
                  {item.codeAnalysis && item.codeAnalysis !== "Code analysis completed" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-white">Code Review</span>
                      </div>
                      <p className="text-sm text-gray-300 pl-6">{item.codeAnalysis}</p>
                    </div>
                  )}

                  {/* Speech Analysis - only show if meaningful */}
                  {item.speechAnalysis && item.speechAnalysis !== "Speech analysis completed" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium text-white">Communication</span>
                      </div>
                      <p className="text-sm text-gray-300 pl-6">{item.speechAnalysis}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
