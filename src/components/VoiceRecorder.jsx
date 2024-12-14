import { useState, useRef } from 'react'
import { Button, Stack, Text } from '@mantine/core'
import { IconMicrophone, IconPlayerStop } from '@tabler/icons-react'

export default function VoiceRecorder({ onTranscriptionComplete, apiKey }) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState(null)
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])

  const checkMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      return true
    } catch (err) {
      console.error('Microphone access error:', err)
      return false
    }
  }

  const startRecording = async () => {
    if (!apiKey) {
      setError('Please enter your OpenAI API key first.')
      return
    }
    
    setError(null)

    const hasAccess = await checkMicrophoneAccess()
    if (!hasAccess) {
      setError('Microphone access was denied. Please allow microphone access in your browser settings.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false
      })
      
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      })
      
      audioChunks.current = []

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data)
        }
      }

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
        const transcription = await transcribeAudio(audioBlob)
        onTranscriptionComplete(transcription, apiKey)
      }

      mediaRecorder.current.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      setError(`Could not access microphone: ${err.message}`)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
    }
  }

  const transcribeAudio = async (audioBlob) => {
    const formData = new FormData()
    formData.append('file', audioBlob, 'recording.webm')
    formData.append('model', 'whisper-1')

    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to transcribe audio')
      }

      const data = await response.json()
      return data.text || 'No transcription available'
    } catch (error) {
      console.error('Error in transcription:', error)
      setError('Error transcribing audio: ' + error.message)
      throw error
    }
  }

  return (
    <Stack align="center" spacing="md">
      {error && <Text color="red">{error}</Text>}
      {!isRecording ? (
        <Button 
          leftSection={<IconMicrophone size={rem(20)} />}
          onClick={startRecording}
          color="blue"
          size="lg"
          disabled={!apiKey}
        >
          Start Recording
        </Button>
      ) : (
        <Button 
          leftSection={<IconPlayerStop size={rem(20)} />}
          onClick={stopRecording}
          color="red"
          size="lg"
        >
          Stop Recording
        </Button>
      )}
    </Stack>
  )
}
