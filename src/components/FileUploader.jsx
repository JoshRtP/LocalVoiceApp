import { Group, Text, useMantineTheme, rem, Button } from '@mantine/core';
import { IconUpload, IconFile, IconFileText } from '@tabler/icons-react';

export default function FileUploader({ onTextFileUpload, onAudioFileUpload }) {
  const theme = useMantineTheme();

  const handleTextFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      onTextFileUpload(text);
    } catch (error) {
      console.error('Error reading text file:', error);
      alert('Error reading text file. Please try again.');
    }
  };

  const handleAudioFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file');
      return;
    }

    onAudioFileUpload(file);
  };

  return (
    <Group justify="center" gap="xl">
      <div>
        <input
          type="file"
          id="textFileUpload"
          accept=".txt,.doc,.docx"
          style={{ display: 'none' }}
          onChange={handleTextFileUpload}
        />
        <Button
          leftSection={<IconFileText size={rem(20)} />}
          onClick={() => document.getElementById('textFileUpload').click()}
        >
          Upload Transcript
        </Button>
      </div>

      <div>
        <input
          type="file"
          id="audioFileUpload"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={handleAudioFileUpload}
        />
        <Button
          leftSection={<IconFile size={rem(20)} />}
          onClick={() => document.getElementById('audioFileUpload').click()}
        >
          Upload Audio
        </Button>
      </div>
    </Group>
  );
}
