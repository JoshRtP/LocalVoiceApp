import { useState, useRef } from 'react';
import { Container, Title, Stack, Button, Text, LoadingOverlay, Paper, Group, TextInput } from '@mantine/core';
import { IconMicrophone, IconFileText, IconFileUpload, IconPlayerStop } from '@tabler/icons-react';
import Stopwatch from './components/Stopwatch';
import OutputSection from './components/OutputSection';
import { processWithGPT4 } from './services/ai';

export default function App() {
    const [transcription, setTranscription] = useState('');
    const [summary, setSummary] = useState('');
    const [actions, setActions] = useState('');
    const [email, setEmail] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [apiKey, setApiKey] = useState(import.meta.env.VITE_OPENAI_API_KEY || '');
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);

    const startRecording = async () => {
        if (!apiKey) {
            setError('Please enter your OpenAI API key first.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            mediaRecorder.current = new MediaRecorder(stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 128000
            });

            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            mediaRecorder.current.onstop = async () => {
                try {
                    const audioBlob = new Blob(audioChunks.current, { type: mimeType });
                    await handleAudioData(audioBlob);
                } catch (error) {
                    console.error('Error processing audio:', error);
                    setError('Error processing audio recording: ' + error.message);
                }
            };

            mediaRecorder.current.start(200);
            setIsRecording(true);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            setError('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    const handleTextFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!apiKey) {
            setError('Please enter your OpenAI API key first.');
            return;
        }

        try {
            let text = '';

            if (file.type === 'text/plain') {
                text = await file.text();
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                setError('Note: .docx files are limited to text content only');
                text = await file.text();
                text = text.replace(/[^\x20-\x7E\n]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            } else {
                setError('Please upload a .txt or .docx file');
                return;
            }

            if (!text.trim()) {
                setError('The file appears to be empty or contains no readable text');
                return;
            }

            setTranscription(text);
            await processText(text);
        } catch (error) {
            console.error('Error reading file:', error);
            setError('Error reading file. Please try again with a different file.');
        }
    };

    const handleAudioFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!apiKey) {
            setError('Please enter your OpenAI API key first.');
            return;
        }

        if (!file.type.startsWith('audio/')) {
            setError('Please upload an audio file');
            return;
        }

        await handleAudioData(file);
    };

    const handleAudioData = async (audioBlob) => {
        setIsProcessing(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('model', 'whisper-1');

        try {
            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to transcribe audio');
            }

            const data = await response.json();
            setTranscription(data.text);
            await processText(data.text);
        } catch (err) {
            setError('Failed to process audio: ' + err.message);
            console.error('Audio processing error:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const processText = async (text) => {
        setIsProcessing(true);
        try {
            const result = await processWithGPT4(text, apiKey);
            setSummary(result.summary);
            setActions(result.actions);
            setEmail(result.email);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('Copied to clipboard!');
        } catch (err) {
            alert('Failed to copy to clipboard');
        }
    };

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
                        <Group grow align="center">
                            <Group spacing="md">
                                {!isRecording ? (
                                    <Button
                                        leftSection={<IconMicrophone size={20} />}
                                        onClick={startRecording}
                                        disabled={!apiKey}
                                    >
                                        Start Recording
                                    </Button>
                                ) : (
                                    <Group spacing="md">
                                        <Button
                                            color="red"
                                            onClick={stopRecording}
                                            leftSection={<IconPlayerStop size={20} />}
                                        >
                                            Stop Recording
                                        </Button>
                                        <Paper p="xs" withBorder>
                                            <Stopwatch isRunning={isRecording} />
                                        </Paper>
                                    </Group>
                                )}
                            </Group>

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
                        <OutputSection
                            title="Raw Transcription"
                            content={transcription}
                            onCopy={() => copyToClipboard(transcription)}
                            onEdit={setTranscription}
                            isHtml={false}
                        />

                        <OutputSection
                            title="Executive Summary"
                            content={summary}
                            onCopy={() => copyToClipboard(summary)}
                            onEdit={setSummary}
                            isHtml={false}
                        />

                        <OutputSection
                            title="Action Items"
                            content={actions}
                            onCopy={() => copyToClipboard(actions)}
                            onEdit={setActions}
                            isHtml={false}
                        />

                        <OutputSection
                            title="Email Draft"
                            content={email}
                            onCopy={() => copyToClipboard(email)}
                            onEdit={setEmail}
                            isHtml={true}
                        />
                    </>
                )}
            </Stack>
        </Container>
    );
}
