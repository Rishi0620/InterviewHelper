"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card"
import { Button } from "@/frontend/components/ui/button"
import { Badge } from "@/frontend/components/ui/badge"
import { ScrollArea } from "@/frontend/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/frontend/components/ui/alert"
import { Clock, Code2, WifiOff } from "lucide-react"

interface Snapshot {
  id: string
  code: string
  timestamp: number
  language: string
}

type ConnectionState = "disconnected" | "connecting" | "connected" | "error"

interface SnapshotPanelProps {
  snapshots: Snapshot[]
  onSnapshotSelect: (snapshot: Snapshot) => void
  isConnected: boolean
  connectionState: ConnectionState
}

export function SnapshotPanel({ snapshots, onSnapshotSelect, isConnected, connectionState }: SnapshotPanelProps) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const getCodePreview = (code: string) => {
    const lines = code.split("\n").filter((line) => line.trim())
    const firstMeaningfulLine = lines.find(
      (line) => !line.trim().startsWith("//") && !line.trim().startsWith("/*") && line.trim().length > 0,
    )
    return firstMeaningfulLine?.trim().substring(0, 30) + "..." || "Empty code"
  }

  return (
    <Card className="h-fit shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Code2 className="w-5 h-5" />
          Code Snapshots
        </CardTitle>
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>Auto-save every 10s</span>
          <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
            {snapshots.length}/10
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!isConnected && (
          <div className="p-4 border-b">
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
                {connectionState === "connecting"
                  ? "Connecting to backend..."
                  : "Snapshots disabled - backend disconnected"}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <ScrollArea className="h-[500px]">
          {snapshots.length === 0 ? (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400">
              <Code2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No snapshots yet</p>
              <p className="text-xs mt-1">
                {isConnected ? "Start coding to see snapshots" : "Connect to backend to enable snapshots"}
              </p>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {snapshots.map((snapshot, index) => (
                <div
                  key={snapshot.id}
                  className="group border rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  onClick={() => onSnapshotSelect(snapshot)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      #{snapshots.length - index}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {formatTime(snapshot.timestamp)}
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded p-2 truncate">
                    {getCodePreview(snapshot.code)}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {snapshot.language}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-xs h-6 px-2"
                    >
                      Load
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
