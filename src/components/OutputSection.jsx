import { Paper, Text, Button, Stack, Textarea } from '@mantine/core'

export default function OutputSection({ title, content, onCopy, onEdit }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    onCopy()
  }

  return (
    <Paper shadow="sm" p="md" withBorder>
      <Stack>
        <Text fw={700}>{title}</Text>
        <Textarea
          value={content}
          onChange={(e) => onEdit(e.target.value)}
          minRows={4}
          autosize
        />
        <Button onClick={handleCopy} variant="light">
          Copy to Clipboard
        </Button>
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
