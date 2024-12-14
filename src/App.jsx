import { useState } from 'react'
import { Container, Title, Stack, Textarea, Button, Text, LoadingOverlay, Paper, Group, TextInput } from '@mantine/core'
import { IconMicrophone, IconFileText, IconFileUpload } from '@tabler/icons-react'

export default function App() {
  const [transcription, setTranscription] = useState('')
  const [summary, setSummary] = useState('')
  const [actions, setActions] = useState('')
  const [email, setEmail] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [isRecording, setIsRecording] = useState(false)

  const startRecording = async () => {
    if (!apiKey) {
      setError('Please enter your OpenAI API key first.')
      return
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false
      })
      
      const mediaRecorder = new MediaRecorder(stream)
      const audioChunks = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        await handleAudioData(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      setError('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (isRecording) {
      const tracks = navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop())
        })
      setIsRecording(false)
    }
  }

  const handleTextFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (!apiKey) {
      setError('Please enter your OpenAI API key first.')
      return
    }

    try {
      const text = await file.text()
      setTranscription(text)
      processWithGPT4(text)
    } catch (error) {
      console.error('Error reading text file:', error)
      setError('Error reading text file. Please try again.')
    }
  }

  const handleAudioFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (!apiKey) {
      setError('Please enter your OpenAI API key first.')
      return
    }

    if (!file.type.startsWith('audio/')) {
      setError('Please upload an audio file')
      return
    }

    await handleAudioData(file)
  }

  const handleAudioData = async (audioBlob) => {
    setIsProcessing(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', audioBlob)
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
      setTranscription(data.text)
      await processWithGPT4(data.text)
    } catch (err) {
      setError('Failed to process audio: ' + err.message)
      console.error('Audio processing error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const processWithGPT4 = async (text) => {
    setIsProcessing(true)
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `Process this transcript and create:
                1. An executive summary (max 250 words)
                2. A bulleted list of actionable items
                3. A professional email draft
                Return as JSON with keys: summary, actions, email`
            },
            {
              role: 'user',
              content: text
            }
          ]
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to process with GPT-4')

      const result = JSON.parse(data.choices[0].message.content)
      setSummary(result.summary)
      setActions(result.actions)
      setEmail(result.email)
    } catch (err) {
      setError('Failed to process with GPT-4: ' + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } catch (err) {
      alert('Failed to copy to clipboard')
    }
  }

  return (
    <Container size="lg" py="xl">
      <LoadingOverlay visible={isProcessing} />
      <Stack spacing="xl">
        <Title order={1}>Voice Processing App</Title>

        <Paper shadow="xs" p="md" withBorder>
          <Stack spacing="md">
            <TextInput
              label="OpenAI API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenAI API key"
              type="password"
              required
            />
            
            <Text fw={700} size="lg">Choose Input Method:</Text>
            <Group grow>
              {!isRecording ? (
                <Button
                  leftSection={<IconMicrophone size={20} />}
                  onClick={startRecording}
                  disabled={!apiKey}
                >
                  Start Recording
                </Button>
              ) : (
                <Button
                  color="red"
                  onClick={stopRecording}
                >
                  Stop Recording
                </Button>
              )}

              <Button
                leftSection={<IconFileText size={20} />}
                onClick={() => document.getElementById('textFileUpload').click()}
                disabled={!apiKey}
              >
                Upload Transcript
              </Button>
              <input
                type="file"
                id="textFileUpload"
                accept=".txt,.doc,.docx"
                style={{ display: 'none' }}
                onChange={handleTextFileUpload}
              />

              <Button
                leftSection={<IconFileUpload size={20} />}
                onClick={() => document.getElementById('audioFileUpload').click()}
                disabled={!apiKey}
              >
                Upload Audio
              </Button>
              <input
                type="file"
                id="audioFileUpload"
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={handleAudioFileUpload}
              />
            </Group>
            
            {error && (
              <Text color="red" size="sm">
                {error}
              </Text>
            )}
          </Stack>
        </Paper>

        {transcription && (
          <>
            <Paper shadow="xs" p="md" withBorder>
              <Stack spacing="md">
                <Text fw={700} size="lg">Raw Transcription:</Text>
                <Textarea
                  value={transcription}
                  readOnly
                  minRows={4}
                  autosize
                />
                <Button onClick={() => copyToClipboard(transcription)}>
                  Copy Transcription
                </Button>
              </Stack>
            </Paper>

            <Paper shadow="xs" p="md" withBorder>
              <Stack spacing="md">
                <Text fw={700} size="lg">Executive Summary:</Text>
                <Textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  minRows={4}
                  autosize
                />
                <Button onClick={() => copyToClipboard(summary)}>
                  Copy Summary
                </Button>
              </Stack>
            </Paper>

            <Paper shadow="xs" p="md" withBorder>
              <Stack spacing="md">
                <Text fw={700} size="lg">Action Items:</Text>
                <Textarea
                  value={actions}
                  onChange={(e) => setActions(e.target.value)}
                  minRows={4}
                  autosize
                />
                <Button onClick={() => copyToClipboard(actions)}>
                  Copy Actions
                </Button>
              </Stack>
            </Paper>

            <Paper shadow="xs" p="md" withBorder>
              <Stack spacing="md">
                <Text fw={700} size="lg">Email Draft:</Text>
                <Textarea
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  minRows={4}
                  autosize
                />
                <Button onClick={() => copyToClipboard(email)}>
                  Copy Email
                </Button>
              </Stack>
            </Paper>
          </>
        )}
      </Stack>
    </Container>
  )
}
