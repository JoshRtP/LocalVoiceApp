export async function processWithGPT4(text, apiKey) {
  const systemPrompt = `You are an AI assistant that processes meeting transcripts. Create three outputs based on the provided transcript:

1. An executive summary (max 250 words)
2. A bulleted list of actionable items with the following rules:
   - Always start each item with "• "
   - Only include " - Owner: [OWNER]" if an owner is explicitly mentioned or clearly implied
   - Only include " - Deadline: [DATE]" if a deadline or timeframe is explicitly mentioned or clearly implied
   - If no owner or deadline is mentioned, just list the action item with the bullet point
3. A professional email draft including key points and next steps

Return ONLY a JSON object with this exact structure:
{
  "summary": "your executive summary here",
  "actions": "• Action 1\\n• Action 2 - Owner: [OWNER]\\n• Action 3 - Deadline: [DATE]\\n• Action 4 - Owner: [OWNER] - Deadline: [DATE]",
  "email": "your email draft here"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Please process this transcript and format the response as specified:\n\n${text}`
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to process with GPT-4o-mini');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const parsedContent = JSON.parse(content);
      
      // Validate and clean up action items format
      if (parsedContent.actions) {
        // Ensure each line starts with a bullet point
        parsedContent.actions = parsedContent.actions
          .split('\n')
          .map(line => line.trim())
          .filter(line => line) // Remove empty lines
          .map(line => line.startsWith('•') ? line : `• ${line}`)
          .join('\n');
      }

      return {
        summary: parsedContent.summary,
        actions: parsedContent.actions,
        email: parsedContent.email
      };
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.log('Raw GPT-4o-mini Response:', content);
      
      return {
        summary: "Error processing summary",
        actions: "Error processing actions",
        email: "Error processing email"
      };
    }
  } catch (error) {
    console.error('Error in GPT-4o-mini processing:', error);
    throw new Error(`GPT-4o-mini Processing Error: ${error.message}`);
  }
}
