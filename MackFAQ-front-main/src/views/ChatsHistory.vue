<template>
    <div class="modern-chats-page">
        <div class="chats-header">
            <div class="header-content">
                <h1>Chat History</h1>
                <p class="subtitle">Review and manage your conversation history</p>
            </div>
        </div>

        <div class="chats-content">
            <!-- Project Selection Card -->
            <div class="card" v-if="PROJECT_SHOW">
                <div class="card-header">
                    <h3><i class="fas fa-folder-open"></i> Project Selection</h3>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label">Select Project</label>
                        <ListOfProjects :allowEmpty="true" v-model="project_id"></ListOfProjects>
                    </div>
                </div>
            </div>

            <!-- Chat History Card -->
            <div class="card" v-if="project_id">
                <div class="card-header">
                    <h3><i class="fas fa-comments"></i> Conversation History</h3>
                    <span class="chat-count" v-if="allChatsList">{{ allChatsList.length }} conversations</span>
                </div>
                <div class="card-body">
                    <!-- Loading State -->
                    <div v-if="isLoadingConversations" class="loading-state">
                        <div class="loading-content">
                            <div class="loading-spinner">
                                <i class="fas fa-spinner fa-spin"></i>
                            </div>
                            <h3>Loading Conversations...</h3>
                            <p>Please wait while we fetch your conversation history.</p>
                        </div>
                    </div>

                    <!-- Conversations Table -->
                    <ConversationsTable v-else-if="allChatsList && allChatsList.length" :conversations="allChatsList"
                        :selectedConversation="selectedConversation" @conversation-selected="handleConversationSelected"
                        @action-triggered="handleConversationAction" />

                    <!-- Empty State -->
                    <div v-else-if="project_id && !isLoadingConversations" class="empty-state">
                        <div class="empty-content">
                            <i class="fas fa-comments empty-icon"></i>
                            <h3>No Conversations Yet</h3>
                            <p>Start chatting to see your conversation history here.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty Project State -->
            <div v-else class="empty-state">
                <div class="empty-content">
                    <i class="fas fa-folder-open empty-icon"></i>
                    <h3>Select a Project</h3>
                    <p>Choose a project above to view its conversation history.</p>
                </div>
            </div>
        </div>
    </div>

    <div class="model-container" :class="{ active: showChat }">
        <div class="modal-body" :class="{ long: qaEditor }">
            <h3 v-if="currentChat">{{ currentChat.messages_slug }}</h3>
            <FontAwesomeIcon style="position: absolute; top:20px; right: 20px; height: 20px;" icon="close"
                @click="() => showChat = false"></FontAwesomeIcon>

            <div class="chat-messages" ref="messages">
                <div v-if="currentChat" v-for="message of currentChat.messages" :key="message.messageId"
                    class="chat-message" :class="{ [message.type]: true }">
                    <p v-for="messPart of message.message.split('\n')">
                        {{ messPart }}
                    </p>
                    <p class="message-ts">{{ message.createdAt.replace('T', ' ').replace('Z', '').split('.')[0] }}</p>
                </div>
            </div>

            <div style="display: flex;justify-content: space-between; margin-top: 20px;">
                <div v-if="TEXT_FAQ_SHOW">
                    <button v-if="!qaEditor" @click="() => qaEditor = true" class="btn">Edit Prompt &
                        QA</button>
                    <button v-if="qaEditor" @click="() => qaEditor = false" class="btn">Close</button>

                </div>
                <div>
                    <button class="btn" v-if="currentChat && nextChat"
                        @click="() => openChatHistoryModal(nextChat.id)">Next
                        Chat</button>

                </div>
            </div>


            <div v-if="qaEditor" style="min-height: 200px; margin-top: 20px;">
                <div style="height: 150px;">
                    <QAEditor :project_id="project_id" v-model="training_data"></QAEditor>
                </div>
                <div style="">
                    <label v-if="PROJECT_SHOW" class="field">
                        <div class="text">{{ $t('prompt_for_project_prefix') }}</div>
                        <textarea style="min-height: 320px; width: 100%;" :placeholder="$t('text')"
                            v-model.trim="project_prompt_prefix"></textarea>
                    </label>
                </div>

                <button @click="() => this.saveQA()" class="btn" ref="submit">Save</button>
            </div>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <ConfirmationModal :show="showDeleteModal" type="delete" title="Delete Conversation"
        :item-name="conversationToDelete?.messages_slug || `Conversation ${conversationToDelete?.id}`"
        message="Are you sure you want to delete the conversation" warning-text="This action cannot be undone."
        :is-loading="isDeleting" confirm-text="Delete Conversation" loading-text="Deleting..." @confirm="confirmDelete"
        @cancel="cancelDelete" />
