import { BotModel } from 'src/bots/entities/bot.model';
import { LearningSessionProjectConnection } from 'src/large-files-processing/learnings-sessions-project-connection.model';
import { LearningSession } from 'src/large-files-processing/learnings-sessions.model';
import { IntentExampleModel } from 'src/local-intents-responses-storage/entities/intent-example.model';
import { IntentModel } from 'src/local-intents-responses-storage/entities/intent.model';
import { LocalStorageModel } from 'src/local-intents-responses-storage/entities/local-storage-project.model';
import { ResponseModel } from 'src/local-intents-responses-storage/entities/response.model';
import { MessageModel } from 'src/messages/entities/message.model';
import { ConversationModel } from 'src/conversations/entities/conversation.model';
import { UserModel } from 'src/users/entities/user.model';
import { SOPDocument } from 'src/sop/entities/sop-document.model';
import { AIConfiguration } from 'src/ai-config/entities/ai-configuration.model';
import { ProjectAssistantModel } from 'src/openai-knowledge/entities/project-assistant.model';
import { ProjectFileModel } from 'src/openai-knowledge/entities/project-file.model';
import { ProjectThreadModel } from 'src/openai-knowledge/entities/project-thread.model';

export const DatabaseModels = [
  UserModel,
  BotModel,
  MessageModel,
  ConversationModel,

  IntentExampleModel,
  IntentModel,
  ResponseModel,
  LocalStorageModel,
  LearningSession,
  LearningSessionProjectConnection,
  SOPDocument,
  AIConfiguration,

  // OpenAI Knowledge models
  ProjectAssistantModel,
  ProjectFileModel,
  ProjectThreadModel,
];
