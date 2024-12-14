import { useState } from 'react'
import { Container, Title, Stack, Textarea, Button, Text, LoadingOverlay, Paper, Group, TextInput } from '@mantine/core'
import VoiceRecorder from './components/VoiceRecorder'
import FileUploader from './components/FileUploader'
import { processWithGPT4 } from './services/ai'

// Rest of the App.jsx code remains the same...
