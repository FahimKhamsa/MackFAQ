<template>
    <div class="page-train">
        <div class="center">
            <label class="field" v-if="PROJECT_SHOW">
                <div style="display: flex; gap: 20px;">
                    <h1 class="title">{{ $t('Project: ') }}</h1>
                    <label class="select-container" style="height: 10px;width: 100%;">
                    <ListOfProjects :allowEmpty="false" v-model="project_id"></ListOfProjects>
                    </label>
                </div>
            </label>

            <div class="rounded-container">

                <b style="font-size: larger; margin-rigth: 18px">Chat id</b>
                <div style="height: 350px; overflow-y: auto;scrollbar-width: thin;">
                    <table v-if="project_id" class="chats-list">
                        <tbody>
                            <tr v-for="row of allChatsList" :key="row.id">
                                <td>
                                    <button @click="() => openChatHistoryModal(row.id)"
                                        style="text-decoration: none; color:black; cursor: pointer;text-align: left;">
                                        {{ row.messages_slug }}
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
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

            <p style="display: flex;justify-content: space-between; margin-top: 20px;">
            <div v-if="TEXT_FAQ_SHOW">
                <button v-if="!qaEditor" @click="() => qaEditor = true" class="btn">Edit Prompt &
                    QA</button>
                <button v-if="qaEditor" @click="() => qaEditor = false" class="btn">Close</button>

            </div>
            <div>
                <button class="btn" v-if="currentChat && nextChat" @click="() => openChatHistoryModal(nextChat.id)">Next
                    Chat</button>

            </div>
            </p>


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
</template>

<script>
import axios from '@/axios';
import lang from '@/components/LangControl';
import ListOfProjects from '@/components/Projects/ListOfProjects.vue';
import Textarea from '@/components/Textarea.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import QAEditor from '@/components/QAEditor.vue';

export default {
    components: {
        lang,
        ListOfProjects,
        Textarea,
        FontAwesomeIcon,
        QAEditor
    },
    data() {
        return {
            project_id: this.DEFAULT_PROJECT_ID ?? 0,
            training_data: null,
            project_prompt_prefix: null,
            showChat: false,
            qaEditor: false,
            currentChatId: null,

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
        project_id(newValue) {
            if (newValue) {
                this.$store.dispatch('updateProjectTrainingData', { project_id: newValue });
                this.$store.dispatch('updateProjectConversationsList', { project_id: newValue });

                this.$store.dispatch('updateAvailableProjects')
                    .then(() => {
                        if (!this.project_id) {
                            this.project_prompt_prefix = null;
                            return;
                        }
                        this.project_prompt_prefix = this.projectsList[this.project_id]?.prompt_prefix  || '';
                    });

            }
        },
        savedTrainingData() {
            this.training_data = this.savedTrainingData;
        },
    },
    methods: {
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
                await axios.post(API_URL + '/local-intents-responses-storage/projects/update', {
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
        }
    }
}
</script>

<style lang="scss">
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