"use client"

import { useEffect, useState } from "react"

export default function TestPage() {
  const [result, setResult] = useState<string>("Test en cours...")

  useEffect(() => {
    console.log("Test page loaded")

    fetch("/api/setup/check")
      .then(response => {
        console.log("Response received:", response.status)
        return response.json()
      })
      .then(data => {
        console.log("Data received:", data)
        setResult(`API fonctionne ! needsSetup: ${data.needsSetup}, userCount: ${data.userCount}`)
      })
      .catch(error => {
        console.error("Fetch error:", error)
        setResult(`Erreur: ${error.message}`)
      })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Test de l'API</h1>
        <p className="text-lg">{result}</p>
        <div className="mt-4">
          <a href="/setup" className="text-blue-500 underline">Retour au setup</a>
        </div>
      </div>
    </div>
  )
}