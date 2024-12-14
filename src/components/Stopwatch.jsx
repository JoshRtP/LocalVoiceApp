import { Text } from '@mantine/core'
import { useState, useEffect } from 'react'

export default function Stopwatch({ isRunning }) {
  const [time, setTime] = useState(0)

  useEffect(() => {
    let intervalId

    if (isRunning) {
      intervalId = setInterval(() => {
        setTime(prevTime => prevTime + 1)
      }, 1000)
    } else {
      setTime(0)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [isRunning])

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <Text size="lg" fw={700} style={{ fontFamily: 'monospace' }} color="blue">
      Recording: {formatTime(time)}
    </Text>
  )
}