</template>

<script>
import axios from '@/axios';
import lang from '@/components/LangControl';
import ListOfProjects from '@/components/Projects/ListOfProjects.vue';
import Textarea from '@/components/Textarea.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import QAEditor from '@/components/QAEditor.vue';
import ConversationsTable from '@/components/Conversations/ConversationsTable.vue';
import ConfirmationModal from '@/components/ConfirmationModal.vue';

export default {
    components: {
        lang,
        ListOfProjects,
        Textarea,
        FontAwesomeIcon,
        QAEditor,
        ConversationsTable,
        ConfirmationModal
    },
    data() {
        return {
            project_id: null, // Initially no project selected
            training_data: null,
            project_prompt_prefix: null,
            showChat: false,
            qaEditor: false,
            currentChatId: null,
            selectedConversation: null,
            isLoadingConversations: false,
            showDeleteModal: false,
            conversationToDelete: null,
            isDeleting: false,

            chatsTimer: null,
        }
    },
    created() {
        if (this.project_id) {
            this.$store.dispatch('updateProjectConversationsList', { project_id: this.project_id });
        }

        if (!this.chatsTimer) {
            this.chatsTimer = setInterval(() => {
                if (!this.project_id) return;
                this.$store.dispatch('updateProjectConversationsList', { project_id: this.project_id });
            }, 5000);
        }
    },
    beforeUnmount() {
        if (this.chatsTimer) {
            clearInterval(this.chatsTimer);
        }
    },
    computed: {
        savedTrainingData() {
            return this.project_id && this.$store.getters.getProjectsTrainingData(this.project_id) || '';
        },
        currentChat() {
            return this.currentChatId && this.$store.getters.getConversationData(this.currentChatId);
        },
        allChatsList() {
            return this.project_id && this.$store.getters.getProjectsConversationsList(this.project_id);
        },
        projectsList() {
            return Object.fromEntries(this.$store.getters.getAvailableProjects.map(v => ([v.id, v])));
        },
        nextChat() {
            if (!this.project_id) {
                return false;
            }

            const list = this.allChatsList || [];

            if (!this.currentChatId) {
                return list[0] ?? false;
            }

            return list[list.findIndex(r => r.id === this.currentChatId) + 1] ?? false;
        }
    },
    watch: {
        project_id(newValue, oldValue) {
            if (newValue && newValue !== oldValue) {
                this.isLoadingConversations = true;
                this.selectedConversation = null;

                // Load project data and conversations
                Promise.all([
                    this.$store.dispatch('updateProjectTrainingData', { project_id: newValue }),
                    this.$store.dispatch('updateProjectConversationsList', { project_id: newValue }),
                    this.$store.dispatch('updateAvailableProjects')
                ]).then(() => {
                    if (!this.project_id) {
                        this.project_prompt_prefix = null;
                        return;
                    }
                    this.project_prompt_prefix = this.projectsList[this.project_id]?.prompt_prefix || '';
                }).finally(() => {
                    this.isLoadingConversations = false;
                });
            } else if (!newValue) {
                // Clear data when no project is selected
                this.selectedConversation = null;
                this.isLoadingConversations = false;
            }
        },
        savedTrainingData() {
            this.training_data = this.savedTrainingData;
        },
    },
    methods: {
        formatDate(dateString) {
            if (!dateString) return 'Unknown date';
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        },
        async openChatHistoryModal(chatId) {
            this.showChat = false;
            this.qaEditor = false;
            this.currentChatId = chatId;

            let toastLoading = null;

            try {
                await this.$store.dispatch('updateProjectConversation', { conversationId: chatId });
                const chat = this.currentChat;

                if (false && chat?.messages && chat.messages.length >= 2) {
                    const toastRecreating = this.$toast.warning(`Regenerating bot's answers...`);

                    const url = API_URL + '/api/recomplete-for-message';
                    await axios({ url: url, params: { conversationId: chatId, messageId: chat.messages[chat.messages.length - 2].messageId }, method: "GET" });

                    toastRecreating.dismiss();
                } else {
                    toastLoading = this.$toast.warning('Loading...');
                }

            } catch (ex) {
                alert(ex);
            }

            this.$store.dispatch('updateProjectConversation', { conversationId: chatId }).then(r => {
                this.showChat = true;
                this.$nextTick(v => {
                    setTimeout(() => {
                        const messages = this.$refs.messages;
                        messages.scrollTop = messages.scrollHeight;

                        if (toastLoading) {
                            toastLoading.dismiss();
                        }

                    }, 100);
                })
            })
        },
        async saveQA() {
            if (!this.project_id) {
                this.$toast.error(`Please select Project`, { position: "top" });
                return;
            }
            if (!this.training_data) {
                this.$toast.warning('FAQ data is empty', { position: "top" });
                // return;
            }
            if (this.savedTrainingData.length) {
                if (!window.confirm(`The current project already contains Questions & Answers. 

Uploading a new file will erase them.

Are you sure you want to upload the file?`)) {
                    return;
                }
            }
            this.$refs.submit.classList.add('preloader');
            const url = API_URL + '/api/train?bot_id=' + API_BOT_ID;

            const savingToast = this.$toast.warning('Saving...', { position: 'top' });
            try {
                if (this.training_data) {
                    await axios({ url: url, data: { raw: this.training_data || ' ' }, method: "POST", headers: { 'Content-Type': 'application/json' } })
                        .then(result => {
                            if (result.data.status) {
                                this.$refs.submit.classList.remove('preloader');
                                this.$store.dispatch('updateProjectTrainingData', { project_id: this.project_id });
                            }
                        });
                }
            } catch (error) {
                this.status = true;
                console.log(error);
            }

            try {
                await axios.post(API_URL + '/projects/management/update', {
                    prompt_prefix: this.project_prompt_prefix,
                    id: +this.project_id,
                    bot_id: +API_BOT_ID,
                }).then(() => {
                    this.$store.dispatch('updateAvailableProjects');
                })
            } catch (error) {
                this.status = true;
                console.log(error);
            }

            savingToast.dismiss();

            this.$toast.success('Saved', { position: 'top' })
        },

        handleConversationSelected(conversation) {
            this.selectedConversation = conversation;
            this.$router.push(`/chat/${conversation.id}`);
        },

        handleConversationAction({ action, conversation, newName }) {
            switch (action) {
                case 'view':
                    this.handleConversationSelected(conversation);
                    break;
                case 'rename':
                    this.renameConversation(conversation, newName);
                    break;
                case 'export':
                    this.exportConversation(conversation);
                    break;
                case 'delete':
                    this.deleteConversation(conversation);
                    break;
                default:
                    console.warn('Unknown action:', action);
            }
        },

        async renameConversation(conversation, newName) {
            if (!newName) return;

            try {
                const response = await axios.put(API_URL + '/conversations/rename-conversation', {
                    conversationId: conversation.id,
                    name: newName
                });

                if (response.data.success) {
                    this.$toast.success('Conversation renamed successfully', { position: 'top' });
                    // Refresh the conversations list
                    this.$store.dispatch('updateProjectConversationsList', { project_id: this.project_id });
                } else {
                    this.$toast.error(response.data.message || 'Failed to rename conversation', { position: 'top' });
                }
            } catch (error) {
                console.error('Failed to rename conversation:', error);
                this.$toast.error('Failed to rename conversation', { position: 'top' });
            }
        },

        async exportConversation(conversation) {
            try {
                // Create a simple text export of the conversation
                await this.$store.dispatch('updateProjectConversation', { conversationId: conversation.id });
                const chatData = this.$store.getters.getConversationData(conversation.id);

                if (!chatData || !chatData.messages) {
                    this.$toast.error('No conversation data to export', { position: 'top' });
                    return;
                }

                let exportText = `Conversation: ${conversation.messages_slug || `Conversation ${conversation.id}`}\n`;
                exportText += `Date: ${this.formatDate(conversation.createdAt)}\n`;
                exportText += `Questions: ${chatData.messages.filter(msg => msg.type === 'user_message').length}\n\n`;
                exportText += '--- Messages ---\n\n';

                chatData.messages.forEach((message, index) => {
                    const type = message.type === 'user_message' ? 'User' : 'AI';
                    const timestamp = message.createdAt.replace('T', ' ').replace('Z', '').split('.')[0];
                    exportText += `${type} (${timestamp}):\n${message.message}\n\n`;
                });

                // Create and download the file
                const blob = new Blob([exportText], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `conversation_${conversation.id}_${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                this.$toast.success('Conversation exported successfully', { position: 'top' });
            } catch (error) {
                console.error('Failed to export conversation:', error);
                this.$toast.error('Failed to export conversation', { position: 'top' });
            }
        },

        deleteConversation(conversation) {
            this.conversationToDelete = conversation;
            this.showDeleteModal = true;
        },

        cancelDelete() {
            this.showDeleteModal = false;
            this.conversationToDelete = null;
            this.isDeleting = false;
        },

        async confirmDelete() {
            if (!this.conversationToDelete) return;

            try {
                this.isDeleting = true;
                const response = await axios.delete(API_URL + '/conversations/delete-conversation', {
                    data: {
                        conversationId: this.conversationToDelete.id
                    }
                });

                if (response.data.success) {
                    this.$toast.success('Conversation deleted successfully', { position: 'top' });
                    // Refresh the conversations list
                    this.$store.dispatch('updateProjectConversationsList', { project_id: this.project_id });
                    this.cancelDelete();
                } else {
                    this.$toast.error(response.data.message || 'Failed to delete conversation', { position: 'top' });
                    this.isDeleting = false;
                }
            } catch (error) {
                console.error('Failed to delete conversation:', error);
                this.$toast.error('Failed to delete conversation', { position: 'top' });
                this.isDeleting = false;
            }
        }
    }
}
</script>

<style lang="scss">
.modern-chats-page {
    min-height: 100vh;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);

    .chats-header {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        padding: 2rem 0;
        margin-bottom: 2rem;

        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            text-align: center;

            h1 {
                margin: 0 0 0.5rem 0;
                font-size: 2.5rem;
                font-weight: 700;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .subtitle {
                margin: 0;
                font-size: 1.125rem;
                color: var(--gray-600);
            }
        }
    }

    .chats-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
        display: grid;
        gap: 2rem;
    }

    .card {
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;

            h3 {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin: 0;

                i {
                    color: var(--primary-blue);
                }
            }

            .chat-count {
                background: var(--primary-blue);
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 1rem;
                font-size: 0.75rem;
                font-weight: 600;
            }
        }
    }

    .chats-grid {
        display: grid;
        gap: 1rem;

        .chat-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.5rem;
            background: white;
            border: 1px solid var(--gray-200);
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.2s ease;

            &:hover {
                border-color: var(--primary-blue);
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
                transform: translateY(-2px);
            }

            .chat-preview {
                flex: 1;

                .chat-title {
                    margin: 0 0 0.25rem 0;
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--gray-900);
                    line-height: 1.4;
                }

                .chat-date {
                    margin: 0;
                    font-size: 0.875rem;
                    color: var(--gray-600);
                }
            }

            .chat-actions {
                color: var(--gray-400);
                font-size: 1.25rem;
                transition: all 0.2s ease;
            }

            &:hover .chat-actions {
                color: var(--primary-blue);
                transform: translateX(4px);
            }
        }
    }

    .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        padding: 2rem;

        .loading-content {
            text-align: center;
            max-width: 400px;

            .loading-spinner {
                font-size: 3rem;
                color: var(--primary-blue);
                margin-bottom: 1rem;

                i {
                    animation: spin 1s linear infinite;
                }
            }

            h3 {
                margin: 0 0 0.5rem 0;
                color: var(--gray-700);
                font-size: 1.25rem;
                font-weight: 600;
            }

            p {
                margin: 0;
                color: var(--gray-500);
                font-size: 0.875rem;
                line-height: 1.5;
            }
        }
    }

    .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        padding: 2rem;

        .empty-content {
            text-align: center;
            max-width: 400px;

            .empty-icon {
                font-size: 4rem;
                color: var(--gray-300);
                margin-bottom: 1rem;
            }

            h3 {
                margin: 0 0 0.5rem 0;
                color: var(--gray-700);
                font-size: 1.25rem;
                font-weight: 600;
            }

            p {
                margin: 0;
                color: var(--gray-500);
                font-size: 0.875rem;
                line-height: 1.5;
            }
        }
    }
}

// Responsive Design
@media (max-width: 1024px) {
    .modern-chats-page {
        .chats-content {
            padding: 0 1rem;
        }

        .chats-header .header-content {
            padding: 0 1rem;

            h1 {
                font-size: 2rem;
            }
        }
    }
}

@media (max-width: 640px) {
    .modern-chats-page {
        .chats-header .header-content h1 {
            font-size: 1.75rem;
        }

        .chats-grid .chat-card {
            padding: 1rem;

            .chat-preview .chat-title {
                font-size: 0.875rem;
            }
        }
    }
}

// Legacy styles for modal
table.chats-list {
    td {
        padding: 5px 0px;
    }
}

.chat-messages {
    overflow-y: scroll;
    margin-top: 20px;
    height: 80%;

    .message-ts {
        margin-top: 15px;
        color: rgb(80, 80, 80);
        font-size: 12px;
        white-space: nowrap;
        font-weight: normal;
    }

    .chat-message {
        max-width: 45%;
        text-align: left;
        min-height: 50px;
        padding: 20px;
        border-radius: 10px;
        margin-top: 10px;
        overflow-wrap: anywhere;


        &.user_message {
            margin-right: auto;
            background: #5ed1ff;
        }

        &.ai_message {
            margin-left: auto;
            background: #5effc9;
        }

        &:last-child {
            &.ai_message {
                font-weight: bold;
            }
        }
    }
}

.model-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    min-height: 100vh;
    min-width: 100vw;
    background: #8585859a;
    overflow-y: scroll;

    display: none;

    &.active {
        display: block;
    }

    .modal-body {
        position: relative;
        width: 70%;
        margin-left: auto;
        margin-right: auto;
        margin-top: 10%;

        background: #fff;
        min-height: 80%;
        max-height: 80%;
        height: 80%;
        padding: 30px;
        border-radius: 10px;

        display: flex;
        flex-direction: column;

        &.long {
            min-height: unset;
            max-height: unset;
            height: unset;
        }

        h3 {
            text-align: center;
        }
    }
}


.border-red {
    border: red 2px solid;
    padding: 2px;
    margin: 2px;
}

.message {
    position: fixed;
    right: -300px;
    bottom: 15px;
    max-width: 300px;
    width: 100%;
    animation: right 0.5s forwards;

    .item {
        background: rgba(0, 0, 0, .8);
        padding: 10px;
        border-radius: 12px;
        border: 1px solid var(--colAkcent);
        font-size: 14px;
        color: #fff;
        position: relative;

        div+div {
            margin-top: 5px;
        }

        &+.item {
            margin-top: 10px;
        }
    }

    .item .close {
        position: absolute;
        top: 5px;
        right: 10px;
        cursor: pointer;
        color: #fff;
        font-size: 15px;
        line-height: 1;
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
            color: var(--colAkcent);
        }
    }

    &.error {
        .item {
            border-color: red;
            color: red;
        }

        .item .close {
            color: red;

            &:hover {
                color: var(--colAkcent);
            }
        }
    }
}

@keyframes right {
    0% {
        right: -300px;
    }

    100% {
        right: 15px;
    }
}

.page-train {
    // background: url(../assets/img/bg-train.jpeg) no-repeat center top;
    background-size: cover;
    min-height: 100%;

    padding: 55px 0 75px 0;
    padding-left: 20px;
    padding-right: 20px;

    .center {
        max-width: 600px;
    }

    .btn {
        &.preloader {
            pointer-events: none;
            background: #fff url(../assets/img/preloader.svg) no-repeat center;
            color: transparent;
        }
    }
}
</style>

<style scoped>
table {
    border-collapse: collapse;
}

tr {
    border-bottom: 1px solid #bdc3cb;
}

tr:last-child {
    border-bottom: none;
}
</style>
