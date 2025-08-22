<template>
	<div class="project-details-workspace">
		<!-- Header Section -->
		<div class="workspace-header">
			<div class="header-content">
				<div class="header-left">
					<button @click="goBack" class="back-button">
						<i class="fas fa-arrow-left"></i>
						Back to Projects
					</button>
					<div class="header-title">
						<h1>{{ project?.name || 'Project Details' }}</h1>
						<p class="subtitle">
							Manage files and AI configuration for this project
						</p>
					</div>
				</div>
				<div class="header-actions">
					<button @click="triggerFileInput" class="btn-modern btn-primary">
						<i class="fas fa-upload"></i>
						Upload Files
					</button>
				</div>
			</div>
		</div>

		<!-- Main Content -->
		<div class="workspace-content" v-if="project">
			<!-- Project Info Card -->
			<div class="card project-info-card">
				<div class="card-header">
					<h3>Project Information</h3>
				</div>
				<div class="card-body">
					<div class="project-info-grid">
						<div class="info-item">
							<label>Project Name</label>
							<span>{{ project.name }}</span>
						</div>
						<div class="info-item">
							<label>Created</label>
							<span>{{ formatDate(project.createdAt) }}</span>
						</div>
						<div class="info-item">
							<label>Last Updated</label>
							<span>{{ formatDate(project.updatedAt) }}</span>
						</div>
						<div class="info-item">
							<label>Trained Files</label>
							<span>{{ currentFileCount }} files</span>
						</div>
						<div class="info-item">
							<label>Total Files</label>
							<span>{{ projectFiles.length }} files</span>
						</div>
					</div>
				</div>
			</div>

			<!-- File Management Section -->
			<div class="card">
				<div class="card-header">
					<div class="header-left">
						<h3>Project Files</h3>
						<span class="file-count-badge">{{ projectFiles.length }} files</span>
					</div>
					<div class="header-actions">
						<button v-if="showTrainSharedButton" @click="trainWithSharedFiles" class="btn-modern btn-info"
							:class="{ 'preloader': isTrainingShared }" :disabled="isTrainingShared">
							<i class="fas fa-share-alt"></i>
							Train with Shared Files
							<span v-if="sharedFilesCount > 0" class="badge">{{ sharedFilesCount }}</span>
						</button>
						<button @click="trainAI" class="btn-modern btn-success" :class="{ 'preloader': isTraining }"
							:disabled="isTraining || uploadedFilesCount === 0">
							<i class="fas fa-brain"></i>
							Train AI
							<span v-if="uploadedFilesCount > 0" class="badge">{{ uploadedFilesCount }}</span>
						</button>
						<button @click="retryTraining" class="btn-modern btn-warning" :class="{ 'preloader': isRetrying }"
							:disabled="isRetrying || failedFilesCount === 0">
							<i class="fas fa-redo"></i>
							Retry Train
							<span v-if="failedFilesCount > 0" class="badge">{{ failedFilesCount }}</span>
						</button>
					</div>
				</div>

				<div class="card-body">
					<!-- Drag & Drop Upload Area -->
					<div class="upload-zone" :class="{ 'drag-over': isDragOver }" @drop="handleFileDrop"
						@dragover.prevent="isDragOver = true" @dragleave="isDragOver = false" @click="triggerFileInput">
						<div class="upload-content">
							<div class="upload-icon">
								<i class="fas fa-cloud-upload-alt"></i>
							</div>
							<h4>Drop files here or click to browse</h4>
							<p>Supports: PDF, XLS, XLSX, TXT, JPG, PNG, GIF</p>
							<input ref="fileInput" type="file" multiple @change="handleFileSelect"
								accept=".pdf,.xls,.xlsx,.txt,.jpg,.png,.gif" class="file-input" />
							<button class="btn-modern btn-secondary">
								Choose Files
							</button>
						</div>
					</div>

					<!-- Files Grid -->
					<div class="files-grid" v-if="projectFiles.length">
						<div v-for="file in projectFiles" :key="file.id" class="file-card">
							<button @click="deleteFile(file)" class="file-delete-btn" title="Delete file">
								<i class="fas fa-times"></i>
							</button>
							<div class="file-icon" :class="getFileIconClass(file.file_type)">
								<i :class="getFileIcon(file.file_type)"></i>
							</div>
							<div class="file-info">
								<div class="file-header">
									<h4 class="file-name">{{ file.original_name }}</h4>
									<span class="file-status-badge" :class="getStatusBadgeClass(file.status)">
										<i v-if="file.status === 'processing'" class="fas fa-spinner fa-spin"></i>
										<i v-else-if="file.status === 'completed'" class="fas fa-check"></i>
										<i v-else-if="file.status === 'failed'" class="fas fa-times"></i>
										<i v-else-if="file.status === 'uploaded'" class="fas fa-clock"></i>
										{{ getStatusText(file.status) }}
									</span>
								</div>
								<div class="file-meta">
									<span class="file-type">{{
										file.file_type.toUpperCase()
									}}</span>
									<span class="file-category">{{
										file.file_category || "Document"
									}}</span>
									<span class="file-size">{{
										formatFileSize(file.file_size)
									}}</span>
								</div>
							</div>
							<div class="file-actions">
								<button @click="downloadFile(file)" class="btn-modern btn-icon">
									<i class="fas fa-download"></i>
								</button>
							</div>
						</div>
					</div>

					<!-- Empty State for Files -->
					<div v-else class="empty-files-state">
						<div class="empty-content">
							<div class="empty-icon">
								<i class="fas fa-file-upload"></i>
							</div>
							<h3>No Files Uploaded</h3>
							<p>Upload your first document to start training the AI model.</p>
						</div>
					</div>
				</div>
			</div>

			<!-- AI Configuration Section -->
			<div class="card">
				<div class="card-header">
					<h3>AI Configuration</h3>
				</div>

				<div class="card-body">
					<div class="config-form">
						<!-- Model Selection -->
						<div class="form-group">
							<label class="form-label">AI Model</label>
							<select v-model="aiConfig.selectedModel" @change="updateAIConfig" class="form-select">
								<optgroup label="OpenAI">
									<option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
									<option value="gpt-4">GPT-4</option>
								</optgroup>
								<optgroup label="OpenRouter">
									<option value="anthropic/claude-3">Claude 3</option>
									<option value="meta-llama/llama-2-70b-chat">
										Llama 2 70B
									</option>
								</optgroup>
							</select>
						</div>

						<!-- API Provider -->
						<div class="form-group">
							<label class="form-label">API Provider</label>
							<select v-model="aiConfig.apiProvider" @change="updateAIConfig" class="form-select">
								<option value="openai">OpenAI</option>
								<option value="openrouter">OpenRouter</option>
							</select>
						</div>

						<!-- System Prompt -->
						<div class="form-group">
							<div class="form-label-row">
								<label class="form-label">System Prompt</label>
								<button @click="togglePromptLock" :class="[
									'btn-modern',
									'btn-sm',
									aiConfig.promptLocked ? 'btn-danger' : 'btn-success',
								]">
									<i :class="aiConfig.promptLocked ? 'fas fa-lock' : 'fas fa-unlock'
										"></i>
									{{ aiConfig.promptLocked ? "Unlock" : "Lock" }}
								</button>
							</div>
							<textarea v-model="aiConfig.systemPrompt" :disabled="aiConfig.promptLocked" @blur="updateAIConfig"
								class="form-textarea" rows="4" placeholder="Enter your custom AI system prompt..."></textarea>
						</div>

						<!-- SOP Integration -->
						<div class="form-group">
							<label class="checkbox-label">
								<input type="checkbox" v-model="aiConfig.includeSOP" @change="updateAIConfig" />
								<span class="checkbox-text">
									Include SOP Library
									<small>
										Cross-reference with company SOPs for compliance checking
									</small>
								</span>
							</label>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Loading State -->
		<div v-else-if="isLoading" class="loading-state">
			<div class="loading-content">
				<i class="fas fa-spinner fa-spin"></i>
				<p>Loading project details...</p>
			</div>
		</div>

		<!-- Error State -->
		<div v-else class="error-state">
			<div class="error-content">
				<div class="error-icon">
					<i class="fas fa-exclamation-triangle"></i>
				</div>
				<h3>Project Not Found</h3>
				<p>The requested project could not be found.</p>
				<button @click="goBack" class="btn-modern btn-primary">
					Back to Projects
				</button>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: "ProjectDetails",
	data() {
		return {
			project: null,
			projectFiles: [],
			isDragOver: false,
			isLoading: true,
			isTraining: false,
			isRetrying: false,
			isTrainingShared: false,
			pollingInterval: null,
			sharedTrainingStatus: {
				needsSharedTraining: false,
				sharedFilesCount: 0,
				trainedSharedFilesCount: 0,
			},
			aiConfig: {
				selectedModel: "gpt-3.5-turbo",
				apiProvider: "openai",
				systemPrompt:
					"You are a helpful AI assistant that analyzes project documents and provides insights based on the uploaded files and company SOPs.",
				promptLocked: false,
				includeSOP: true,
			},
		};
	},
	computed: {
		currentFileCount() {
			return this.projectFiles.filter(file => file.status === 'completed' && file.deleted_at == null).length;
		},
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
		showTrainSharedButton() {
			return this.sharedTrainingStatus.needsSharedTraining &&
				this.sharedTrainingStatus.sharedFilesCount > 0;
		},
		sharedFilesCount() {
			return this.sharedTrainingStatus.sharedFilesCount || 0;
		},
	},
	beforeUnmount() {
		if (this.pollingInterval) {
			clearInterval(this.pollingInterval);
		}
	},
	async mounted() {
		await this.loadProject();
	},
	methods: {
		async loadProject() {
			try {
				this.isLoading = true;
				const projectId = this.$route.params.id;

				// Load projects from store
				await this.$store.dispatch("updateAvailableProjects");
				const projects = this.$store.getters.getAvailableProjects;

				// Find the specific project
				this.project = projects.find(p => p.id == projectId);

				if (this.project) {
					await this.loadProjectFiles();
					await this.loadAIConfig();
					await this.loadSharedTrainingStatus();
				}
			} catch (error) {
				console.error("Failed to load project:", error);
				this.$toast.error("Failed to load project details");
			} finally {
				this.isLoading = false;
			}
		},

		async loadProjectFiles() {
			if (!this.project) return;

			try {
				// Load files from OpenAI Knowledge API
				const files = await this.$store.dispatch('loadOpenAIKnowledgeFiles', {
					projectId: this.project.id
				});

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
				console.error("Failed to load project files:", error);
				this.$toast.error("Failed to load project files");
			}
		},

		async loadAIConfig() {
			if (!this.project) return;

			try {
				// Load AI config from store
				await this.$store.dispatch('updateBotPreprompt');
				const promptPrefix = this.$store.getters.getcurrent_bot_prompt_prefix;
				if (promptPrefix) {
					this.aiConfig.systemPrompt = promptPrefix;
				}
			} catch (error) {
				console.error("Failed to load AI config:", error);
			}
		},

		goBack() {
			this.$router.push({ name: 'projects' });
		},

		triggerFileInput() {
			this.$refs.fileInput.click();
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
			if (!this.project) {
				this.$toast.error("Project not loaded");
				return;
			}

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

					// Use OpenAI Knowledge upload
					const response = await this.$store.dispatch('uploadToOpenAIKnowledge', {
						file: file,
						projectId: this.project.id
					});

					console.log('OpenAI Knowledge upload response:', response);
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

		detectFileCategory(filename) {
			const name = filename.toLowerCase();
			if (name.includes("manual") || name.includes("guide")) return "manual";
			if (name.includes("invoice") || name.includes("bill")) return "invoice";
			if (name.includes("contract") || name.includes("agreement")) return "contract";
			if (name.includes("email") || name.includes("mail")) return "email";
			if (name.includes("transcript") || name.includes("meeting")) return "transcript";
			if (name.match(/\.(jpg|jpeg|png|gif)$/)) return "screenshot";
			return "document";
		},

		getFileIcon(fileType) {
			const iconMap = {
				pdf: "fas fa-file-pdf",
				xls: "fas fa-file-excel",
				xlsx: "fas fa-file-excel",
				txt: "fas fa-file-alt",
				jpg: "fas fa-file-image",
				jpeg: "fas fa-file-image",
				png: "fas fa-file-image",
				gif: "fas fa-file-image",
			};
			return iconMap[fileType?.toLowerCase()] || "fas fa-file";
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
			};
			return classMap[fileType?.toLowerCase()] || "file-text";
		},

		formatDate(dateString) {
			if (!dateString) return 'Never';
			const date = new Date(dateString);

			// Format: "7/28/2025 11:55 PM"
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'numeric',
				day: 'numeric'
			}) + ' ' + date.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});
		},

		formatFileSize(bytes) {
			if (!bytes) return "0 B";
			const k = 1024;
			const sizes = ["B", "KB", "MB", "GB"];
			const i = Math.floor(Math.log(bytes) / Math.log(k));
			return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
		},

		async updateAIConfig() {
			try {
				await this.$store.dispatch('updateAIConfig', {
					systemPrompt: this.aiConfig.systemPrompt
				});
				this.$toast.success("AI configuration updated");
			} catch (error) {
				console.error("Failed to update AI config:", error);
				this.$toast.error("Failed to update AI configuration");
			}
		},

		togglePromptLock() {
			this.aiConfig.promptLocked = !this.aiConfig.promptLocked;
			this.updateAIConfig();
		},


		async trainAI() {
			if (!this.project) {
				this.$toast.error("Project not loaded");
				return;
			}

			if (this.uploadedFilesCount === 0) {
				this.$toast.info("No uploaded files to train. Upload some files first.");
				return;
			}

			if (!window.confirm(`Train AI with ${this.uploadedFilesCount} uploaded file(s)?`)) {
				return;
			}

			this.isTraining = true;
			this.startStatusPolling();

			try {
				const result = await this.$store.dispatch('trainOpenAIFiles', {
					projectId: this.project.id
				});

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
		},

		async retryTraining() {
			if (!this.project) {
				this.$toast.error("Project not loaded");
				return;
			}

			if (this.failedFilesCount === 0) {
				this.$toast.info("No failed files to retry.");
				return;
			}

			if (!window.confirm(`Retry training ${this.failedFilesCount} failed file(s)?`)) {
				return;
			}

			this.isRetrying = true;
			this.startStatusPolling();

			try {
				const result = await this.$store.dispatch('retryFailedOpenAIFiles', {
					projectId: this.project.id
				});

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

		async deleteFile(file) {
			if (confirm(`Are you sure you want to delete "${file.original_name}"?`)) {
				try {
					await this.$store.dispatch('deleteOpenAIFile', {
						projectId: this.project.id,
						fileId: file.openai_file_id
					});
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

		async loadSharedTrainingStatus() {
			if (!this.project) return;

			try {
				const response = await this.$store.dispatch('getSharedFilesTrainingStatus', {
					projectId: this.project.id
				});

				this.sharedTrainingStatus = {
					needsSharedTraining: response.needsSharedTraining || false,
					sharedFilesCount: response.sharedFilesCount || 0,
					trainedSharedFilesCount: response.trainedSharedFilesCount || 0,
				};
			} catch (error) {
				console.error("Failed to load shared training status:", error);
				// Don't show error toast for this as it's not critical
			}
		},

		async trainWithSharedFiles() {
			if (!this.project) {
				this.$toast.error("Project not loaded");
				return;
			}

			if (!this.sharedTrainingStatus.needsSharedTraining) {
				this.$toast.info("No shared files need training for this project.");
				return;
			}

			if (!window.confirm(`Train project with ${this.sharedFilesCount} shared file(s)?`)) {
				return;
			}

			this.isTrainingShared = true;

			try {
				const result = await this.$store.dispatch('trainProjectWithSharedFiles', {
					projectId: this.project.id
				});

				this.$toast.success(`Shared files training completed: ${result.trainedCount} files trained successfully`);

				if (result.failedCount > 0) {
					this.$toast.warning(`${result.failedCount} shared files failed to train`);
				}

				// Refresh shared training status
				await this.loadSharedTrainingStatus();

			} catch (error) {
				console.error('Shared files training failed:', error);
				this.$toast.error(`Failed to train shared files: ${error.message}`);
			} finally {
				this.isTrainingShared = false;
			}
		},
	},
};
</script>

<style lang="scss" scoped>
.project-details-workspace {
	min-height: 100vh;
	// background: var(--gray-50);
}

.workspace-header {
	background: rgba(255, 255, 255, 0.95);
	backdrop-filter: blur(10px);
	border-bottom: 1px solid rgba(255, 255, 255, 0.2);
	box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
	position: sticky;
	top: 0;
	z-index: 100;

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1.5rem;

		.back-button {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.5rem 1rem;
			background: rgba(107, 114, 128, 0.1);
			color: var(--gray-600);
			border: 1px solid rgba(107, 114, 128, 0.2);
			border-radius: 0.375rem;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s ease;
			text-decoration: none;

			&:hover {
				background: var(--gray-600);
				color: white;
				transform: translateY(-1px);
			}

			i {
				font-size: 0.875rem;
			}
		}

		.header-title {
			h1 {
				margin: 0 0 0.25rem 0;
				font-size: 1.5rem;
				font-weight: 700;
				color: var(--gray-900);
			}

			.subtitle {
				margin: 0;
				font-size: 0.875rem;
				color: var(--gray-600);
			}
		}
	}
}

.workspace-content {
	padding: 2rem 0;
	max-width: 1400px;
	margin: 0 auto;
	display: flex;
	flex-direction: column;
	gap: 2rem;
}

.project-info-card {
	.project-info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;

		.info-item {
			label {
				display: block;
				font-size: 0.75rem;
				font-weight: 600;
				color: var(--gray-500);
				text-transform: uppercase;
				letter-spacing: 0.05em;
				margin-bottom: 0.25rem;
			}

			span {
				font-size: 0.875rem;
				font-weight: 500;
				color: var(--gray-900);
			}
		}
	}
}

.form-label-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 0.5rem;
}

.loading-state,
.error-state {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 60vh;

	.loading-content,
	.error-content {
		text-align: center;
		max-width: 400px;

		i {
			font-size: 3rem;
			color: var(--gray-400);
			margin-bottom: 1rem;
		}

		.error-icon i {
			color: var(--danger-red);
		}

		h3 {
			margin: 0 0 0.5rem 0;
			color: var(--gray-700);
			font-size: 1.25rem;
			font-weight: 600;
		}

		p {
			margin: 0 0 1.5rem 0;
			color: var(--gray-500);
			font-size: 0.875rem;
			line-height: 1.5;
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

/* Reuse existing styles from Projects.vue */
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
				color: var(--file-pdf);
				background-color: rgba(220, 38, 38, 0.1);
			}

			&.file-excel {
				color: var(--file-excel);
				background-color: rgba(22, 163, 74, 0.1);
			}

			&.file-text {
				color: var(--file-text);
				background-color: rgba(37, 99, 235, 0.1);
			}

			&.file-image {
				color: var(--file-image);
				background-color: rgba(124, 58, 237, 0.1);
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
		}
	}
}

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 1.5rem;
	border-bottom: 1px solid var(--gray-200);

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;

		h3 {
			margin: 0;
			font-size: 1.125rem;
			font-weight: 600;
			color: var(--gray-900);
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
}

.file-count-badge {
	background-color: var(--primary-blue);
	color: white;
	padding: 0.25rem 0.5rem;
	border-radius: 0.25rem;
	font-size: 0.75rem;
	font-weight: 600;
}

/* Loading state for buttons */
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

/* Responsive Design */
@media (max-width: 768px) {
	.workspace-header .header-content {
		flex-direction: column;
		gap: 1rem;
		align-items: flex-start;
	}

	.workspace-content {
		padding: 1rem;
	}

	.project-info-grid {
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	.files-grid {
		grid-template-columns: 1fr;
	}
}
</style>
