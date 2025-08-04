import axios from 'axios'
import axiosConfigured from '@/axios'
import { createStore } from 'vuex'

const KT = 't';
const API_URL = process.env.VUE_APP_API_HOST;
let API_BOT_ID = process.env.VUE_APP_API_BOT_ID;

function setKT(t) {
  localStorage.setItem(KT, t);
}
export function getKT() {
  return localStorage.getItem(KT);
}

function setRefreshToken(t) {
  localStorage.setItem('refreshToken', t);
}
function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}

export default createStore({
  state: {
    availableProjects: [],
    current_bot_data: null,
    projectsTrainingData: {},
    projectsConversationsList: {},
    savedKnowledgeByLink: {},
    conversationsData: {},
    savedKnowledge: {},
    isAuthSet: null,
    myDocsList: [],
    myDocsListByProject: {},
  },
  getters: {
    getAvailableProjects: (state) => state.availableProjects,
    getcurrent_bot_preprompt: (state) => state.current_bot_data && state.current_bot_data.prompt_answer_pre_prefix || null,
    getcurrent_bot_prompt_prefix: (state) => state.current_bot_data && state.current_bot_data.prompt_prefix || null,
    getProjectsTrainingData: state => project_id => state.projectsTrainingData[project_id],
    getProjectsConversationsList: state => project_id => state.projectsConversationsList[project_id],
    getConversationData: state => conversationId => state.conversationsData[conversationId],
    getSavedKnowledge: state => project_id => state.savedKnowledge[project_id],
    getSavedKnowledgeById: state => project_id => state.savedKnowledge[project_id],
    getSavedKnowledgeByLink: state => project_link => state.savedKnowledgeByLink[project_link],
    getIsAuthSet: state => !!getKT(), // Check if JWT token exists
    getMyDocsList: state => state.myDocsList,
    getDocsConnectedToProject: state => project_id => state.myDocsListByProject[project_id] ?? [],
    getProfile: state => state.profile,
  },
  mutations: {
    SET_AVAILABLE_PROJECTS(state, list) {
      state.availableProjects = list;
    },
    SET_CURRENT_BOT_DATA(state, bot_data) {
      state.current_bot_data = bot_data;
    },
    SET_PROJECT_TRAINING_DATA(state, { project_id, data }) {
      state.projectsTrainingData[project_id] = data;
    },
    SET_PROJECT_CONVERSATIONS_LIST(state, { project_id, data }) {
      const listOfConversations = Object.values(data);
      listOfConversations.sort((a, b) => +b.createdAt - +a.createdAt);
      state.projectsConversationsList[project_id] = listOfConversations;
    },
    SET_PROJECT_CONVERSATION_DATA(state, { conversationId, data }) {
      state.conversationsData[conversationId] = data;
    },
    SET_SAVED_KNOWLEDGE(state, { project_id, project_link, data }) {
      state.savedKnowledge[project_id] = data;
      if (project_link) {
        state.savedKnowledgeByLink[project_link] = data;
      }
    },
    SET_MY_DOCS(state, list) {
      state.myDocsList = list;
      for (const file of list) {
        for (const conn of file.connections) {
          state.myDocsListByProject[conn.project_id] ??= [];
          state.myDocsListByProject[conn.project_id].push(conn);
        }
      }
    },
    SET_ME(state, data) {
      state.profile = data;
    },
  },
  actions: {
    async updateAvailableProjects(context) {
      return await axiosConfigured.get(API_URL + '/local-intents-responses-storage/projects?bot_id=' + API_BOT_ID)
        .then(async result => {
          context.commit('SET_AVAILABLE_PROJECTS', result.data.list || []);
          await context.dispatch('myLoadedFiles');
        })
        .catch(error => {
          console.error('Failed to load projects:', error);
          // Fallback: create a default project structure
          context.commit('SET_AVAILABLE_PROJECTS', []);
        });
    },
    updateBotPreprompt(context) {
      axiosConfigured.get(API_URL + '/api/bot-prompt?bot_id=' + API_BOT_ID)
        .then(result => {
          context.commit('SET_CURRENT_BOT_DATA', result?.data?.data || null);
        })
        .catch(error => {
          console.error('Failed to load bot prompt:', error);
          context.commit('SET_CURRENT_BOT_DATA', null);
        });
    },
    updateProjectTrainingData(context, { project_id }) {
      axiosConfigured.get(API_URL + '/local-intents-responses-storage/projects/knowledge-base?bot_id=' + API_BOT_ID + '&project_id=' + project_id)
        .then(async result => {
          context.commit('SET_PROJECT_TRAINING_DATA', { project_id, data: result?.data?.data || '' });
          await context.dispatch('myLoadedFiles');
        })
        .catch(error => {
          console.error('Failed to load training data:', error);
          context.commit('SET_PROJECT_TRAINING_DATA', { project_id, data: '' });
        });
    },
    updateProjectConversationsList(context, { project_id }) {
      axiosConfigured.get(API_URL + '/api/list-of-conversations?bot_id=' + API_BOT_ID + '&project_id=' + project_id)
        .then(result => {
          const data = result?.data?.data || {};
          context.commit('SET_PROJECT_CONVERSATIONS_LIST', { project_id, data });
        })
        .catch(error => {
          console.error('Failed to load conversations list:', error);
          // Fallback: set empty conversations list
          context.commit('SET_PROJECT_CONVERSATIONS_LIST', { project_id, data: {} });
        });
    },
    updateProjectSavedKnowledge(context, { project_id, project_link }) {
      axiosConfigured.get(API_URL + '/api/saved-knowledge?bot_id=' + API_BOT_ID, { params: { project_link, project_id } })
        .then(result => {
          context.commit(
            'SET_SAVED_KNOWLEDGE',
            {
              project_id: result.data.project_id,
              project_link: result.data.project_link,
              data: result.data.data || ''
            }
          );
        });
    },
    deleteProjectSavedKnowledge(context, { project_id, id }) {
      return axiosConfigured.delete(API_URL + '/api/saved-knowledge-qoidoqe2koakjfoqwe?id=' + id)
        .then(result => {
          context.dispatch('myLoadedFiles', { project_id });
          context.dispatch('updateProjectSavedKnowledge', { project_id });

          return result.data.data;
        });
    },
    updateProjectConversation(context, { conversationId }) {
      return axiosConfigured.get(API_URL + '/api/conversation-history?conversationId=' + conversationId)
        .then(result => {
          context.commit('SET_PROJECT_CONVERSATION_DATA', { conversationId, data: result?.data?.data || '' });
        })
        .catch(error => {
          console.error('Failed to load conversation:', error);
          context.commit('SET_PROJECT_CONVERSATION_DATA', { conversationId, data: '' });
        });
    },
    myLoadedFiles(context) {
      return axiosConfigured.get(API_URL + '/api/my-docs?bot_id=' + API_BOT_ID)
        .then(result => {
          context.commit('SET_MY_DOCS', result?.data?.data ?? []);
        })
        .catch(error => {
          console.error('Failed to load my docs:', error);
          context.commit('SET_MY_DOCS', []);
        });
    },

    updateFileConnection(context, { project_id, learning_session_id, status }) {
      return axiosConfigured.put(API_URL + '/api/file-connection', { project_id, learning_session_id, status })
        .then(result => {
          return context.dispatch('myLoadedFiles')
        });
    },

    register(context, payload) {
      return axiosConfigured.post('/users/registration', payload)
        .catch(error => {
          if (error.message === 'User already exists') {
            return;
          }
          throw error;
        })
        .then(result => context.dispatch('login', payload))
    },

    login(context, payload) {
      // Ensure we're sending email field as expected by backend
      const loginData = {
        email: payload.email || payload.username, // Support both email and username
        password: payload.password
      };
      return axiosConfigured.post('/auth/login', loginData)
        .then((resp) => {
          // Store both access and refresh tokens
          const accessToken = resp.data.accessToken || resp.data.token;
          const refreshToken = resp.data.refreshToken;

          setKT(accessToken);
          if (refreshToken) {
            setRefreshToken(refreshToken);
          }

          return context.dispatch('loadMe');
        });
    },

    confirm2Fa(context, payload) {
      return axiosConfigured.post(API_URL + '/auth/2fa', payload)
        .then((resp) => {
          setKT(resp.data.token);
          return context.dispatch('loadMe');
        });
    },

    logOut(context) {
      setKT(null);
      setRefreshToken(null);
      return context.dispatch("loadMe");
    },

    refreshAuth(context) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        console.log('No refresh token available');
        return Promise.resolve();
      }

      return axiosConfigured.post('/auth/refresh', { refreshToken })
        .then((resp) => {
          // Store both new tokens
          const accessToken = resp.data.accessToken || resp.data.token;
          const newRefreshToken = resp.data.refreshToken;

          setKT(accessToken);
          if (newRefreshToken) {
            setRefreshToken(newRefreshToken);
          }
        })
        .catch((error) => {
          console.error('Token refresh failed:', error);
          // Don't clear token on refresh failure, let user continue with current token
          // The token might still be valid for some time
        });
    },

    async loadMe(context) {
      return axiosConfigured.get(API_URL + '/users/me')
        .then((resp) => {
          API_BOT_ID = resp.data.default_bot.id;
          context.commit('SET_ME', resp.data.user);
        })
        .catch((error) => {
          // For RAG testing without authentication, use environment bot_id
          console.log('loadMe failed, using environment bot_id for RAG testing');
          API_BOT_ID = process.env.VUE_APP_API_BOT_ID || 1;
        });
    },

    async loadDefaultProject(context) {
      if (!API_BOT_ID) {
        await context.dispatch('loadMe');
      }
      return axiosConfigured.post(API_URL + '/api/default-project?bot_id=' + API_BOT_ID).then(r => r.data.id);
    },

    async renameProject(context, { projectId, newName }) {
      try {
        // Get the current user profile to get creator_id
        const profile = context.getters.getProfile;
        let creatorId = profile?.id;

        // If profile is not loaded, try to load it first
        if (!creatorId) {
          await context.dispatch('loadMe');
          creatorId = context.getters.getProfile?.id;
        }

        const response = await axiosConfigured.post(API_URL + '/local-intents-responses-storage/projects/update', {
          id: projectId,
          name: newName,
          bot_id: API_BOT_ID,
          creator_id: creatorId || 1 // Fallback to 1 if no user ID available
        });

        // Refresh the projects list after successful rename
        await context.dispatch('updateAvailableProjects');

        return response.data;
      } catch (error) {
        console.error('Failed to rename project:', error);
        throw error;
      }
    },

    async deleteProject(context, { projectId }) {
      try {
        const response = await axiosConfigured.post(API_URL + '/local-intents-responses-storage/projects/delete', {
          id: projectId,
          bot_id: API_BOT_ID
        });

        // Refresh the projects list after successful deletion
        await context.dispatch('updateAvailableProjects');

        return response.data;
      } catch (error) {
        console.error('Failed to delete project:', error);
        throw error;
      }
    },

    async uploadFile(context, { file, projectId }) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        let params;
        if (projectId) {
          params = { bot_id: API_BOT_ID, project_id: projectId };
        } else {
          params = { bot_id: API_BOT_ID };
        }

        console.log('Uploading file:', file.name, 'with params:', params);

        const response = await axiosConfigured.post(API_URL + "/api/upload-file", formData, {
          params: params,
          // Don't set Content-Type header - let browser set it automatically with boundary
        });

        console.log('File upload response:', response.data);

        // Refresh the files list after successful upload
        await context.dispatch('myLoadedFiles');

        // If projectId is provided, also refresh project-specific data
        if (projectId) {
          await context.dispatch('updateProjectSavedKnowledge', { project_id: projectId });
        }

        return response.data;
      } catch (error) {
        console.error('Failed to upload file:', error);
        throw error;
      }
    },

    async trainFiles(context, { projectId }) {
      try {
        const params = { bot_id: API_BOT_ID, project_id: projectId };

        console.log('Training files with params:', params);

        const response = await axiosConfigured.post(API_URL + "/api/train-files", {}, {
          params: params,
        });

        console.log('Training response:', response.data);

        // Refresh the files list after successful training
        await context.dispatch('myLoadedFiles');

        // Refresh project-specific data
        if (projectId) {
          await context.dispatch('updateProjectSavedKnowledge', { project_id: projectId });
        }

        return response.data;
      } catch (error) {
        console.error('Failed to train files:', error);
        throw error;
      }
    },

    async getPendingFiles(context, { projectId }) {
      try {
        const params = { bot_id: API_BOT_ID, project_id: projectId };

        const response = await axiosConfigured.get(API_URL + "/api/pending-files", {
          params: params,
        });

        return response.data.data || [];
      } catch (error) {
        console.error('Failed to get pending files:', error);
        return [];
      }
    },

    async uploadAndTrainFile(context, { file, projectId }) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        let params;
        if (projectId) {
          params = { bot_id: API_BOT_ID, project_id: projectId };
        } else {
          params = { bot_id: API_BOT_ID };
        }

        console.log('Uploading and training file:', file.name, 'with params:', params);

        const response = await axiosConfigured.post(API_URL + "/api/train", formData, {
          params: params,
          // Don't set Content-Type header - let browser set it automatically with boundary
        });

        console.log('File upload and train response:', response.data);

        // Refresh the files list after successful upload and training
        await context.dispatch('myLoadedFiles');

        // If projectId is provided, also refresh project-specific data
        if (projectId) {
          await context.dispatch('updateProjectSavedKnowledge', { project_id: projectId });
        }

        return response.data;
      } catch (error) {
        console.error('Failed to upload and train file:', error);
        throw error;
      }
    },

    async updateAIConfig(context, { systemPrompt }) {
      try {
        const response = await axiosConfigured.post(API_URL + "/api/update-bot-prompt", {
          id: API_BOT_ID,
          prompt_prefix: systemPrompt,
          prompt_answer_pre_prefix: systemPrompt,
        });

        // Refresh bot data after update
        await context.dispatch('updateBotPreprompt');

        return response.data;
      } catch (error) {
        console.error('Failed to update AI config:', error);
        throw error;
      }
    },

    async downloadFile(context, { fileId, fileName }) {
      try {
        const response = await axiosConfigured.get(API_URL + `/api/files/${fileId}/download`, {
          responseType: "blob",
        });

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        return true;
      } catch (error) {
        console.error('Failed to download file:', error);
        throw error;
      }
    }
  },
  modules: {
  }
})
