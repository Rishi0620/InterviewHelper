"use client"

import { Badge } from "@/frontend/components/ui/badge"
import { Button } from "@/frontend/components/ui/button"
import { Wifi, WifiOff, RefreshCw } from "lucide-react"

interface ConnectionStatusProps {
  isConnected: boolean
  onConnect: () => void
}

export function ConnectionStatus({ isConnected, onConnect }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right text-sm">
        <div className="font-medium text-white">Transcription Service</div>
        <div className="text-xs text-blue-300">localhost:8765</div>
      </div>

      <Badge
        variant={isConnected ? "default" : "outline"}
        className={`gap-1.5 ${isConnected ? "bg-green-600" : "border-gray-600 text-gray-400"}`}
      >
        {isConnected ? (
          <>
            <Wifi className="w-3 h-3" />
            Connected
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            Not Connected
          </>
        )}
      </Badge>

      {!isConnected && (
        <Button
          onClick={onConnect}
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Connect
        </Button>
      )}
    </div>
  )
}
