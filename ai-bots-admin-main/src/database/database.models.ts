import { MessageModel } from 'src/messages/entities/message.model';
import { ConversationModel } from 'src/conversations/entities/conversation.model';
import { UserModel } from 'src/users/entities/user.model';
import { ProjectModel } from 'src/projects/entities/projects.model';
import { ProjectAssistantModel } from 'src/openai-knowledge/entities/project-assistant.model';
import { ProjectFileModel } from 'src/openai-knowledge/entities/project-file.model';
import { ProjectThreadModel } from 'src/openai-knowledge/entities/project-thread.model';
import { LearningSession } from 'src/large-files-processing/learnings-sessions.model';
import { LearningSessionProjectConnection } from 'src/large-files-processing/learnings-sessions-project-connection.model';
import { BotModel } from 'src/bots/entities/bot.model';

export const DatabaseModels = [
  // Core models being used
  UserModel,
  MessageModel,
  ConversationModel,
  ProjectModel,

  // OpenAI Knowledge models
  ProjectAssistantModel,
  ProjectFileModel,
  ProjectThreadModel,

  // Large Files Processing models
  LearningSession,
  LearningSessionProjectConnection,

  // Bot models
  BotModel,
];
