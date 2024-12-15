import { useState, useRef } from 'react';
import { Container, Title, Stack, Textarea, Button, Text, LoadingOverlay, Paper, Group, TextInput } from '@mantine/core';
import { IconMicrophone, IconFileText, IconFileUpload, IconPlayerStop } from '@tabler/icons-react';
import Stopwatch from './components/Stopwatch';

// Automatically load the API key from the environment variables
const apiKeyFromEnv = import.meta.env.VITE_OPENAI_API_KEY || '';

export default function App() {
    const [transcription, setTranscription] = useState('');
    const [summary, setSummary] = useState('');
    const [actions, setActions] = useState('');
    const [email, setEmail] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [apiKey, setApiKey] = useState(apiKeyFromEnv);
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
                    console.log('Audio format:', mimeType);
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
            mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
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
                text = text
                    .replace(/[^\x20-\x7E\n]/g, ' ')
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
            await processWithGPT4(text);
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

        console.log('Audio blob type:', audioBlob.type);
        console.log('Audio blob size:', audioBlob.size);

        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('model', 'whisper-1');

        try {
            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to transcribe audio');
            }

            const data = await response.json();
            setTranscription(data.text);
            await processWithGPT4(data.text);
        } catch (err) {
            setError('Failed to process audio: ' + err.message);
            console.error('Audio processing error:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const processWithGPT4 = async (text) => {
        setIsProcessing(true);
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `Process this transcript and create three outputs:

1. An executive summary (max 250 words)
2. A bulleted list of actionable items with the following rules:
   - Each item MUST start with "• " (bullet point)
   - Only include " - Owner: [OWNER]" if an owner is explicitly mentioned
   - Only include " - Deadline: [DATE]" if a deadline is explicitly mentioned
   - If no owner or deadline is mentioned, only include the action item with bullet point
3. A professional email draft including key points and next steps with the following rules:

1. Key Action Items and Takeaways
•	Always start communications with the most critical action items or key takeaways to ensure clarity and prioritize the reader’s focus.
•	Format these sections using bolded and underlined headings for visibility.
•	Use bullet points to break down each item concisely.
________________________________________
2. Voice and Tone
•	Professional yet approachable: Balances expertise with accessibility, avoiding overly formal or distant language.
•	Engaging and clear: Focuses on creating interest while maintaining clarity and precision.
•	Concise but substantive: Prefers impactful statements over verbosity, ensuring every sentence adds value.
________________________________________
3. Language Preferences
•	Specific and straightforward: Avoids jargon unless it’s relevant or explained for the audience.
•	Inclusive phrasing: Uses terms that make the reader feel involved or empowered.
•	Avoids hyperbole: Does not overstate or exaggerate points; relies on evidence-based claims.
________________________________________
4. Sentence Structure
•	Varied but balanced: Uses a mix of short, impactful sentences and longer, more detailed ones for rhythm and flow.
•	Logical progression: Ideas flow naturally from one to the next, ensuring readers can follow complex topics with ease.
________________________________________
5. Formatting Preferences
•	Bolded and underlined headings: Major sections are emphasized with bold and underlined headings for clear structure.
•	Organized and scannable: Uses headings, bullet points, and numbering to break down information for easy consumption.
•	Action items and next steps: Always formatted as bolded headings with bullet points to ensure clarity and focus.
•	Highlights key takeaways: Bold important phrases or sections to emphasize critical points without overloading the page visually.
________________________________________
6. Tone for Different Contexts
•	Informative content: Uses a teaching tone that empowers the audience to understand and apply concepts.
•	Persuasive content: Focuses on evidence and logical arguments to convince the reader, avoiding emotional appeals.
•	Creative content: Adds a touch of wit or clever phrasing when the context allows but never at the expense of clarity.
________________________________________
7. Common Phrasing and Approaches
•	Analogies and metaphors: Uses comparisons to clarify complex ideas but ensures they remain relevant and intuitive.
•	Questions and reflection: Invites readers to think critically or engage actively with the content.
•	Actionable language: Provides clear steps or recommendations to guide readers toward specific outcomes.
________________________________________
8. Avoidances
•	Buzzwords or filler phrases: Prefers meaningful content over trend-driven language.
•	Overly casual slang: Maintains professionalism, even in approachable tones.
•	Over-complication: Breaks down complex ideas rather than complicating them further.



Return ONLY a JSON object with this exact structure:
{
  "summary": "your executive summary here",
  "actions": "\u2022 Action item 1\n\u2022 Action item 2 - Owner: [OWNER]\n\u2022 Action item 3 - Deadline: [DATE]",
  "email": "your email draft here"
}`
                        },
                        {
                            role: 'user',
                            content: text
                        }
                    ]
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Failed to process with gpt-4o-mini');

            const result = JSON.parse(data.choices[0].message.content);

            const formattedActions = result.actions
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line)
                .map((line) => (line.startsWith('•') ? line : `• ${line}`))
                .join('\n');

            setSummary(result.summary);
            setActions(formattedActions);
            setEmail(result.email);
        } catch (err) {
            setError('Failed to process with gpt-4o-mini: ' + err.message);
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

                        <Text fw={700} size="lg">
                            Choose Input Method:
                        </Text>
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
                        <Paper shadow="xs" p="md" withBorder>
                            <Stack spacing="md">
                                <Text fw={700} size="lg">
                                    Raw Transcription:
                                </Text>
                                <Textarea value={transcription} readOnly minRows={4} autosize />
                                <Button onClick={() => copyToClipboard(transcription)}>
                                    Copy Transcription
                                </Button>
                            </Stack>
                        </Paper>

                        <Paper shadow="xs" p="md" withBorder>
                            <Stack spacing="md">
                                <Text fw={700} size="lg">
                                    Executive Summary:
                                </Text>
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
                                <Text fw={700} size="lg">
                                    Action Items:
                                </Text>
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
                                <Text fw={700} size="lg">
                                    Email Draft:
                                </Text>
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
    );
}
