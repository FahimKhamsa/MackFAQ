<template>
  <div class="page-train">
    <div class="center">
      <lang v-if="LANGUAGE_CHANGE_SHOW" />

      <div class="success message" v-if="message">
        <div class="item" v-for="(item, index) in message" :key="index">
          <span class="close" @click="closeMessage(index)">x</span>
          <div>
            <span>{{ $t("questions") }}:</span>&nbsp;
            <i v-for="(question, index) in item.questions" :key="index">
              {{ question }}&nbsp;
            </i>
          </div>
          <div>
            <span>{{ $t("answer") }}:</span>&nbsp;
            <i>{{ item.answer }}</i>
          </div>
        </div>
      </div>

      <div class="error message" v-if="status">
        <div class="item">
          <span class="close" @click="status = false">x</span>
          <div>{{ $t("error") }}!</div>
        </div>
      </div>
      <form action="#" class="form" ref="form" @submit.prevent="updatePrePrompt">
        <label class="field" v-if="GLOBAL_PROMPT_SHOW">
          <div class="text">{{ $t(PROMPT_LABEL_NAME) }}</div>
          <textarea
            style="min-height: 320px"
            :placeholder="$t('text')"
            v-model.trim="prompt_prefix"
          ></textarea>
        </label>

        <label class="field" v-if="PROMPT_FOR_ANSWERS_SHOW">
          <div class="text">{{ $t(PROMPT_FOR_ANSWERS_LABEL_NAME) }}</div>
          <Textarea
            style="min-height: auto"
            :placeholder="$t('text')"
            v-model="prompt_answer_pre_prefix"
          ></Textarea>
        </label>

        <div class="rounded-container">
          <label
            class="field field-file"
            :style="[PROJECT_SHOW ? {} : { display: 'none' }]"
          >
            <!-- <div class="text">{{ $t("Project: ") }}</div> -->
            <ListOfProjects :allowEmpty="true" v-model="project_id"></ListOfProjects>
          </label>

          <div v-if="project_id" class="rounded-container-small">
            <label class="field project-link">
              <div class="">Project's Public Chat URL:</div>
              <span style="color: blue">{{ project_link }}</span>
            </label>
            <button class="copy" @click.prevent="copyTextToClipboard(project_link)">
              <font-awesome-icon icon="copy" />
            </button>
          </div>
        </div>

        <label v-if="PROJECT_SHOW || DEFAULT_PROJECT_ID" class="field">
          <textarea
            style="min-height: 320px"
            :placeholder="$t('prompt_for_project_prefix')"
            v-model.trim="project_prompt_prefix"
          ></textarea>
        </label>

        <div class="tx-c mt15">
          <input
            style="min-width: 100%"
            type="submit"
            :value="$t('Save prompts')"
            ref="submit"
            class="btn"
          />
        </div>
      </form>
    </div>
    <form
      v-if="UPLOADING_FAQ_SHOW"
      action="#"
      class="form"
      ref="form"
      @submit.prevent="sendForm"
    >
      <div style="overflow-x: auto;">
        <!-- <table>
                        <thead>
                            <tr><th>File</th><th>Date</th><th>Delete</th></tr>
                        </thead>
                        <tr v-for="(item, index) in savedFiles" :key="index">
                            <td>{{ item.file_name }}</td>
                            <td style="white-space: nowrap;">{{ item.createdAt.split('T')[0] }}</td>
                            <td style="width: 10px;" @click="() => deleteUploadedKnowledge(item.id)"><font-awesome-icon icon="trash"/></td>
                        </tr>
                    </table> -->
        <table v-if="!reload && availableFiles && availableFiles.length" style="min-width: fit-content; margin-left: auto; margin-right: auto">
          <thead>
            <tr>
              <th>File</th>
              <th>Date</th>
              <th>Delete</th>
              <th style="white-space: nowrap" v-if="this.project_id && this.project"></th>
            </tr>
          </thead>
          <tr v-for="(item, index) in availableFiles" :key="item.id">
            <td>{{ item.file_name }}</td>
            <td style="white-space: nowrap">{{ item.createdAt.split("T")[0] }}</td>
            <td style="width: 5px" @click="() => deleteUploadedKnowledge(item.id)">
              <font-awesome-icon icon="trash" />
            </td>
            <td style="white-space: nowrap" v-if="this.project  && this.project_id" :key="this.checks[item.id]">
            Use in {{ this.project.name }}:
              <input
                v-model="this.checks[item.id]"
                @change="
                  () =>
                    $store.dispatch('updateFileConnection', {
                      project_id: this.project_id,
                      learning_session_id: item.id,
                      status: this.checks[item.id],
                    })
                "
                type="checkbox"
              />
            </td>
            <!-- <td v-if="this.project_id && item.is_connected_to_current" style="width: 10px;" @click="() => $store.dispatch('updateFileConnection', { project_id: this.project_id, learning_session_id: item.id, status: false })"><button class="btn" style="    white-space: nowrap;">Remove from the Current Project</button></td>
                            <td v-if="this.project_id && !item.is_connected_to_current" style="width: 10px;" @click="() => $store.dispatch('updateFileConnection', { project_id: this.project_id, learning_session_id: item.id, status: true })"><button class="btn" style="    white-space: nowrap;">Add to the Current Project</button></td> -->
          </tr>
        </table>
      </div>
      <template v-if="TEXT_FAQ_SHOW">
        <label class="field">
          <div style="display: flex">
            <div class="text">{{ $t("data") }}</div>
            <button
              @click.prevent="clearTraining()"
              class="ml-auto"
              style="
                margin-bottom: 12px;
                margin-left: auto;
                font-size: larger;
                cursor: pointer;
              "
            >
              <FontAwesomeIcon icon="trash"></FontAwesomeIcon>
            </button>
          </div>
          <QAEditor v-model="form.text" :project_id="this.project_id"></QAEditor>
        </label>

        <div class="tx-c mt15">
          <input type="submit" :value="$t('train')" ref="submit" class="btn" />
        </div>
      </template>

      <label style="margin-left: auto; margin-right: auto; color: black;" class="field field-file">
        <div style="display: flex; gap: 10px">
          <a style="color: blue" href="/Sample.csv">Sample.csv</a>
        </div>
        <input
          type="file"
          name="file"
          ref="file"
          accept=".pdf, .csv"
          @change="chooseFile"
        />
        <div class="file">
          <div class="button">
            <img src="@/assets/img/ic-download.svg" alt="" />
            <span>{{ $t("upload") }}</span>
          </div>
          <div class="name" v-html="nameFile"></div>
        </div>
      </label>
    </form>
  </div>
