<template>
	<div class="projects-workspace">
		<!-- Header Section -->
		<div class="workspace-header">
			<div class="header-content">
				<div class="header-title">
					<h1>Project Management</h1>
					<p class="subtitle">
						Manage your projects and AI-powered document analysis
					</p>
				</div>
				<div class="header-actions">
					<button @click="showCreateModal = true" class="btn-modern btn-primary">
						<i class="fas fa-plus"></i>
						Create Project
					</button>
				</div>
			</div>
		</div>

		<!-- Main Content -->
		<div class="workspace-content">
			<!-- Projects Table -->
			<div class="projects-section">
				<ProjectsTable 
					ref="projectsTable"
					:projects="projects"
					:project-file-counts="projectFileCounts"
					@action-triggered="handleTableAction"
				/>
			</div>
		</div>

		<!-- Create Project Modal -->
		<CreateProjectModal 
			:show="showCreateModal" 
			@close="showCreateModal = false"
			@project-created="onProjectCreated"
		/>

		<!-- Delete Confirmation Modal -->
		<div v-if="showDeleteModal" class="modal-overlay" @click="cancelDelete">
			<div class="modal-content delete-modal" @click.stop>
				<div class="modal-header">
					<h3>Delete Project</h3>
					<button @click="cancelDelete" class="modal-close">
						<i class="fas fa-times"></i>
					</button>
				</div>
				
				<div class="modal-body">
					<div class="delete-warning">
						<div class="warning-icon">
							<i class="fas fa-exclamation-triangle"></i>
						</div>
						<div class="warning-content">
							<p>Are you sure you want to delete <strong>"{{ projectToDelete?.name }}"</strong>?</p>
							<p class="warning-text">This action cannot be undone. All files and data associated with this project will be permanently deleted.</p>
						</div>
					</div>
				</div>
				
				<div class="modal-footer">
					<button @click="cancelDelete" class="btn-modern btn-secondary">
						Cancel
					</button>
					<button 
						@click="confirmDelete" 
						:disabled="isDeleting"
						:class="['btn-modern', 'btn-danger', { 'loading': isDeleting }]"
					>
						<i v-if="!isDeleting" class="fas fa-trash"></i>
						<i v-else class="fas fa-spinner fa-spin"></i>
						{{ isDeleting ? 'Deleting...' : 'Delete Project' }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import axios from "@/axios";
import CreateProjectModal from "@/components/Projects/CreateProjectModal.vue";
import ProjectsTable from "@/components/Projects/ProjectsTable.vue";

export default {
	components: {
		CreateProjectModal,
		ProjectsTable,
	},
	data() {
		return {
			selectedProject: null,
			projectFiles: [],
			isDragOver: false,
			aiConfig: {
				selectedModel: "gpt-3.5-turbo",
				apiProvider: "openai",
				systemPrompt:
					"You are a helpful AI assistant that analyzes project documents and provides insights based on the uploaded files and company SOPs.",
				promptLocked: false,
				includeSOP: true,
			},
			fileUploadProgress: {},
			isLoading: false,
			showCreateModal: false,
			showDeleteModal: false,
			projectToDelete: null,
			isDeleting: false,
		};
	},
	computed: {
		projects() {
			// Get projects directly from store to ensure reactivity
			return this.$store.getters.getAvailableProjects;
		},
		
		projectFileCounts() {
			// Calculate file counts for each project
			const counts = {};
			this.projects.forEach(project => {
				const docsConnected = this.$store.getters.getDocsConnectedToProject(project.id);
				counts[project.id] = docsConnected.length;
			});
			return counts;
		}
	},
	async mounted() {
		await this.loadProjects();
	},
	methods: {
		async loadProjects() {
			try {
				this.isLoading = true;
				// Use the existing backend endpoint for projects
				await this.$store.dispatch("updateAvailableProjects");
			} catch (error) {
				console.error("Failed to load projects:", error);
				this.$toast.error("Failed to load projects");
			} finally {
				this.isLoading = false;
			}
		},

		async selectProject(project) {
			this.selectedProject = project;
			await this.loadProjectFiles();
			await this.loadAIConfig();
		},

		async loadProjectFiles() {
			if (!this.selectedProject) return;

			try {
				// Use the existing backend endpoint for project files
				const docsConnected =
					this.$store.getters.getDocsConnectedToProject(
						this.selectedProject.id
					);
				this.projectFiles = docsConnected
					.map((conn) => conn.learning_session)
					.filter(Boolean);
			} catch (error) {
				console.error("Failed to load project files:", error);
				this.$toast.error("Failed to load project files");
			}
		},

		async loadAIConfig() {
			if (!this.selectedProject) return;

			try {
				// Use the existing backend endpoint for bot prompt
				const response = await axios.get(`/api/bot-prompt?bot_id=${process.env.VUE_APP_API_BOT_ID}`);
				if (response.data && response.data.data) {
					this.aiConfig.systemPrompt = response.data.data.prompt_prefix || this.aiConfig.systemPrompt;
				}
			} catch (error) {
				console.error("Failed to load AI config:", error);
			}
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
			// Reset input
			event.target.value = "";
		},

		async uploadFiles(files) {
			if (!this.selectedProject) {
				this.$toast.error("Please select a project first");
				return;
			}

			for (const file of files) {
				const formData = new FormData();
				formData.append("file", file);
				formData.append("project_id", this.selectedProject.id);
				formData.append(
					"file_category",
					this.detectFileCategory(file.name)
				);

				try {
					this.$toast.info(`Uploading ${file.name}...`);
					// Use the existing backend endpoint for file upload
					await axios.post("/api/train", formData, {
						params: {
							bot_id: process.env.VUE_APP_API_BOT_ID,
							project_id: this.selectedProject.id,
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

			// Reload files after upload
			await this.loadProjectFiles();
		},

		detectFileCategory(filename) {
			const name = filename.toLowerCase();
			if (name.includes("manual") || name.includes("guide"))
				return "manual";
			if (name.includes("invoice") || name.includes("bill"))
				return "invoice";
			if (name.includes("contract") || name.includes("agreement"))
				return "contract";
			if (name.includes("email") || name.includes("mail")) return "email";
			if (name.includes("transcript") || name.includes("meeting"))
				return "transcript";
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

		getProjectFileCount(projectId) {
			// This would typically come from the API
			return this.selectedProject?.id === projectId
				? this.projectFiles.length
				: 0;
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
			return (
				parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
			);
		},

		async updateAIConfig() {
			try {
				// Use the existing backend endpoint for updating bot prompt
				await axios.post("/api/update-bot-prompt", {
					id: process.env.VUE_APP_API_BOT_ID,
					prompt_prefix: this.aiConfig.systemPrompt,
					prompt_answer_pre_prefix: this.aiConfig.systemPrompt
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

		async refreshProjects() {
			await this.loadProjects();
		},

		async renameProject(project, newName) {
			try {
				await this.$store.dispatch('renameProject', {
					projectId: project.id,
					newName: newName
				});
				this.$toast.success("Project renamed successfully");
			} catch (error) {
				console.error("Failed to rename project:", error);
				this.$toast.error("Failed to rename project");
			}
		},

		showDeleteConfirmation(project) {
			this.projectToDelete = project;
			this.showDeleteModal = true;
		},

		cancelDelete() {
			this.showDeleteModal = false;
			this.projectToDelete = null;
			this.isDeleting = false;
		},

		async confirmDelete() {
			if (!this.projectToDelete) return;

			try {
				this.isDeleting = true;
				await this.$store.dispatch('deleteProject', {
					projectId: this.projectToDelete.id
				});
				this.$toast.success("Project deleted successfully");
				if (this.selectedProject?.id === this.projectToDelete.id) {
					this.selectedProject = null;
					this.projectFiles = [];
				}
				this.cancelDelete();
			} catch (error) {
				console.error("Failed to delete project:", error);
				this.$toast.error("Failed to delete project");
				this.isDeleting = false;
			}
		},

		async deleteFile(file) {
			if (
				confirm(
					`Are you sure you want to delete "${file.original_name}"?`
				)
			) {
				try {
					// Use the existing backend endpoint for deleting files
					await axios.delete(`/api/saved-knowledge-qoidoqe2koakjfoqwe?id=${file.id}`);
					this.$toast.success("File deleted successfully");
					await this.loadProjectFiles();
					// Refresh the store data
					await this.$store.dispatch('myLoadedFiles');
				} catch (error) {
					console.error("Failed to delete file:", error);
					this.$toast.error("Failed to delete file");
				}
			}
		},

		async downloadFile(file) {
			try {
				const response = await axios.get(
					`/api/files/${file.id}/download`,
					{
						responseType: "blob",
					}
				);

				const url = window.URL.createObjectURL(
					new Blob([response.data])
				);
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

		// Modal event handler
		async onProjectCreated() {
			await this.loadProjects();
		},

		// Table action handler
		handleTableAction({ action, project, newName }) {
			switch (action) {
				case 'rename':
					if (newName) {
						// Inline rename from table
						this.renameProject(project, newName);
					} else {
						// Rename from dropdown - trigger inline editing
						this.$refs.projectsTable?.startRename(project);
					}
					break;
				case 'upload':
					// Select the project and trigger file upload
					this.selectProject(project);
					this.$nextTick(() => {
						this.triggerFileInput();
					});
					break;
				case 'delete':
					this.showDeleteConfirmation(project);
					break;
				default:
					console.log(`Action ${action} not implemented yet`);
			}
		},
	},
};
</script>

<style lang="scss" scoped>
/* Upload Zone Styling */
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

/* Files Grid */
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

/* Empty State */
.empty-state {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 400px;

	.empty-content {
		text-align: center;
		max-width: 300px;

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

/* File count badge */
.file-count-badge {
	background-color: var(--primary-blue);
	color: white;
	padding: 0.25rem 0.5rem;
	border-radius: 0.25rem;
	font-size: 0.75rem;
	font-weight: 600;
}


/* Delete Modal Styling */
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
	backdrop-filter: blur(4px);
}

.modal-content {
	background: white;
	border-radius: 0.5rem;
	box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	max-width: 500px;
	width: 90%;
	max-height: 90vh;
	overflow: hidden;
	animation: modalSlideIn 0.2s ease-out;

	&.delete-modal {
		max-width: 450px;
	}
}

@keyframes modalSlideIn {
	from {
		opacity: 0;
		transform: translateY(-20px) scale(0.95);
	}
	to {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
}

.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 1.5rem;
	border-bottom: 1px solid var(--gray-200);

	h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--gray-900);
	}

	.modal-close {
		background: none;
		border: none;
		color: var(--gray-400);
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 0.25rem;
		transition: all 0.15s ease-in-out;

		&:hover {
			color: var(--gray-600);
			background: var(--gray-100);
		}

		i {
			font-size: 1rem;
		}
	}
}

.modal-body {
	padding: 1.5rem;
}

.modal-footer {
	display: flex;
	justify-content: flex-end;
	gap: 0.75rem;
	padding: 1.5rem;
	border-top: 1px solid var(--gray-200);
	background: var(--gray-50);
}

.delete-warning {
	display: flex;
	gap: 1rem;
	align-items: flex-start;

	.warning-icon {
		width: 3rem;
		height: 3rem;
		background-color: rgba(239, 68, 68, 0.1);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #ef4444;
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.warning-content {
		flex: 1;

		p {
			margin: 0 0 0.75rem 0;
			color: var(--gray-900);
			font-size: 0.875rem;
			line-height: 1.5;

			&:last-child {
				margin-bottom: 0;
			}

			&.warning-text {
				color: var(--gray-600);
				font-size: 0.8125rem;
			}
		}

		strong {
			font-weight: 600;
		}
	}
}

.btn-danger {
	background-color: #ef4444;
	color: white;
	border: 1px solid #ef4444;

	&:hover:not(:disabled) {
		background-color: #dc2626;
		border-color: #dc2626;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
	}

	&:disabled {
		background-color: #fca5a5;
		border-color: #fca5a5;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	&.loading {
		pointer-events: none;
		opacity: 0.7;
	}
}

/* Responsive Design */
@media (max-width: 640px) {
	.files-grid {
		grid-template-columns: 1fr;
	}

	.upload-zone {
		margin: 1rem 0;
		padding: 1.5rem;

		.upload-content {
			.upload-icon {
				font-size: 2rem;
			}

			h4 {
				font-size: 1rem;
			}
		}
	}

	.modal-content {
		width: 95%;
		margin: 1rem;
	}

	.modal-header,
	.modal-body,
	.modal-footer {
		padding: 1rem;
	}

	.modal-footer {
		flex-direction: column;

		.btn-modern {
			width: 100%;
		}
	}

	.delete-warning {
		flex-direction: column;
		text-align: center;

		.warning-icon {
			align-self: center;
		}
	}
}
</style>
