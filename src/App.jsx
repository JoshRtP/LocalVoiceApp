import { useState } from 'react'
import { Container, Title, Stack, Textarea, Button, Text, LoadingOverlay, Paper, Group } from '@mantine/core'
import VoiceRecorder from './components/VoiceRecorder'
import FileUploader from './components/FileUploader'
import { processWithGPT4 } from './services/ai'

export default function App() {
  const [transcription, setTranscription] = useState('')
  const [summary, setSummary] = useState('')
  const [actions, setActions] = useState('')
  const [email, setEmail] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [apiKey, setApiKey] = useState('')

  const handleTranscriptionComplete = async (text, key) => {
    setTranscription(text)
    processTranscription(text, key)
  }

  const processTranscription = async (text, key) => {
    setIsProcessing(true)
    setError(null)

    try {
      const result = await processWithGPT4(text, key || apiKey)
      setSummary(result.summary || '')
      setActions(result.actions || '')
      setEmail(result.email || '')
    } catch (err) {
      setError('Failed to process transcript: ' + err.message)
      console.error('Processing error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTextFileUpload = async (text) => {
    if (!apiKey) {
      setError('Please enter your OpenAI API key first.')
      return
    }
    setTranscription(text)
    processTranscription(text, apiKey)
  }

  const handleAudioFileUpload = async (file) => {
    if (!apiKey) {
      setError('Please enter your OpenAI API key first.')
      return
    }

    setIsProcessing(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
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
        throw new Error('Failed to transcribe audio file')
      }

      const data = await response.json()
      const transcription = data.text
      setTranscription(transcription)
      processTranscription(transcription, apiKey)
    } catch (err) {
      setError('Failed to process audio file: ' + err.message)
      console.error('Audio processing error:', err)
      setIsProcessing(false)
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy:', err)
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
            <Text fw={700} size="lg">Input Options:</Text>
            <TextInput
              label="OpenAI API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenAI API key"
              type="password"
              required
            />
            <Group grow>
              <VoiceRecorder onTranscriptionComplete={handleTranscriptionComplete} apiKey={apiKey} />
              <FileUploader 
                onTextFileUpload={handleTextFileUpload}
                onAudioFileUpload={handleAudioFileUpload}
              />
            </Group>
          </Stack>
        </Paper>
        
        {error && (
          <Text color="red" size="sm">
            {error}
          </Text>
        )}

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
                  placeholder={isProcessing ? "Processing summary..." : "Summary will appear here"}
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
                  placeholder={isProcessing ? "Processing actions..." : "Action items will appear here"}
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
                  placeholder={isProcessing ? "Processing email draft..." : "Email draft will appear here"}
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
