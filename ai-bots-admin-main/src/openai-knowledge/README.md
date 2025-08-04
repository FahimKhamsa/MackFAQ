# OpenAI Knowledge Retrieval Integration

This module integrates OpenAI's Knowledge Retrieval (Assistants API) with your existing NestJS project, allowing project-specific RAG (Retrieval-Augmented Generation) functionality.

## Features

- **Project-specific Assistants**: Each project gets its own OpenAI assistant
- **File Upload & Management**: Upload documents for knowledge retrieval
- **Conversation Threading**: Maintain conversation context
- **Database Tracking**: Track assistants, files, and threads in your database

## API Endpoints

### 1. Initialize Project Assistant

```http
POST /openai-knowledge/init/:projectId
Content-Type: application/json

{
  "instructions": "Custom instructions for the assistant (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "assistantId": "asst_abc123",
  "dbId": 1
}
```

### 2. Upload File for Knowledge Retrieval

```http
POST /openai-knowledge/upload/:projectId
Content-Type: multipart/form-data

file: [your-document.pdf]
```

**Response:**

```json
{
  "success": true,
  "fileId": "file_abc123",
  "dbFileId": 1,
  "filename": "your-document.pdf"
}
```

### 3. Ask Questions

```http
POST /openai-knowledge/ask/:projectId
Content-Type: application/json

{
  "question": "What is the main topic of the uploaded document?",
  "threadId": "thread_abc123", // optional - for continuing conversation
  "userId": 1, // optional
  "sessionId": "session_123" // optional
}
```

**Response:**

```json
{
  "success": true,
  "answer": "Based on the uploaded document, the main topic is...",
  "threadId": "thread_abc123",
  "messageId": "msg_abc123"
}
```

### 4. Create New Thread

```http
POST /openai-knowledge/thread/:projectId
Content-Type: application/json

{
  "userId": 1, // optional
  "sessionId": "session_123" // optional
}
```

### 5. Get Project Files

```http
GET /openai-knowledge/files/:projectId
```

### 6. Get Assistant Info

```http
GET /openai-knowledge/assistant/:projectId
```

### 7. Update Assistant Instructions

```http
PUT /openai-knowledge/assistant/:projectId/instructions
Content-Type: application/json

{
  "instructions": "New instructions for the assistant"
}
```

### 8. Delete File

```http
DELETE /openai-knowledge/file/:projectId/:fileId
```

## Usage Examples

### JavaScript/TypeScript Client

```typescript
// Initialize assistant for project
const initResponse = await fetch('/openai-knowledge/init/1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    instructions: 'You are a helpful assistant for this project.',
  }),
});

// Upload a file
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const uploadResponse = await fetch('/openai-knowledge/upload/1', {
  method: 'POST',
  body: formData,
});

// Ask a question
const askResponse = await fetch('/openai-knowledge/ask/1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'What are the key points in the document?',
  }),
});

const result = await askResponse.json();
console.log(result.answer);
```

### cURL Examples

```bash
# Initialize assistant
curl -X POST http://localhost:3000/openai-knowledge/init/1 \
  -H "Content-Type: application/json" \
  -d '{"instructions": "You are a helpful assistant."}'

# Upload file
curl -X POST http://localhost:3000/openai-knowledge/upload/1 \
  -F "file=@document.pdf"

# Ask question
curl -X POST http://localhost:3000/openai-knowledge/ask/1 \
  -H "Content-Type: application/json" \
  -d '{"question": "Summarize the main points"}'
```

## Integration with Existing Project

### Using with Your Current Chat System

You can integrate this with your existing chat system by modifying your chat endpoints:

```typescript
// In your existing chat controller
@Post('chat/:projectId')
async chat(@Param('projectId') projectId: string, @Body() body: any) {
  // First try OpenAI Knowledge Retrieval
  try {
    const knowledgeResult = await this.openaiKnowledgeService.askQuestion(
      parseInt(projectId),
      body.message
    );

    if (knowledgeResult.answer) {
      return {
        response: knowledgeResult.answer,
        source: 'knowledge-base',
        threadId: knowledgeResult.threadId
      };
    }
  } catch (error) {
    // Fallback to existing system
    console.log('Knowledge base failed, using fallback:', error.message);
  }

  // Fallback to your existing chat logic
  return await this.existingChatService.getResponse(body.message);
}
```

## Database Schema

The module creates three new tables:

### project_assistants

- `id`: Primary key
- `project_id`: Foreign key to your existing projects
- `openai_assistant_id`: OpenAI assistant ID
- `name`: Assistant name
- `instructions`: Custom instructions
- `model`: OpenAI model used
- `is_active`: Boolean flag

### project_files

- `id`: Primary key
- `assistant_id`: Foreign key to project_assistants
- `openai_file_id`: OpenAI file ID
- `filename`: Original filename
- `file_type`: File extension
- `file_size`: File size in bytes
- `status`: Upload status

### project_threads

- `id`: Primary key
- `assistant_id`: Foreign key to project_assistants
- `openai_thread_id`: OpenAI thread ID
- `user_id`: Optional user ID
- `session_id`: Optional session ID
- `is_active`: Boolean flag

## Environment Variables

Make sure you have the OpenAI API key in your `.env` file:

```env
OPEN_AI_API_KEY=sk-your-openai-api-key-here
```

## Supported File Types

OpenAI supports various file types for knowledge retrieval:

- PDF documents
- Text files (.txt, .md)
- Word documents (.docx)
- And more...

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request (missing parameters)
- `500`: Internal Server Error (OpenAI API issues, etc.)

## Best Practices

1. **File Management**: Regularly clean up unused files to manage costs
2. **Thread Management**: Reuse threads for conversation continuity
3. **Error Handling**: Always implement fallback mechanisms
4. **Rate Limiting**: Be aware of OpenAI API rate limits
5. **Cost Monitoring**: Monitor OpenAI usage and costs

## Troubleshooting

### Common Issues

1. **File Upload Fails**: Check file size limits and supported formats
2. **Assistant Not Responding**: Verify OpenAI API key and check logs
3. **Database Errors**: Ensure all migrations are run
4. **Thread Not Found**: Create a new thread if the old one is invalid

### Debugging

Enable detailed logging by setting the log level in your NestJS configuration:

```typescript
// In your main.ts or app configuration
app.useLogger(['error', 'warn', 'log', 'debug', 'verbose']);
```
