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
    getIsAuthSet: state => true, // Bypass authentication - always return true
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
        });
    },
    updateBotPreprompt(context) {
      axiosConfigured.get(API_URL + '/api/bot-prompt?bot_id=' + API_BOT_ID)
        .then(result => {
          context.commit('SET_CURRENT_BOT_DATA', result.data.data || null);
        });
    },
    updateProjectTrainingData(context, { project_id }) {
      axiosConfigured.get(API_URL + '/local-intents-responses-storage/projects/knowledge-base?bot_id=' + API_BOT_ID + '&project_id=' + project_id)
        .then(async result => {
          context.commit('SET_PROJECT_TRAINING_DATA', { project_id, data: result.data.data || '' });
          await context.dispatch('myLoadedFiles');
        });
    },
    updateProjectConversationsList(context, { project_id }) {
      axiosConfigured.get(API_URL + '/api/list-of-conversations?bot_id=' + API_BOT_ID + '&project_id=' + project_id)
        .then(result => {
          context.commit('SET_PROJECT_CONVERSATIONS_LIST', { project_id, data: result.data.data || '' });
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
          context.commit('SET_PROJECT_CONVERSATION_DATA', { conversationId, data: result.data.data || '' });
        });
    },
    myLoadedFiles(context) {
      return axiosConfigured.get(API_URL + '/api/my-docs?bot_id=' + API_BOT_ID)
        .then(result => {
          context.commit('SET_MY_DOCS', result.data.data ?? []);
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
      return axiosConfigured.post('/auth/login', payload)
        .then((resp) => {
          setKT(resp.data.token);
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
      return context.dispatch("loadMe");
    },

    refreshAuth(context) {
      return axiosConfigured.post(API_URL + '/auth/refresh-token')
        .then((resp) => {
          setKT(resp.data.token);
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
    }
  },
  modules: {
  }
})
