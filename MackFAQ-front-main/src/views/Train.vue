<template>
  <div class="modern-train-page">
    <!-- Confirmation Modal -->
    <ConfirmationModal :show="confirmModal.show" :type="confirmModal.type" :title="confirmModal.title"
      :message="confirmModal.message" :item-name="confirmModal.itemName" :warning-text="confirmModal.warningText"
      :confirm-text="confirmModal.confirmText" :is-loading="confirmModal.isLoading"
      :loading-text="confirmModal.loadingText" @confirm="handleConfirmAction" @cancel="handleCancelAction" />

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
            <h3><i class="fa-solid fa-folder-open"></i> Project Selection</h3>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Select Project</label>
              <select v-model="project_id" class="form-select">
                <option value="">General Training</option>
                <option v-for="project in projects" :key="project.id" :value="project.id">
                  {{ project.name }}
                </option>
              </select>
            </div>

            <div v-if="project_id" class="project-url-section">
              <label class="form-label">Public Chat URL</label>
              <div class="url-display">
                <span class="url-text">{{ project_link }}</span>
                <button class="btn-modern btn-secondary btn-sm" @click.prevent="copyTextToClipboard(project_link)">
                  <i class="fa-solid fa-copy"></i>
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- AI Prompts Configuration Card -->
        <div class="card">
          <div class="card-header">
            <h3><i class="fa-solid fa-robot"></i> AI Prompts Configuration</h3>
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
                <i class="fa-solid fa-save"></i>
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
          <div class="header-left">
            <h3><i class="fa-solid fa-cloud-upload-alt"></i> Document Upload</h3>
          </div>
          <div class="header-actions">
            <button @click="trainAI" class="btn-modern btn-success" :class="{ 'preloader': isTraining }"
              :disabled="isTraining || uploadedFilesCount === 0">
              <i class="fa-solid fa-brain"></i>
              Train AI
              <span v-if="uploadedFilesCount > 0" class="badge">{{ uploadedFilesCount }}</span>
            </button>
            <button @click="retryTraining" class="btn-modern btn-warning" :class="{ 'preloader': isRetrying }"
              :disabled="isRetrying || failedFilesCount === 0">
              <i class="fa-solid fa-redo"></i>
              Retry Train
              <span v-if="failedFilesCount > 0" class="badge">{{ failedFilesCount }}</span>
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="upload-section">
            <div class="sample-link">
              <a href="/Sample.csv" class="btn-modern btn-secondary btn-sm">
                <i class="fa-solid fa-download"></i>
                Download Sample CSV
              </a>
            </div>

            <!-- Drag & Drop Upload Area -->
            <div class="upload-zone" :class="{ 'drag-over': isDragOver }" @drop="handleFileDrop"
              @dragover="handleDragOver" @dragenter="handleDragEnter" @dragleave="handleDragLeave"
              @click="triggerFileInput">
              <div class="upload-content">
                <div class="upload-icon">
                  <i class="fa-solid fa-cloud-upload-alt"></i>
                </div>
                <h4>Drop files here or click to browse</h4>
                <p>Supports: PDF, XLS, XLSX, TXT, JPG, PNG, GIF, CSV</p>
                <input ref="fileInput" type="file" multiple @change="handleFileSelect"
                  accept=".pdf,.xls,.xlsx,.txt,.jpg,.png,.gif,.csv" class="file-input" />
                <button class="btn-modern btn-secondary">
                  Choose Files
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Training Data Editor Card -->
      <div class="card" v-if="TEXT_FAQ_SHOW">
        <div class="card-header">
          <h3><i class="fa-solid fa-edit"></i> Training Data Editor</h3>
          <button @click.prevent="clearTraining()" class="btn-modern btn-danger btn-sm">
            <i class="fa-solid fa-trash"></i>
            Clear All
          </button>
        </div>
        <div class="card-body">
          <div class="editor-section">
            <QAEditor v-model="form.text" :project_id="this.project_id"></QAEditor>
            <button type="submit" @click="sendForm" class="btn-modern btn-primary" ref="submit">
              <i class="fa-solid fa-brain"></i>
              {{ $t('train') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Train AI Card -->
      <!-- <div class="card full-width" v-if="project_id">
        <div class="card-header">
          <h3><i class="fa-solid fa-brain"></i> AI Training</h3>
        </div>
        <div class="card-body">
          <div class="training-section">
            <p class="training-description">
              Upload your files first, then click "Train AI" to process all pending files and train your AI assistant.
            </p>
            <button @click="trainAI" class="btn-modern btn-primary btn-large" ref="trainButton">
              <i class="fa-solid fa-brain"></i>
              Train AI
            </button>
          </div>
        </div>
      </div> -->

      <!-- Available Files Card -->
      <div class="card full-width" v-if="!reload && availableFiles && availableFiles.length">
        <div class="card-header">
          <h3><i class="fa-solid fa-files"></i> Available Documents</h3>
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
                    <i class="fa-solid fa-file-alt file-icon"></i>
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
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Project Files Card -->
    <div class="card full-width" v-if="projectFiles.length">
      <div class="card-header">
        <div class="header-left">
          <h3><i class="fa-solid fa-files"></i> {{ project_id && project ? 'Project Files' : 'General Files' }}</h3>
          <span class="file-count-badge">{{ projectFiles.length }} files</span>
        </div>
      </div>
      <div class="card-body">
        <!-- Files Grid -->
        <div class="files-grid">
          <div v-for="file in projectFiles" :key="file.id" class="file-card">
            <button @click="() => deleteFile(file)" class="file-delete-btn" title="Delete file">
              <i class="fa-solid fa-times"></i>
            </button>
            <div class="file-icon" :class="getFileIconClass(file.file_type)">
              <i :class="getFileIcon(file.file_type)"></i>
            </div>
            <div class="file-info">
              <div class="file-header">
                <h4 class="file-name">{{ file.original_name }}</h4>
                <span class="file-status-badge" :class="getStatusBadgeClass(file.status)">
                  <i v-if="file.status === 'processing'" class="fa-solid fa-spinner fa-spin"></i>
                  <i v-else-if="file.status === 'completed'" class="fa-solid fa-check"></i>
                  <i v-else-if="file.status === 'failed'" class="fa-solid fa-times"></i>
                  <i v-else-if="file.status === 'uploaded'" class="fa-solid fa-clock"></i>
                  {{ getStatusText(file.status) }}
                </span>
              </div>
              <div class="file-meta">
                <span class="file-type">{{ file.file_type.toUpperCase() }}</span>
                <span class="file-size">{{ formatFileSize(file.file_size) }}</span>
              </div>
            </div>
            <div class="file-actions">
              <button @click="() => downloadFile(file)" class="btn-modern btn-icon">
                <i class="fa-solid fa-download"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State for Files -->
        <div v-if="projectFiles.length === 0" class="empty-files-state">
          <div class="empty-content">
            <div class="empty-icon">
              <i class="fa-solid fa-file-upload"></i>
            </div>
            <h3>No Files Uploaded</h3>
            <p>Upload your first document to start training the AI model.</p>
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
import ConfirmationModal from "@/components/ConfirmationModal.vue";

export default {
  components: {
    lang,
    ListOfProjects,
    Textarea,
    FontAwesomeIcon,
    QAEditor,
    ConfirmationModal,
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
      // New properties for modern upload functionality
      isDragOver: false,
      isTraining: false,
      isRetrying: false,
      pollingInterval: null,
      projectFiles: [],
      // Confirmation modal properties
      confirmModal: {
        show: false,
        type: 'warning',
        title: '',
        message: '',
        itemName: '',
        warningText: '',
        confirmText: '',
        isLoading: false,
        loadingText: '',
        action: null
      },
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

    // Load files (either project-specific or general)
    await this.loadProjectFiles();
  },
  beforeUnmount() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
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
    // New computed properties for modern upload functionality
    uploadedFilesCount() {
      return this.projectFiles.filter(file => file.status === 'uploaded').length;
    },
    failedFilesCount() {
      return this.projectFiles.filter(file => file.status === 'failed').length;
    },
    processingFilesCount() {
      return this.projectFiles.filter(file => file.status === 'processing').length;
    },
    completedFilesCount() {
      return this.projectFiles.filter(file => file.status === 'completed').length;
    },
    projects() {
      return this.$store.getters.getAvailableProjects;
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
        this.$store.dispatch("updateAvailableProjects").then(async () => {
          if (!this.project_id) {
            this.project_prompt_prefix = null;
            this.project_link = null;
            this.project = null;
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

          // Load project files for the new project
          await this.loadProjectFiles();
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

    // New methods for modern upload functionality
    async loadProjectFiles() {
      try {
        let files;
        if (this.project_id && this.project) {
          // Load files from specific project
          files = await this.$store.dispatch('loadOpenAIKnowledgeFiles', {
            projectId: this.project.id
          });
        } else {
          // Load general files (no project selected)
          files = await this.$store.dispatch('loadGeneralFiles');
        }

        // Map the files to match the expected structure
        this.projectFiles = files.map(file => ({
          id: file.id,
          filename: file.filename,
          original_name: file.filename,
          file_type: file.file_type,
          file_size: file.file_size,
          status: file.status,
          openai_file_id: file.openai_file_id,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt
        }));
      } catch (error) {
        console.error("Failed to load files:", error);
        this.$toast.error("Failed to load files");
      }
    },

    triggerFileInput() {
      this.$refs.fileInput.click();
    },

    handleDragOver(event) {
      event.preventDefault();
      this.isDragOver = true;
    },

    handleDragEnter(event) {
      event.preventDefault();
      this.isDragOver = true;
    },

    handleDragLeave(event) {
      event.preventDefault();
      this.isDragOver = false;
    },

    handleFileDrop(event) {
      event.preventDefault();
      this.isDragOver = false;
      const files = Array.from(event.dataTransfer.files);
      this.uploadFiles(files);
    },

    handleFileSelect(event) {
      const files = Array.from(event.target.files);
      this.uploadFiles(files);
      event.target.value = "";
    },

    async uploadFiles(files) {
      // Check if user is authenticated
      const profile = this.$store.getters.getProfile;
      if (!profile) {
        this.$toast.error("Please log in to upload files");
        this.$router.push({ name: 'Login' });
        return;
      }

      for (const file of files) {
        try {
          this.$toast.info(`Uploading ${file.name}...`);

          let response;
          if (this.project_id && this.project) {
            // Upload to specific project
            response = await this.$store.dispatch('uploadToOpenAIKnowledge', {
              file: file,
              projectId: this.project.id
            });
          } else {
            // Upload to general knowledge (no project selected)
            response = await this.$store.dispatch('uploadToGeneralKnowledge', {
              file: file
            });
          }

          console.log('Upload response:', response);
          this.$toast.success(`${file.name} uploaded successfully`);
        } catch (error) {
          console.error("File upload failed:", error);

          if (error.response?.status === 401) {
            this.$toast.error("Authentication required. Please log in again.");
            this.$router.push({ name: 'Login' });
          } else {
            const errorMessage = error.response?.data?.message ||
              error.response?.data?.error ||
              error.response?.statusText ||
              error.message;
            this.$toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
          }
        }
      }

      // Refresh files list and start polling for real-time updates
      await this.loadProjectFiles();
      this.startStatusPolling();
    },

    startStatusPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
      }

      // Poll every 2 seconds for status updates
      this.pollingInterval = setInterval(async () => {
        if (this.isTraining || this.isRetrying || this.processingFilesCount > 0) {
          await this.loadProjectFiles();
        } else {
          // Stop polling if no files are processing
          this.stopStatusPolling();
        }
      }, 2000);
    },

    stopStatusPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    },

    async retryTraining() {
      if (this.failedFilesCount === 0) {
        this.$toast.info("No failed files to retry.");
        return;
      }

      const contextType = this.project_id && this.project ? `project "${this.project.name}"` : "general knowledge";

      this.showConfirmModal({
        type: 'warning',
        title: 'Retry Training',
        message: `Retry training ${this.failedFilesCount} failed file(s) for ${contextType}?`,
        confirmText: 'Retry',
        loadingText: 'Retrying...',
        action: async () => {
          this.isRetrying = true;
          this.startStatusPolling();

          try {
            let result;
            if (this.project_id && this.project) {
              // Retry for specific project
              result = await this.$store.dispatch('retryFailedOpenAIFiles', {
                projectId: this.project.id
              });
            } else {
              // Retry for general knowledge - we'll need to add this action to the store
              result = await this.$store.dispatch('retryFailedGeneralFiles');
            }

            this.$toast.success(`Retry completed: ${result.trainedCount} files trained successfully`);

            if (result.failedCount > 0) {
              this.$toast.warning(`${result.failedCount} files still failed`);
            }

            // Refresh the files list
            await this.loadProjectFiles();

          } catch (error) {
            console.error('Retry training failed:', error);
            this.$toast.error(`Failed to retry training: ${error.message}`);
          } finally {
            this.isRetrying = false;
            this.stopStatusPolling();
          }
        }
      });
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
      if (this.uploadedFilesCount === 0) {
        this.$toast.info("No uploaded files to train. Upload some files first.");
        return;
      }

      const contextType = this.project_id && this.project ? `project "${this.project.name}"` : "general knowledge";

      this.showConfirmModal({
        type: 'info',
        title: 'Train AI',
        message: `Train AI with ${this.uploadedFilesCount} uploaded file(s) for ${contextType}?`,
        confirmText: 'Train',
        loadingText: 'Training...',
        action: async () => {
          this.isTraining = true;
          this.startStatusPolling();

          try {
            let result;
            if (this.project_id && this.project) {
              // Train for specific project
              result = await this.$store.dispatch('trainOpenAIFiles', {
                projectId: this.project.id
              });
            } else {
              // Train for general knowledge
              result = await this.$store.dispatch('trainGeneralFiles');
            }

            this.$toast.success(`Training completed: ${result.trainedCount} files trained successfully`);

            if (result.failedCount > 0) {
              this.$toast.error(`${result.failedCount} files failed to train`);
            }

            // Refresh the files list
            await this.loadProjectFiles();

          } catch (error) {
            console.error('Training failed:', error);
            this.$toast.error(`Failed to train files: ${error.message}`);
          } finally {
            this.isTraining = false;
            this.stopStatusPolling();
          }
        }
      });
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

      this.showConfirmModal({
        type: 'delete',
        title: 'Clear Training Data',
        message: 'Are you sure you want to erase current Questions and Answers?',
        warningText: 'This action cannot be undone.',
        confirmText: 'Delete',
        loadingText: 'Deleting...',
        action: async () => {
          try {
            const response = await axios({
              url:
                API_URL +
                "/api/train?bot_id=" +
                API_BOT_ID +
                "&project_id=" +
                this.project_id,
              method: "DELETE",
            });

            if (response.data.status) {
              this.$store.dispatch("updateProjectTrainingData", {
                project_id: this.project_id,
              });
              this.$toast.success("Training data cleared successfully");
            } else {
              this.$toast.error("Failed to clear training data");
            }
          } catch (error) {
            console.error(error);
            this.$toast.error("Error occurred while clearing training data");
          }
        }
      });
    },
    async deleteUploadedKnowledge(id) {
      if (!this.project_id) {
        this.$toast.error(`Please select Project`, { position: "top" });
        return;
      }

      this.showConfirmModal({
        type: 'delete',
        title: 'Delete File',
        message: 'Are you sure you want to delete this file?',
        confirmText: 'Delete',
        loadingText: 'Deleting...',
        action: async () => {
          const result = await this.$store.dispatch("deleteProjectSavedKnowledge", {
            project_id: this.project_id,
            id,
          });

          if (!result) {
            this.$toast.error("File is not found");
          } else {
            this.$toast.success("Deleted");
          }
        }
      });
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
        this.showConfirmModal({
          type: 'warning',
          title: 'Overwrite Training Data',
          message: 'The current project already contains Questions & Answers. Uploading a new file will erase them.',
          warningText: 'This action cannot be undone.',
          confirmText: 'Upload File',
          loadingText: 'Uploading...',
          action: async () => {
            await this.performSendForm();
          }
        });
        return;
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

    // Helper methods for file cards
    getFileIcon(fileType) {
      const iconMap = {
        pdf: "fa-solid fa-file-pdf",
        xls: "fa-solid fa-file-excel",
        xlsx: "fa-solid fa-file-excel",
        txt: "fa-solid fa-file-alt",
        jpg: "fa-solid fa-file-image",
        jpeg: "fa-solid fa-file-image",
        png: "fa-solid fa-file-image",
        gif: "fa-solid fa-file-image",
        csv: "fa-solid fa-file-csv",
      };
      return iconMap[fileType?.toLowerCase()] || "fa-solid fa-file";
    },

    getFileIconClass(fileType) {
      const classMap = {
        pdf: "file-pdf",
        xls: "file-excel",
        xlsx: "file-excel",
        txt: "file-text",
        jpg: "file-image",
        jpeg: "file-image",
        png: "file-image",
        gif: "file-image",
        csv: "file-csv",
      };
      return classMap[fileType?.toLowerCase()] || "file-text";
    },

    getStatusText(status) {
      const statusMap = {
        'uploaded': 'Uploaded',
        'processing': 'Processing',
        'completed': 'Completed',
        'failed': 'Failed'
      };
      return statusMap[status] || 'Unknown';
    },

    getStatusBadgeClass(status) {
      const classMap = {
        'uploaded': 'status-uploaded',
        'processing': 'status-processing',
        'completed': 'status-completed',
        'failed': 'status-failed'
      };
      return classMap[status] || 'status-unknown';
    },

    formatFileSize(bytes) {
      if (!bytes) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    },

    async deleteFile(file) {
      if (confirm(`Are you sure you want to delete "${file.original_name}"?`)) {
        try {
          if (this.project_id && this.project) {
            // Delete project-specific file
            await this.$store.dispatch('deleteOpenAIFile', {
              projectId: this.project.id,
              fileId: file.openai_file_id
            });
          } else {
            // Delete general file
            await this.$store.dispatch('deleteGeneralFile', {
              fileId: file.openai_file_id
            });
          }
          this.$toast.success("File deleted successfully");
          await this.loadProjectFiles();
        } catch (error) {
          console.error("Failed to delete file:", error);
          this.$toast.error("Failed to delete file");
        }
      }
    },

    async downloadFile(file) {
      try {
        const response = await axios.get(`/api/files/${file.id}/download`, {
          responseType: "blob",
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", file.original_name);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to download file:", error);
        this.$toast.error("Failed to download file");
      }
    },

    // Modal handler methods
    showConfirmModal(config) {
      this.confirmModal = {
        show: true,
        type: config.type || 'warning',
        title: config.title || 'Confirm Action',
        message: config.message || 'Are you sure?',
        itemName: config.itemName || '',
        warningText: config.warningText || '',
        confirmText: config.confirmText || '',
        isLoading: false,
        loadingText: config.loadingText || '',
        action: config.action
      };
    },

    hideConfirmModal() {
      this.confirmModal.show = false;
      this.confirmModal.action = null;
    },

    async handleConfirmAction() {
      if (this.confirmModal.action) {
        this.confirmModal.isLoading = true;
        try {
          await this.confirmModal.action();
        } catch (error) {
          console.error('Modal action failed:', error);
        } finally {
          this.confirmModal.isLoading = false;
          this.hideConfirmModal();
        }
      } else {
        this.hideConfirmModal();
      }
    },

    handleCancelAction() {
      this.hideConfirmModal();
    },

    async performSendForm() {
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
    max-width: 100%;
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

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;

          h3 {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin: 0;

            i {
              color: var(--primary-blue);
            }
          }
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;

          .btn-modern {
            position: relative;

            .badge {
              position: absolute;
              top: -0.25rem;
              right: -0.25rem;
              background-color: rgba(255, 255, 255, 0.9);
              color: inherit;
              font-size: 0.625rem;
              font-weight: 600;
              padding: 0.125rem 0.375rem;
              border-radius: 0.75rem;
              min-width: 1.25rem;
              text-align: center;
              border: 1px solid currentColor;
            }
          }
        }

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

  .header-left {
    display: flex;
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

    // Modern drag & drop upload zone
    .upload-zone {
      margin: 1.5rem 0;
      border: 2px dashed var(--gray-300);
      border-radius: 0.5rem;
      padding: 2rem;
      text-align: center;
      transition: all 0.15s ease-in-out;
      cursor: pointer;

      &.drag-over {
        border-color: var(--primary-blue);
        background-color: rgba(37, 99, 235, 0.05);
      }

      &:hover {
        border-color: var(--primary-blue);
        background-color: var(--gray-50);
      }

      .upload-content {
        .upload-icon {
          font-size: 3rem;
          color: var(--gray-400);
          margin-bottom: 1rem;
        }

        h4 {
          margin: 0 0 0.5rem 0;
          color: var(--gray-700);
          font-size: 1.125rem;
          font-weight: 600;
        }

        p {
          margin: 0 0 1.5rem 0;
          color: var(--gray-600);
          font-size: 0.875rem;
        }

        .file-input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }
      }
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

// File Cards Styling
.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;

  .file-card {
    border: 1px solid var(--gray-200);
    border-radius: 0.375rem;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.15s ease-in-out;
    position: relative;
    background: white;

    &:hover {
      border-color: var(--primary-blue);
      box-shadow: 0 1px 3px 0 rgba(37, 99, 235, 0.1);

      .file-delete-btn {
        opacity: 1;
      }
    }

    .file-delete-btn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      width: 1.5rem;
      height: 1.5rem;
      border: none;
      background-color: rgba(239, 68, 68, 0.9);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transition: all 0.2s ease;
      font-size: 0.75rem;
      z-index: 10;

      &:hover {
        background-color: #dc2626;
        transform: scale(1.1);
      }

      &:active {
        transform: scale(0.95);
      }

      i {
        font-size: 0.625rem;
      }
    }

    .file-icon {
      font-size: 1.5rem;
      width: 2.5rem;
      height: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.375rem;

      &.file-pdf {
        color: #dc2626;
        background-color: rgba(220, 38, 38, 0.1);
      }

      &.file-excel {
        color: #16a34a;
        background-color: rgba(22, 163, 74, 0.1);
      }

      &.file-text {
        color: #2563eb;
        background-color: rgba(37, 99, 235, 0.1);
      }

      &.file-image {
        color: #7c3aed;
        background-color: rgba(124, 58, 237, 0.1);
      }

      &.file-csv {
        color: #059669;
        background-color: rgba(5, 150, 105, 0.1);
      }
    }

    .file-info {
      flex: 1;
      min-width: 0;

      .file-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.25rem;
        gap: 0.5rem;
      }

      .file-name {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--gray-900);
        line-height: 1.25;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }

      .file-status-badge {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.125rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-weight: 500;
        white-space: nowrap;

        &.status-uploaded {
          background-color: rgba(59, 130, 246, 0.1);
          color: #1d4ed8;
        }

        &.status-processing {
          background-color: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }

        &.status-completed {
          background-color: rgba(34, 197, 94, 0.1);
          color: #16a34a;
        }

        &.status-failed {
          background-color: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }

        i {
          font-size: 0.75rem;
        }
      }

      .file-meta {
        display: flex;
        gap: 0.5rem;
        font-size: 0.75rem;
        color: var(--gray-600);
        flex-wrap: wrap;

        span {
          padding: 0.125rem 0.375rem;
          background-color: var(--gray-100);
          border-radius: 0.25rem;
        }
      }
    }

    .file-actions {
      display: flex;
      gap: 0.25rem;

      .btn-icon {
        width: 2rem;
        height: 2rem;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.25rem;
        font-size: 0.875rem;
      }
    }
  }
}

.empty-files-state {
  padding: 3rem 2rem;
  text-align: center;

  .empty-content {
    max-width: 300px;
    margin: 0 auto;

    .empty-icon {
      font-size: 3rem;
      color: var(--gray-300);
      margin-bottom: 1rem;
    }

    h3 {
      margin: 0 0 0.5rem 0;
      color: var(--gray-700);
      font-size: 1.125rem;
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

.file-count-badge {
  background-color: var(--primary-blue);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 1rem;
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
