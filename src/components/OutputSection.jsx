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
  )
}
