<template>
  <div class="modern-train-page">
    <div class="train-header">
      <div class="header-content">
        <h1>AI Training Center</h1>
        <p class="subtitle">Configure prompts, upload documents, and train your AI assistant</p>
        <lang v-if="LANGUAGE_CHANGE_SHOW" />
      </div>
    </div>

    <div class="train-content">
      <!-- Success/Error Messages -->
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

      <!-- Main Content Grid -->
      <div class="train-grid">
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

            <div v-if="project_id" class="project-url-section">
              <label class="form-label">Public Chat URL</label>
              <div class="url-display">
                <span class="url-text">{{ project_link }}</span>
                <button class="btn-modern btn-secondary btn-sm" @click.prevent="copyTextToClipboard(project_link)">
                  <i class="fas fa-copy"></i>
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- AI Prompts Configuration Card -->
        <div class="card">
          <div class="card-header">
            <h3><i class="fas fa-robot"></i> AI Prompts Configuration</h3>
          </div>
          <div class="card-body">
            <form @submit.prevent="updatePrePrompt" class="prompts-form">
              <div class="form-group" v-if="GLOBAL_PROMPT_SHOW">
                <label class="form-label">{{ $t(PROMPT_LABEL_NAME) }}</label>
                <textarea class="form-textarea" rows="8" :placeholder="$t('text')"
                  v-model.trim="prompt_prefix"></textarea>
              </div>

              <div class="form-group" v-if="PROMPT_FOR_ANSWERS_SHOW">
                <label class="form-label">{{ $t(PROMPT_FOR_ANSWERS_LABEL_NAME) }}</label>
                <Textarea :placeholder="$t('text')" v-model="prompt_answer_pre_prefix"></Textarea>
              </div>

              <div class="form-group" v-if="PROJECT_SHOW || DEFAULT_PROJECT_ID">
                <label class="form-label">Project-Specific Prompt</label>
                <textarea class="form-textarea" rows="8" :placeholder="$t('prompt_for_project_prefix')"
                  v-model.trim="project_prompt_prefix"></textarea>
              </div>

              <button type="submit" class="btn-modern btn-primary" ref="submit">
                <i class="fas fa-save"></i>
                {{ $t('Save prompts') }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
    <!-- Document Management Section -->
    <div class="train-grid" v-if="UPLOADING_FAQ_SHOW">
      <!-- File Upload Card -->
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-cloud-upload-alt"></i> Document Upload</h3>
        </div>
        <div class="card-body">
          <form @submit.prevent="sendForm" ref="form" class="upload-form">
            <div class="upload-section">
              <div class="sample-link">
                <a href="/Sample.csv" class="btn-modern btn-secondary btn-sm">
                  <i class="fas fa-download"></i>
                  Download Sample CSV
                </a>
              </div>

              <div class="file-upload-area">
                <input type="file" name="file" ref="file" accept=".pdf, .csv" @change="chooseFile" class="file-input"
                  id="fileInput" />
                <label for="fileInput" class="file-upload-label">
                  <div class="upload-icon">
                    <i class="fas fa-cloud-upload-alt"></i>
                  </div>
                  <div class="upload-text">
                    <h4>Choose File to Upload</h4>
                    <p>Supports PDF and CSV files</p>
                    <div class="file-name" v-if="nameFile !== 'FAQ File<br> pdf, csv.'" v-html="nameFile"></div>
                  </div>
                </label>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- Training Data Editor Card -->
      <div class="card" v-if="TEXT_FAQ_SHOW">
        <div class="card-header">
          <h3><i class="fas fa-edit"></i> Training Data Editor</h3>
          <button @click.prevent="clearTraining()" class="btn-modern btn-danger btn-sm">
            <i class="fas fa-trash"></i>
            Clear All
          </button>
        </div>
        <div class="card-body">
          <div class="editor-section">
            <QAEditor v-model="form.text" :project_id="this.project_id"></QAEditor>
            <button type="submit" @click="sendForm" class="btn-modern btn-primary" ref="submit">
              <i class="fas fa-brain"></i>
              {{ $t('train') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Train AI Card -->
      <div class="card full-width" v-if="project_id">
        <div class="card-header">
          <h3><i class="fas fa-brain"></i> AI Training</h3>
        </div>
        <div class="card-body">
          <div class="training-section">
            <p class="training-description">
              Upload your files first, then click "Train AI" to process all pending files and train your AI assistant.
            </p>
            <button @click="trainAI" class="btn-modern btn-primary btn-large" ref="trainButton">
              <i class="fas fa-brain"></i>
              Train AI
            </button>
          </div>
        </div>
      </div>

      <!-- Available Files Card -->
      <div class="card full-width" v-if="!reload && availableFiles && availableFiles.length">
        <div class="card-header">
          <h3><i class="fas fa-files"></i> Available Documents</h3>
          <span class="file-count">{{ availableFiles.length }} files</span>
        </div>
        <div class="card-body">
          <div class="files-table-container">
            <table class="modern-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Upload Date</th>
                  <th v-if="this.project_id && this.project">Use in {{ this.project.name }}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in availableFiles" :key="item.id">
                  <td class="file-name-cell">
                    <i class="fas fa-file-alt file-icon"></i>
                    {{ item.file_name }}
                  </td>
                  <td class="date-cell">{{ item.createdAt.split("T")[0] }}</td>
                  <td v-if="this.project && this.project_id" class="checkbox-cell" :key="this.checks[item.id]">
                    <label class="checkbox-label">
                      <input v-model="this.checks[item.id]" @change="
                        () =>
                          $store.dispatch('updateFileConnection', {
                            project_id: this.project_id,
                            learning_session_id: item.id,
                            status: this.checks[item.id],
                          })
                      " type="checkbox" />
                      <span class="checkmark"></span>
                    </label>
                  </td>
                  <td class="actions-cell">
                    <button @click="() => deleteUploadedKnowledge(item.id)" class="btn-modern btn-danger btn-sm">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
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

      await this.uploadFile();
    },

    async uploadFile() {
      if (!this.project_id) {
        this.$toast.error(`Please select Project`, { position: "top" });
        return;
      }
      if (!this.$refs.file.files[0]) {
        this.$toast.error("FAQ data is required", { position: "top" });
        return;
      }

      this.$refs.submit.classList.add("preloader");

      try {
        const file = this.$refs.file.files[0];

        await this.$store.dispatch('uploadFile', {
          file: file,
          projectId: this.project_id
        });

        this.$toast.success(`${file.name} uploaded successfully. Click "Train AI" to start training.`);

        // Clear the file input
        this.$refs.file.value = null;
        this.nameFile = "FAQ File<br> pdf, csv.";

        // Refresh the files list
        this.reload = true;
        await this.$store.dispatch("updateProjectSavedKnowledge", {
          project_id: this.project_id,
        });
        setTimeout(() => {
          this.reload = false;
        }, 100);

      } catch (error) {
        console.error('Upload failed:', error);
        this.$toast.error(`Failed to upload file: ${error.message}`);
      }

      this.$refs.submit.classList.remove("preloader");
    },

    async trainAI() {
      if (!this.project_id) {
        this.$toast.error(`Please select Project`, { position: "top" });
        return;
      }

      // Check if there are pending files
      const pendingFiles = await this.$store.dispatch('getPendingFiles', {
        projectId: this.project_id
      });

      if (pendingFiles.length === 0) {
        this.$toast.info("No pending files to train. Upload some files first.");
        return;
      }

      if (!window.confirm(`Train AI with ${pendingFiles.length} pending file(s)?`)) {
        return;
      }

      this.$refs.trainButton.classList.add("preloader");

      try {
        const result = await this.$store.dispatch('trainFiles', {
          projectId: this.project_id
        });

        this.$toast.success(`Training completed: ${result.data.trainedCount} files trained successfully`);

        if (result.data.failedCount > 0) {
          this.$toast.error(`${result.data.failedCount} files failed to train`);
        }

        // Refresh the files list
        this.reload = true;
        await this.$store.dispatch("updateProjectSavedKnowledge", {
          project_id: this.project_id,
        });
        setTimeout(() => {
          this.reload = false;
        }, 100);

      } catch (error) {
        console.error('Training failed:', error);
        this.$toast.error(`Failed to train files: ${error.message}`);
      }

      this.$refs.trainButton.classList.remove("preloader");
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
          }).then((result) => { });
        }
        axios
          .post(API_URL + "/projects/management/update", {
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
.modern-train-page {
  min-height: 100vh;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);

  .train-header {
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
        margin: 0 0 1rem 0;
        font-size: 1.125rem;
        color: var(--gray-600);
      }
    }
  }

  .train-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
  }

  .train-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;

    .card {
      &.full-width {
        grid-column: 1 / -1;
      }

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

        .file-count {
          background: var(--primary-blue);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
        }
      }
    }
  }

  // Project URL Section
  .project-url-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--gray-200);

    .url-display {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      padding: 0.75rem;
      background: var(--gray-50);
      border-radius: 0.375rem;
      border: 1px solid var(--gray-200);

      .url-text {
        flex: 1;
        font-family: monospace;
        font-size: 0.875rem;
        color: var(--primary-blue);
        word-break: break-all;
      }
    }
  }

  // File Upload Styling
  .upload-section {
    .sample-link {
      margin-bottom: 1.5rem;
    }

    .file-upload-area {
      .file-input {
        display: none;
      }

      .file-upload-label {
        display: block;
        padding: 2rem;
        border: 2px dashed var(--gray-300);
        border-radius: 0.5rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          border-color: var(--primary-blue);
          background: rgba(37, 99, 235, 0.05);
        }

        .upload-icon {
          font-size: 3rem;
          color: var(--gray-400);
          margin-bottom: 1rem;
        }

        .upload-text {
          h4 {
            margin: 0 0 0.5rem 0;
            color: var(--gray-700);
            font-size: 1.125rem;
          }

          p {
            margin: 0 0 1rem 0;
            color: var(--gray-500);
            font-size: 0.875rem;
          }

          .file-name {
            font-weight: 600;
            color: var(--primary-blue);
          }
        }
      }
    }
  }

  // Editor Section
  .editor-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  // Training Section
  .training-section {
    text-align: center;
    padding: 2rem;

    .training-description {
      margin: 0 0 1.5rem 0;
      color: var(--gray-600);
      font-size: 1rem;
      line-height: 1.5;
    }

    .btn-large {
      padding: 1rem 2rem;
      font-size: 1.125rem;
      font-weight: 600;
      min-width: 200px;
    }
  }

  // Modern Table
  .files-table-container {
    overflow-x: auto;
  }

  .modern-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

    thead {
      background: var(--gray-50);

      th {
        padding: 1rem;
        text-align: left;
        font-weight: 600;
        color: var(--gray-700);
        font-size: 0.875rem;
        border-bottom: 1px solid var(--gray-200);
      }
    }

    tbody {
      tr {
        border-bottom: 1px solid var(--gray-100);
        transition: background-color 0.15s ease;

        &:hover {
          background: var(--gray-50);
        }

        &:last-child {
          border-bottom: none;
        }
      }

      td {
        padding: 1rem;
        font-size: 0.875rem;

        &.file-name-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          .file-icon {
            color: var(--primary-blue);
          }
        }

        &.date-cell {
          color: var(--gray-600);
          white-space: nowrap;
        }

        &.checkbox-cell {
          text-align: center;

          .checkbox-label {
            display: inline-flex;
            align-items: center;
            cursor: pointer;

            input[type="checkbox"] {
              margin: 0;
              margin-right: 0.5rem;
            }
          }
        }

        &.actions-cell {
          text-align: center;
        }
      }
    }
  }

  // Messages (keep existing animation)
  .message {
    position: fixed;
    right: -300px;
    bottom: 15px;
    max-width: 300px;
    width: 100%;
    animation: right 0.5s forwards;
    z-index: 1000;

    .item {
      background: rgba(0, 0, 0, 0.9);
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid var(--primary-blue);
      font-size: 0.875rem;
      color: #fff;
      position: relative;
      backdrop-filter: blur(10px);

      div+div {
        margin-top: 0.5rem;
      }

      &+.item {
        margin-top: 0.5rem;
      }
    }

    .item .close {
      position: absolute;
      top: 0.5rem;
      right: 0.75rem;
      cursor: pointer;
      color: #fff;
      font-size: 1rem;
      line-height: 1;
      transition: all 0.3s;

      &:hover {
        color: var(--primary-blue);
      }
    }

    &.error {
      .item {
        border-color: var(--danger-red);
        background: rgba(239, 68, 68, 0.9);
      }

      .item .close {
        &:hover {
          color: white;
        }
      }
    }

    &.success {
      .item {
        border-color: var(--success-green);
        background: rgba(16, 185, 129, 0.9);
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
}

// Responsive Design
@media (max-width: 1024px) {
  .modern-train-page {
    .train-content {
      padding: 0 1rem;
    }

    .train-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .train-header .header-content {
      padding: 0 1rem;

      h1 {
        font-size: 2rem;
      }
    }
  }
}

@media (max-width: 640px) {
  .modern-train-page {
    .train-header .header-content h1 {
      font-size: 1.75rem;
    }

    .modern-table {
      font-size: 0.75rem;

      thead th,
      tbody td {
        padding: 0.75rem 0.5rem;
      }
    }

    .project-url-section .url-display {
      flex-direction: column;
      gap: 0.75rem;
    }
  }
}

// Loading state for buttons
.btn-modern {
  &.preloader {
    pointer-events: none;
    position: relative;
    color: transparent !important;

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 1rem;
      height: 1rem;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }
}

@keyframes spin {
  0% {
    transform: translate(-50%, -50%) rotate(0deg);
  }

  100% {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
</style>
