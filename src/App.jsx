// ... previous imports remain the same ...

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
      
      // Check supported MIME types
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      })
      
      audioChunks.current = []

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data)
        }
      }

      mediaRecorder.current.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunks.current, { type: mimeType })
          console.log('Audio format:', mimeType) // Debug log
          await handleAudioData(audioBlob)
        } catch (error) {
          console.error('Error processing audio:', error)
          setError('Error processing audio recording: ' + error.message)
        }
      }

      mediaRecorder.current.start(200)
      setIsRecording(true)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      setError('Could not access microphone. Please check permissions.')
    }
  }

  const handleAudioData = async (audioBlob) => {
    setIsProcessing(true)
    setError(null)

    // Create a debug log of the blob
    console.log('Audio blob type:', audioBlob.type)
    console.log('Audio blob size:', audioBlob.size)

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
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to transcribe audio')
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

  // ... rest of the component remains the same ...
