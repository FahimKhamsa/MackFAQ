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
							<label>Total Files</label>
							<span>{{ projectFiles.length }} files</span>
						</div>
					</div>
				</div>
			</div>

			<!-- File Management Section -->
			<div class="card">
				<div class="card-header">
					<h3>Project Files</h3>
					<span class="file-count-badge">{{ projectFiles.length }} files</span>
				</div>

				<div class="card-body">
					<!-- Drag & Drop Upload Area -->
					<div
						class="upload-zone"
						:class="{ 'drag-over': isDragOver }"
						@drop="handleFileDrop"
						@dragover.prevent="isDragOver = true"
						@dragleave="isDragOver = false"
						@click="triggerFileInput"
					>
						<div class="upload-content">
							<div class="upload-icon">
								<i class="fas fa-cloud-upload-alt"></i>
							</div>
							<h4>Drop files here or click to browse</h4>
							<p>Supports: PDF, XLS, XLSX, TXT, JPG, PNG, GIF</p>
							<input
								ref="fileInput"
								type="file"
								multiple
								@change="handleFileSelect"
								accept=".pdf,.xls,.xlsx,.txt,.jpg,.png,.gif"
								class="file-input"
							/>
							<button class="btn-modern btn-secondary">
								Choose Files
							</button>
						</div>
					</div>

					<!-- Files Grid -->
					<div class="files-grid" v-if="projectFiles.length">
						<div
							v-for="file in projectFiles"
							:key="file.id"
							class="file-card"
						>
							<div
								class="file-icon"
								:class="getFileIconClass(file.file_type)"
							>
								<i :class="getFileIcon(file.file_type)"></i>
							</div>
							<div class="file-info">
								<h4 class="file-name">{{ file.original_name }}</h4>
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
								<button
									@click="downloadFile(file)"
									class="btn-modern btn-icon"
								>
									<i class="fas fa-download"></i>
								</button>
								<button
									@click="deleteFile(file)"
									class="btn-modern btn-icon btn-danger"
								>
									<i class="fas fa-trash"></i>
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
							<select
								v-model="aiConfig.selectedModel"
								@change="updateAIConfig"
								class="form-select"
							>
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
							<select
								v-model="aiConfig.apiProvider"
								@change="updateAIConfig"
								class="form-select"
							>
								<option value="openai">OpenAI</option>
								<option value="openrouter">OpenRouter</option>
							</select>
						</div>

						<!-- System Prompt -->
						<div class="form-group">
							<div class="form-label-row">
								<label class="form-label">System Prompt</label>
								<button
									@click="togglePromptLock"
									:class="[
										'btn-modern',
										'btn-sm',
										aiConfig.promptLocked ? 'btn-danger' : 'btn-success',
									]"
								>
									<i
										:class="
											aiConfig.promptLocked ? 'fas fa-lock' : 'fas fa-unlock'
										"
									></i>
									{{ aiConfig.promptLocked ? "Unlock" : "Lock" }}
								</button>
							</div>
							<textarea
								v-model="aiConfig.systemPrompt"
								:disabled="aiConfig.promptLocked"
								@blur="updateAIConfig"
								class="form-textarea"
								rows="4"
								placeholder="Enter your custom AI system prompt..."
							></textarea>
						</div>

						<!-- SOP Integration -->
						<div class="form-group">
							<label class="checkbox-label">
								<input
									type="checkbox"
									v-model="aiConfig.includeSOP"
									@change="updateAIConfig"
								/>
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
import axios from "@/axios";

export default {
	name: "ProjectDetails",
	data() {
		return {
			project: null,
			projectFiles: [],
			isDragOver: false,
			isLoading: true,
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
				// Load files from store
				await this.$store.dispatch('myLoadedFiles');
				const docsConnected = this.$store.getters.getDocsConnectedToProject(this.project.id);
				this.projectFiles = docsConnected
					.map((conn) => conn.learning_session)
					.filter(Boolean);
			} catch (error) {
				console.error("Failed to load project files:", error);
				this.$toast.error("Failed to load project files");
			}
		},

		async loadAIConfig() {
			if (!this.project) return;

			try {
				const response = await axios.get(`/api/bot-prompt?bot_id=${process.env.VUE_APP_API_BOT_ID}`);
				if (response.data && response.data.data) {
					this.aiConfig.systemPrompt = response.data.data.prompt_prefix || this.aiConfig.systemPrompt;
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

			for (const file of files) {
				const formData = new FormData();
				formData.append("file", file);
				formData.append("project_id", this.project.id);
				formData.append("file_category", this.detectFileCategory(file.name));

				try {
					this.$toast.info(`Uploading ${file.name}...`);
					await axios.post("/api/train", formData, {
						params: {
							bot_id: process.env.VUE_APP_API_BOT_ID,
							project_id: this.project.id,
						},
						headers: {
							"Content-Type": "multipart/form-data",
						},
					});
					this.$toast.success(`${file.name} uploaded successfully`);
				} catch (error) {
					console.error("File upload failed:", error);
					this.$toast.error(`Failed to upload ${file.name}`);
				}
			}

			await this.loadProjectFiles();
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
			if (!dateString) return "Never";
			const date = new Date(dateString);
			return date.toLocaleDateString();
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
				await axios.post("/api/update-bot-prompt", {
					id: process.env.VUE_APP_API_BOT_ID,
					prompt_prefix: this.aiConfig.systemPrompt,
					prompt_answer_pre_prefix: this.aiConfig.systemPrompt,
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

		async deleteFile(file) {
			if (confirm(`Are you sure you want to delete "${file.original_name}"?`)) {
				try {
					await axios.delete(`/api/saved-knowledge-qoidoqe2koakjfoqwe?id=${file.id}`);
					this.$toast.success("File deleted successfully");
					await this.loadProjectFiles();
					await this.$store.dispatch('myLoadedFiles');
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
	},
};
</script>

<style lang="scss" scoped>
.project-details-workspace {
	min-height: 100vh;
	background: var(--gray-50);
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
	padding: 2rem;
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

		&:hover {
			border-color: var(--primary-blue);
			box-shadow: 0 1px 3px 0 rgba(37, 99, 235, 0.1);
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

			.file-name {
				margin: 0 0 0.25rem 0;
				font-size: 0.875rem;
				font-weight: 600;
				color: var(--gray-900);
				line-height: 1.25;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
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

.file-count-badge {
	background-color: var(--primary-blue);
	color: white;
	padding: 0.25rem 0.5rem;
	border-radius: 0.25rem;
	font-size: 0.75rem;
	font-weight: 600;
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