</template>

<script>
import axios from "@/axios";
import lang from "@/components/LangControl";
import ListOfProjects from "@/components/Projects/ListOfProjects.vue";
import Textarea from "@/components/Textarea.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import QAEditor from "@/components/QAEditor.vue";

export default {
  components: {
    lang,
    ListOfProjects,
    Textarea,
    FontAwesomeIcon,
    QAEditor,
  },
  data() {
    return {
      form: {
        file: null,
        text: "",
      },
      project_id: this.DEFAULT_PROJECT_ID ?? 0,
      nameFile: "FAQ File<br> pdf, csv.",
      message: null,
      status: false,
      prompt_answer_pre_prefix: null,
      prompt_prefix: null,
      project_prompt_prefix: null,
      project_link: null,
      project: null,
      checks: {},
      reload: false,
    };
  },
  async created() {
    this.$store.dispatch("updateBotPreprompt");
    if (this.getcurrent_bot_preprompt) {
      this.prompt_answer_pre_prefix = this.getcurrent_bot_preprompt;
    }
    if (this.getcurrent_bot_prompt_prefix) {
      this.prompt_prefix = this.getcurrent_bot_prompt_prefix;
    }

    if (this.project_id) {
      await this.$store.dispatch("updateProjectTrainingData", {
        project_id: this.project_id,
      });
      await this.$store.dispatch("updateAvailableProjects");
      await this.$store.dispatch("updateProjectSavedKnowledge", {
        project_id: this.project_id,
      });
      const project = this.projectsList[this.project_id];
      this.project = project;

      this.project_prompt_prefix = project?.prompt_prefix || "";
      if (project && project.public_link) {
        this.project_link =
          location.origin +
          this.$router.resolve({
            name: "ChatPublic",
            params: {
              only_project_link: project.public_link,
              project_name: project.name,
            },
          }).href;
      }
    }
  },
  computed: {
    getcurrent_bot_preprompt() {
      return this.$store.getters.getcurrent_bot_preprompt;
    },
    getcurrent_bot_prompt_prefix() {
      return this.$store.getters.getcurrent_bot_prompt_prefix;
    },
    savedTrainingData() {
      return (
        (this.project_id &&
          this.$store.getters.getProjectsTrainingData(this.project_id)) ||
        ""
      );
    },
    projectsList() {
      return Object.fromEntries(
        this.$store.getters.getAvailableProjects.map((v) => [v.id, v])
      );
    },
    savedFiles() {
      return (
        (this.project_id && this.$store.getters.getSavedKnowledge(this.project_id)) || []
      );
    },
    availableFiles() {
      const list = this.$store.getters.getMyDocsList.map((d) => ({
        ...d,
        is_connected_to_current:
          this.project_id &&
          d.connections.some((conn) => this.project_id === conn.project_id),
      }));
      for (const o of list) {
        this.checks[o.id] = o.is_connected_to_current;
      }
      return list;
    },
    //     getMyDocsList: state => state.myDocsList,
    // getDocsConnectedToProject: state => project_id => state.myDocsListByProject[project_id] ?? [],
  },
  watch: {
    project_id() {
      if (this.project_id) {
        // this.$store.dispatch('updateProjectTrainingData', { project_id: newValue.project_id });
        this.$store.dispatch("updateProjectSavedKnowledge", {
          project_id: this.project_id,
        });
        this.$store.dispatch("updateAvailableProjects").then(() => {
          if (!this.project_id) {
            this.project_prompt_prefix = null;
            this.project_link = null;
            return;
          }
          const project = this.projectsList[this.project_id];
          this.project = project;
          this.project_prompt_prefix = project?.prompt_prefix || "";
          if (project && project.public_link) {
            this.project_link =
              location.origin +
              this.$router.resolve({
                name: "ChatPublic",
                params: {
                  only_project_link: project.public_link,
                  project_name: project.name,
                },
              }).href;
          }
        });
      }
    },
    getcurrent_bot_preprompt() {
      this.prompt_answer_pre_prefix = this.getcurrent_bot_preprompt;
    },
    getcurrent_bot_prompt_prefix() {
      this.prompt_prefix = this.getcurrent_bot_prompt_prefix;
    },
  },
  methods: {
    ch(ev) {
      console.log(ev, ev.target.value);
    },
    async copyTextToClipboard(text) {
      if (!navigator.clipboard) {
        this.$toast.error("Please, do it manually. Error occurred during copy :(");
        return;
      }

      await navigator.clipboard.writeText(text);

      this.$toast.success("Copied");
    },

    async chooseFile(e) {
      this.nameFile = e?.target?.files?.[0]?.name ?? null;

      await this.sendForm();
    },
    closeMessage(index) {
      this.message.splice(index, 1);
    },
    updatePrePrompt() {
      if (
        this.project_prompt_prefix &&
        this.project_prompt_prefix.length &&
        !this.project_id
      ) {
        this.$toast.error(`Please select Project to save project prompt`, {
          position: "top",
        });
        return;
      }
      const url = API_URL + "/api/update-bot-prompt";
      let data = JSON.stringify({
        id: API_BOT_ID,
        prompt_answer_pre_prefix: this.prompt_answer_pre_prefix,
        prompt_prefix: this.prompt_prefix,
      });
      let headers = { "Content-Type": "application/json" };
      try {
        if (this.GLOBAL_PROMPT_SHOW) {
          axios({
            url: url,
            data: data,
            method: "POST",
            headers: headers,
          }).then((result) => {});
        }
        axios
          .post(API_URL + "/local-intents-responses-storage/projects/update", {
            prompt_prefix: this.project_prompt_prefix,
            id: +this.project_id,
            bot_id: +API_BOT_ID,
          })
          .then(() => {
            this.$store.dispatch("updateAvailableProjects");
            this.$toast.success("Your prompts have been saved", { position: "top" });
          })
          .catch((e) => {
            this.$toast.error("Error");
            alert(JSON.stringify(e));
          });
      } catch (error) {
        console.log(error);

        this.$toast.error("Error");
        alert(JSON.stringify(error));
      }
    },
    clearTraining() {
      if (!this.project_id) {
        this.$toast.error(`Please select Project`, { position: "top" });
        return;
      }
      if (
        !window.confirm(`Are you sure you want to erase current Questions and Answers?`)
      ) {
        return;
      }
      try {
        axios({
          url:
            API_URL +
            "/api/train?bot_id=" +
            API_BOT_ID +
            "&project_id=" +
            this.project_id,
          method: "DELETE",
        }).then((result) => {
          if (result.data.status) {
            this.$store.dispatch("updateProjectTrainingData", {
              project_id: this.project_id,
            });
          } else {
          }
        });
      } catch (error) {
        console.error(error);
      }
    },
    async deleteUploadedKnowledge(id) {
      if (!this.project_id) {
        this.$toast.error(`Please select Project`, { position: "top" });
        return;
      }

      if (!window.confirm("Are you sure?")) {
        return;
      }

      const result = await this.$store.dispatch("deleteProjectSavedKnowledge", {
        project_id: this.project_id,
        id,
      });

      if (!result) {
        return this.$toast.error("File is not found");
      }

      return this.$toast.success("Deleted");
    },
    async sendForm() {
      if (!this.project_id) {
        this.$toast.error(`Please select Project`, { position: "top" });
        return;
      }
      if (!this.form.text && !this.$refs.file.files[0]) {
        this.$toast.error("FAQ data is required", { position: "top" });
        return;
      }
      if (this.savedTrainingData.length) {
        if (
          !window.confirm(`The current project already contains Questions & Answers. 

Uploading a new file will erase them.

Are you sure you want to upload the file?`)
        ) {
          return;
        }
      }
      this.$refs.submit.classList.add("preloader");
      const url = API_URL + "/api/train?bot_id=" + API_BOT_ID;
      let data = new FormData(this.$refs.form);
      let headers = { enctype: "multipart/form-data" };

      if (this.form.text.length && !this.$refs.file.files[0]) {
        data = JSON.stringify({ raw: this.form.text });
        headers = { "Content-Type": "application/json" };
      }

      try {
        this.$refs.file.value = null;
        this.nameFile = "FAQ File<br> pdf, csv.";
      } catch (ex) {
        console.error(ex);
      }

      try {
        await axios({ url: url, data: data, method: "POST", headers: headers }).then(
          async (result) => {
            if (result.data.status) {
              this.message = result.data.data.rows;

              this.reload = true;

              await this.$store.dispatch("updateProjectSavedKnowledge", {
                project_id: this.project_id,
              });
              await this.$store.dispatch("updateProjectTrainingData", {
                project_id: this.project_id,
              });

              setTimeout(() => {
                this.reload = false;
              }, 100);

              return this.$toast.success("File loaded");
            } else {
              return this.$toast.error("File loading failed");
            }
          }
        );
      } catch (error) {
        console.log(error);
      }

      this.$refs.submit.classList.remove("preloader");
      this.$refs.form.reset();
    },
  },
};
</script>

<style lang="scss">
.rounded-container-small {
  background: #c2d3e5;
  border-radius: 27px;
  padding: 0.3rem 0.5rem 0.3rem 1.3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;

  .copy {
    border-radius: 50px;
    border: 1px solid black;
    min-width: 30px;
    height: 30px;
  }
}

textarea {
  margin-top: 20px;
	background: #c2d3e5;
	border-radius: 27px;
	padding: 1rem 0.9rem 1rem 0.9rem;
	display: flex;
	font-size: 13px;
	flex-direction: column;
	background-color: #d8dee3;
	gap: 20px;
	box-shadow: 5px 5px 5px #93a1b0bf, -3px -3px rgba(255, 255, 255, 0.377);
  border: none!important;
  outline: none!important;
  color: black!important;
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
    background: rgba(0, 0, 0, 0.8);
    padding: 10px;
    border-radius: 12px;
    border: 1px solid var(--colAkcent);
    font-size: 14px;
    color: #fff;
    position: relative;

    div + div {
      margin-top: 5px;
    }

    & + .item {
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

  padding: 100px 0 75px 0;

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
