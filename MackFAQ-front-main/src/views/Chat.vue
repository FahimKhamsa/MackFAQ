<template>
	<div class="chat-workspace">
		<div class="chat-header">
			<div class="header-content">
				<div class="chat-title">
					<h1>AI Assistant</h1>
					<p class="subtitle">
						Query your project documents with SOP compliance
					</p>
				</div>

				<div class="context-controls">
					<div class="control-group">
						<label class="control-label">Project Context</label>
						<select v-model="selectedProject" @change="updateChatContext" class="context-select">
							<option value="">General Chat</option>
							<option v-for="project in projects" :key="project.id" :value="project.id">
								{{ project.name }}
							</option>
						</select>
					</div>

					<div class="control-group">
						<label class="toggle-label">
							<input type="checkbox" v-model="includeSOP" @change="updateSOPSetting" />
							<span class="toggle-text">SOP Cross-Reference</span>
						</label>
					</div>

					<div class="control-group">
						<label class="control-label">AI Model</label>
						<select v-model="selectedModel" @change="updateModelSetting" class="context-select">
							<option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
							<option value="gpt-4">GPT-4</option>
							<option value="anthropic/claude-3">Claude 3</option>
						</select>
					</div>
				</div>
			</div>
		</div>

		<div class="chat-body-container">
			<div class="main-chat-area">
				<div class="chat-messages" ref="messagesContainer">
					<div v-if="!questions.length" class="empty-chat">
						<div class="empty-content">
							<div class="empty-icon">
								<i class="fas fa-comments"></i>
							</div>
							<h3>Start a Conversation</h3>
							<p>
								Ask questions about your project documents or get help with SOP compliance.
							</p>
						</div>
					</div>

					<div v-for="(question, index) in questions" :key="index"
						:class="['message', question.type === 'question' ? 'user-message' : 'ai-message']">
						<div class="message-avatar">
							<i :class="question.type === 'question' ? 'fas fa-user' : 'fas fa-robot'"></i>
						</div>
						<div class="message-content">
							<div class="message-text" v-html="formatMessage(question.text)"></div>
							<div v-if="question.sources && question.sources.length" class="message-sources">
								<h4>Sources:</h4>
								<div v-for="source in question.sources" :key="source.id" class="source-item">
									<i :class="getFileIcon(source.file_type)"></i>
									<span class="source-name">{{ source.file_name }}</span>
									<span class="source-type">{{ source.file_type.toUpperCase() }}</span>
								</div>
							</div>
							<div v-if="question.sopReferences && question.sopReferences.length" class="sop-references">
								<h4>SOP References:</h4>
								<div v-for="sop in question.sopReferences" :key="sop.id" class="sop-item">
									<i class="fas fa-book"></i>
									<span class="sop-title">{{ sop.title }}</span>
									<span class="sop-category">{{ sop.category }}</span>
								</div>
							</div>
							<div class="message-timestamp">
								{{ formatTimestamp(question.timestamp) }}
							</div>
						</div>
					</div>
				</div>

				<div class="chat-input">
					<div class="input-container">
						<div class="input-wrapper">
							<textarea v-model="form.text" @keydown.enter.prevent="handleEnterKey" :placeholder="getInputPlaceholder()"
								class="input-field" rows="1" ref="messageInput"></textarea>
							<button @click="sendMessage" :disabled="!form.text.trim() || isLoading"
								:class="['send-button', { loading: isLoading }]">
								<i v-if="!isLoading" class="fas fa-paper-plane"></i>
								<i v-else class="fas fa-spinner fa-spin"></i>
							</button>
						</div>
						<div class="context-status" v-if="selectedProject || includeSOP">
							<div class="status-items">
								<span v-if="selectedProject" class="status-item project-context">
									<i class="fas fa-folder"></i>
									{{ getProjectName(selectedProject) }}
								</span>
								<span v-if="includeSOP" class="status-item sop-context">
									<i class="fas fa-book"></i>
									SOP Enabled
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="chat-history-sidebar" :class="{ collapsed: isHistoryCollapsed }">
				<div class="sidebar-header">
					<h3>History</h3>
					<button @click="startNewChat" class="new-chat-btn" title="Start New Chat">
						<i class="fas fa-plus"></i>
					</button>
				</div>

				<div v-if="isLoadingHistory" class="loading-state">
					<i class="fas fa-spinner fa-spin"></i>
					<span>Loading conversations...</span>
				</div>

				<div v-else-if="!chatHistory.length" class="empty-state">
					<i class="fas fa-comments"></i>
					<span v-if="selectedProject">No project conversations yet</span>
					<span v-else>No general conversations yet</span>
				</div>

				<ul v-else class="history-list">
					<li v-for="convo in chatHistory" :key="convo.id" @click="loadConversation(convo.id)"
						:class="['history-item', { active: convo.id === currentConversationId }]">
						<p class="history-title">{{ convo.title }}</p>
						<span class="history-time">{{ formatHistoryDate(convo.timestamp) }}</span>
					</li>
				</ul>
			</div>

			<button @click="toggleHistory" class="history-toggle-button" :class="{ 'is-collapsed': isHistoryCollapsed }">
				<i :class="isHistoryCollapsed ? 'fas fa-chevron-left' : 'fas fa-chevron-right'"></i>
			</button>
		</div>

		<div v-if="showFileModal" class="modal-overlay" @click="closeFileModal">
			<div class="modal-content" @click.stop>
				<div class="modal-header">
					<h3>Select Files for Context</h3>
					<button @click="closeFileModal" class="btn-modern btn-icon">
						<i class="fas fa-times"></i>
					</button>
				</div>
				<div class="modal-body">
					<div class="file-selection">
						<div v-for="file in projectFiles" :key="file.id" class="file-option">
							<label class="checkbox-label">
								<input type="checkbox" v-model="selectedFiles" :value="file.id" />
								<span class="checkbox-text">
									<i :class="getFileIcon(file.file_type)"></i>
									{{ file.original_name }}
									<small>{{ file.file_category || "Document" }}</small>
								</span>
							</label>
						</div>
					</div>
				</div>
				<div class="modal-footer">
					<button @click="closeFileModal" class="btn-modern btn-secondary">
						Cancel
					</button>
					<button @click="applyFileSelection" class="btn-modern btn-primary">
						Apply Selection
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import axios from "@/axios";

export default {
	props: {
		conversationId: {
			type: String,
			default: null
		}
	},
	data() {
		return {
			form: {
				text: "",
				project_id: null,
			},
			questions: [],
			projects: [],
			projectFiles: [],
			selectedProject: "",
			includeSOP: true,
			selectedModel: "gpt-3.5-turbo",
			selectedFiles: [],
			showFileModal: false,
			isLoading: false,
			currentConversationId: null,
			// NEW: State for history sidebar
			isHistoryCollapsed: false,
			chatHistory: [],
			isLoadingHistory: false,
			isLoadingConversation: false,
		};
	},
	async mounted() {
		await this.loadProjects();
		this.autoResizeTextarea();

		// Handle initial route - check if we have a conversationId from route
		await this.handleRouteChange();

		// Load chat history after handling route
		await this.loadChatHistory();
	},
	methods: {
		// NEW: Method to toggle sidebar visibility
		toggleHistory() {
			this.isHistoryCollapsed = !this.isHistoryCollapsed;
		},
		// Load chat history for the selected project or general chat
		async loadChatHistory() {
			this.isLoadingHistory = true;
			try {
				const params = {};
				if (this.selectedProject) {
					params.project_id = this.selectedProject;
				}
				// For general chat, we don't pass project_id (it will be null)

				const response = await axios.get('/conversations/list-of-conversations', {
					params: params
				});

				this.chatHistory = Object.values(response.data.data).map(conv => ({
					id: conv.id,
					title: conv.name,
					timestamp: new Date(conv.updatedAt)
				}));
			} catch (error) {
				console.error('Failed to load chat history:', error);
				this.chatHistory = [];
			} finally {
				this.isLoadingHistory = false;
			}
		},

		// Load a specific conversation
		async loadConversation(conversationId) {
			if (this.isLoadingConversation) return;

			this.isLoadingConversation = true;
			try {
				const response = await axios.get('/conversations/conversation-history', {
					params: { conversationId }
				});

				const conversation = response.data.data;

				// Transform backend message format to frontend format
				this.questions = conversation.messages.map(msg => ({
					type: msg.type === 'user_message' ? 'question' : 'answer',
					text: msg.message,
					timestamp: new Date(msg.createdAt),
					sources: [], // Add sources if available in your backend
					sopReferences: [] // Add SOP references if available
				}))
					.sort((a, b) => a.timestamp - b.timestamp);

				// Update current conversation ID
				this.currentConversationId = conversationId;

				// Update URL without page refresh
				if (this.$route.params.conversationId !== conversationId) {
					this.$router.push(`/chat/${conversationId}`);
				}

				// Set the project context if the conversation has a project
				if (conversation.project_id && conversation.project_id !== this.selectedProject) {
					this.selectedProject = conversation.project_id;
					await this.updateChatContext();
				}

				// Scroll to bottom after loading messages
				this.$nextTick(() => {
					this.scrollToBottom();
				});

			} catch (error) {
				console.error('Failed to load conversation:', error);
				// If conversation doesn't exist, redirect to new chat
				this.$router.push('/chat');
			} finally {
				this.isLoadingConversation = false;
			}
		},

		// Handle route changes
		async handleRouteChange() {
			const conversationId = this.$route.params.conversationId;

			if (conversationId && conversationId !== this.currentConversationId) {
				await this.loadConversation(conversationId);
			} else if (!conversationId) {
				// New conversation - clear current state
				this.questions = [];
				this.currentConversationId = null;
			}
		},
		// NEW: Helper to format history item dates
		formatHistoryDate(timestamp) {
			if (!timestamp) return "";
			const date = new Date(timestamp);
			const today = new Date();
			const yesterday = new Date(today);
			yesterday.setDate(yesterday.getDate() - 1);

			if (date.toDateString() === today.toDateString()) {
				return "Today";
			}
			if (date.toDateString() === yesterday.toDateString()) {
				return "Yesterday";
			}
			return date.toLocaleDateString();
		},
		async loadProjects() {
			try {
				await this.$store.dispatch("updateAvailableProjects");
				this.projects = this.$store.getters.getAvailableProjects;
			} catch (error) {
				console.error("Failed to load projects:", error);
			}
		},
		async loadProjectFiles() {
			if (!this.selectedProject) {
				this.projectFiles = [];
				return;
			}
			try {
				const docsConnected = this.$store.getters.getDocsConnectedToProject(
					this.selectedProject
				);
				this.projectFiles = docsConnected
					.map((conn) => conn.learning_session)
					.filter(Boolean);
			} catch (error) {
				console.error("Failed to load project files:", error);
			}
		},
		async updateChatContext() {
			await this.loadProjectFiles();
			this.form.project_id = this.selectedProject;

			// Reload chat history for the new project
			await this.loadChatHistory();

			// If we're in a specific conversation that doesn't belong to this project,
			// redirect to new chat
			if (this.currentConversationId && this.selectedProject) {
				const currentConv = this.chatHistory.find(c => c.id === this.currentConversationId);
				if (!currentConv) {
					this.$router.push('/chat');
					this.questions = [];
					this.currentConversationId = null;
				}
			}
		},
		updateSOPSetting() { },
		updateModelSetting() { },
		getInputPlaceholder() {
			if (this.selectedProject && this.includeSOP) {
				return "Ask about your project documents with SOP compliance...";
			} else if (this.selectedProject) {
				return "Ask about your project documents...";
			} else if (this.includeSOP) {
				return "Ask about company SOPs...";
			}
			return "Ask me anything...";
		},
		getProjectName(projectId) {
			const project = this.projects.find((p) => p.id == projectId);
			return project ? project.name : "Unknown Project";
		},
		handleEnterKey(event) {
			if (!event.shiftKey) {
				this.sendMessage();
			}
		},
		async sendMessage() {
			if (!this.form.text.trim() || this.isLoading) return;

			const userMessage = {
				type: "question",
				text: this.form.text,
				timestamp: new Date(),
			};

			this.questions.push(userMessage);
			this.isLoading = true;

			const messageText = this.form.text;
			this.form.text = "";

			const userProfile = this.$store.getters.getProfile;
			const userId = userProfile?.id || null;
			const createdAt = new Date().toISOString();

			try {
				const response = await axios.get("/api/complete", {
					params: {
						prompt: messageText,
						project_id: this.selectedProject || null,
						includeSOP: this.includeSOP,
						model: this.selectedModel,
						conversationId: this.currentConversationId || null,
						userId: userId,
						createdAt: createdAt,
						filesToUse: this.selectedFiles.length ?
							this.selectedFiles :
							null,
					},
				});

				const aiMessage = {
					type: "answer",
					text: response.data.data.answer,
					sources: response.data.data.sources || [],
					sopReferences: response.data.data.sopReferences || [],
					timestamp: new Date(),
				};

				if (response.data.data.conversationId) {
					this.currentConversationId = response.data.data.conversationId;

					// Update URL to include conversation ID if we're on a new chat
					if (!this.$route.params.conversationId) {
						this.$router.push(`/chat/${this.currentConversationId}`);
					}

					// Reload chat history to include the new conversation
					await this.loadChatHistory();
				}
				this.questions.push(aiMessage);
			} catch (error) {
				console.error("Failed to send message:", error);
				// this.$toast.error("Failed to send message. Please try again.");
				this.questions.pop();
			} finally {
				this.isLoading = false;
				this.$nextTick(() => {
					this.scrollToBottom();
					this.autoResizeTextarea();
				});
			}
		},
		formatMessage(text) {
			if (!text) return "";
			const urlRegex = /(https?:\/\/[^\s]+)/g;
			text = text.replace(
				urlRegex,
				'<a href="$1" target="_blank" rel="noopener">$1</a>'
			);
			const emailRegex =
				/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
			text = text.replace(emailRegex, '<a href="mailto:$1">$1</a>');
			return text.replace(/\n/g, "<br>");
		},
		formatTimestamp(timestamp) {
			if (!timestamp) return "";
			return new Date(timestamp).toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
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
		scrollToBottom() {
			this.$nextTick(() => {
				const container = this.$refs.messagesContainer;
				if (container) {
					container.scrollTop = container.scrollHeight;
				}
			});
		},
		autoResizeTextarea() {
			this.$nextTick(() => {
				const textarea = this.$refs.messageInput;
				if (textarea) {
					textarea.style.height = "auto";
					textarea.style.height =
						Math.min(textarea.scrollHeight, 120) + "px";
				}
			});
		},
		openFileModal() {
			this.showFileModal = true;
		},
		closeFileModal() {
			this.showFileModal = false;
		},
		applyFileSelection() {
			this.closeFileModal();
		},

		// Start a new chat conversation
		startNewChat() {
			this.$router.push('/chat');
			this.questions = [];
			this.currentConversationId = null;
		},
	},
	watch: {
		"form.text"() {
			this.autoResizeTextarea();
		},
		'$route'(to, from) {
			if (to.params.conversationId !== from.params.conversationId) {
				this.handleRouteChange();
			}
		}
	},
};
</script>

<style lang="scss" scoped>
/* Main Layout */
.chat-workspace {
	height: 100vh;
	border: 1px solid var(--gray-400);
	// background-color: var(--gray-50);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.chat-header {
	background-color: white;
	border-bottom: 1px solid var(--gray-200);
	padding: 1rem 2rem;
	z-index: 10;
	flex-shrink: 0;

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		max-width: 1200px;
		margin: 0 auto;
	}

	.chat-title {
		h1 {
			margin: 0;
			color: var(--gray-900);
			font-size: 1.5rem;
			font-weight: 700;
		}

		.subtitle {
			margin: 0.25rem 0 0 0;
			color: var(--gray-600);
			font-size: 0.875rem;
		}
	}

	.context-controls {
		display: flex;
		gap: 2rem;
		align-items: center;

		.control-group {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;

			.control-label {
				font-size: 0.75rem;
				font-weight: 600;
				color: var(--gray-700);
				text-transform: uppercase;
				letter-spacing: 0.05em;
			}

			.context-select {
				min-width: 200px;
				padding: 0.5rem 0.75rem;
				border: 1px solid var(--gray-300);
				border-radius: 0.375rem;
				font-size: 0.875rem;

				&:focus {
					outline: none;
					border-color: var(--primary-blue);
					box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
				}
			}
		}

		.toggle-label {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			cursor: pointer;

			.toggle-text {
				font-size: 0.875rem;
				color: var(--gray-700);
				font-weight: 500;
			}
		}
	}
}


/* NEW: Body Container for Chat + Sidebar */
.chat-body-container {
	display: flex;
	flex: 1;
	position: relative;
	overflow: hidden;
}

.main-chat-area {
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	min-width: 0;
}


/* Chat Messages Area */
.chat-messages {
	flex: 1;
	max-width: 1024px;
	margin: 0 auto;
	width: 100%;
	padding: 2rem;
	overflow-y: auto;

	.empty-chat {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;

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

	.message {
		margin-bottom: 1.5rem;
		display: flex;
		gap: 1rem;
		position: relative;
		max-width: 95%;
		width: 100%;

		&.user-message {
			left: 50px;
			justify-content: flex-end;

			.message-avatar {
				order: 2;
				background-color: var(--primary-blue);
				color: white;
			}

			.message-content {
				background-color: var(--primary-blue);
				color: white;
				border-radius: 1rem 1rem 0.25rem 1rem;
			}
		}

		&.ai-message {
			justify-content: flex-start;

			.message-avatar {
				background-color: var(--gray-600);
				color: white;
			}

			.message-content {
				background-color: white;
				color: var(--gray-900);
				border: 1px solid var(--gray-200);
				border-radius: 1rem 1rem 1rem 0.25rem;
			}
		}

		.message-avatar {
			width: 2.5rem;
			height: 2.5rem;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			margin-top: 0.5rem;
		}

		.message-content {
			max-width: 70%;
			padding: 1rem 1.5rem;
			font-size: 0.875rem;
			line-height: 1.5;
			box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);

			.message-text {
				margin-bottom: 0.5rem;
			}

			.message-sources,
			.sop-references {
				margin-top: 1rem;
				padding-top: 1rem;
				border-top: 1px solid rgba(255, 255, 255, 0.2);

				h4 {
					margin: 0 0 0.5rem 0;
					font-size: 0.75rem;
					font-weight: 600;
					text-transform: uppercase;
					opacity: 0.8;
				}

				.source-item,
				.sop-item {
					display: flex;
					align-items: center;
					gap: 0.5rem;
					margin-bottom: 0.25rem;
					font-size: 0.75rem;
					opacity: 0.9;

					i {
						width: 1rem;
					}

					.source-type,
					.sop-category {
						margin-left: auto;
						opacity: 0.7;
					}
				}
			}

			&.ai-message .message-sources,
			&.ai-message .sop-references {
				border-top: 1px solid var(--gray-200);
			}

			.message-timestamp {
				margin-top: 0.5rem;
				font-size: 0.75rem;
				opacity: 0.7;
				text-align: right;
			}
		}
	}
}


/* Chat Input Area */
.chat-input {
	flex-shrink: 0;
	background-color: #ffffff;
	border-top: 1px solid var(--gray-200);
	padding: 1rem 2rem;
	z-index: 5;

	.input-container {
		max-width: 900px;
		margin: 0 auto;

		.input-wrapper {
			display: flex;
			gap: 1rem;
			align-items: flex-end;
			background-color: #fff;
			padding: 0.5rem;
			border-radius: 0.75rem;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

			.input-field {
				flex: 1;
				min-height: 2.5rem;
				max-height: 8rem;
				padding: 0.75rem;
				border: none;
				resize: none;
				font-size: 0.875rem;
				font-family: inherit;

				&:focus {
					outline: none;
				}
			}

			.send-button {
				padding: 0.75rem 1.5rem;
				background-color: var(--primary-blue);
				color: white;
				border: none;
				border-radius: 0.5rem;
				font-weight: 600;
				cursor: pointer;
				transition: all 0.15s ease-in-out;

				&:hover:not(:disabled) {
					background-color: var(--primary-blue-light);
				}

				&:disabled {
					background-color: var(--gray-300);
					cursor: not-allowed;
				}

				&.loading {
					pointer-events: none;
				}
			}
		}

		.context-status {
			margin-top: 0.5rem;
			padding-left: 0.5rem;

			.status-items {
				display: flex;
				gap: 0.5rem;
				flex-wrap: wrap;

				.status-item {
					display: flex;
					align-items: center;
					gap: 0.25rem;
					padding: 0.25rem 0.5rem;
					border-radius: 0.25rem;
					font-size: 0.75rem;
					color: var(--gray-700);

					&.project-context {
						background-color: rgba(37, 99, 235, 0.1);
						color: var(--primary-blue);
					}

					&.sop-context {
						background-color: rgba(16, 185, 129, 0.1);
						color: var(--success-green);
					}
				}
			}
		}
	}
}


/* NEW: Chat History Sidebar */
.chat-history-sidebar {
	width: 280px;
	flex-shrink: 0;
	// background-color: #f8f9fa;
	border-left: 1px solid var(--gray-400);
	display: flex;
	flex-direction: column;
	transition: margin-right 0.3s ease-in-out;
	margin-right: 0;

	&.collapsed {
		margin-right: -280px; // Slide out of view
	}

	.sidebar-header {
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--gray-200);
		flex-shrink: 0;
		display: flex;
		justify-content: space-between;
		align-items: center;

		h3 {
			margin: 0;
			font-size: 1.1rem;
			font-weight: 600;
			color: var(--gray-800);
		}

		.new-chat-btn {
			width: 28px;
			height: 28px;
			border-radius: 50%;
			background-color: var(--primary-blue);
			color: white;
			border: none;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			transition: all 0.2s ease;
			font-size: 0.75rem;

			&:hover {
				background-color: var(--primary-blue-light);
				transform: scale(1.05);
			}
		}
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		text-align: center;
		color: var(--gray-500);
		flex: 1;

		i {
			font-size: 2rem;
			margin-bottom: 0.5rem;
			opacity: 0.6;
		}

		span {
			font-size: 0.875rem;
		}
	}

	.loading-state i {
		color: var(--primary-blue);
	}

	.history-list {
		list-style: none;
		padding: 0;
		margin: 0;
		flex: 1;
		overflow-y: auto;

		.history-item {
			padding: 1rem 1.5rem;
			cursor: pointer;
			border-bottom: 1px solid var(--gray-200);
			transition: background-color 0.2s;

			&:hover {
				background-color: var(--gray-200);
			}

			&.active {
				background-color: rgba(37, 99, 235, 0.1);
				border-left: 3px solid var(--primary-blue);

				.history-title {
					color: var(--primary-blue);
					font-weight: 600;
				}

				&:hover {
					background-color: rgba(37, 99, 235, 0.15);
				}
			}

			.history-title {
				display: block;
				color: var(--gray-800);
				font-weight: 500;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				margin: 0 0 0.25rem 0;
			}

			.history-time {
				font-size: 0.75rem;
				color: var(--gray-500);
			}
		}
	}
}


/* NEW: History Toggle Button */
.history-toggle-button {
	position: absolute;
	top: 50%;
	right: 290px;
	transform: translateY(-50%);
	z-index: 20;
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background-color: white;
	border: 1px solid var(--gray-300);
	box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	color: var(--gray-600);
	transition: right 0.3s ease-in-out, background-color 0.2s, color 0.2s;

	&:hover {
		background-color: var(--primary-blue);
		color: white;
	}

	&.is-collapsed {
		right: 10px;
	}
}


/* Modal Styles */
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}

.modal-content {
	background-color: white;
	border-radius: 0.5rem;
	max-width: 500px;
	width: 90%;
	max-height: 80vh;
	overflow: hidden;
	display: flex;
	flex-direction: column;

	.modal-header {
		padding: 1.5rem;
		border-bottom: 1px solid var(--gray-200);
		display: flex;
		justify-content: space-between;
		align-items: center;

		h3 {
			margin: 0;
			color: var(--gray-900);
			font-size: 1.125rem;
			font-weight: 600;
		}
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;

		.file-selection {
			.file-option {
				margin-bottom: 1rem;

				.checkbox-label {
					display: flex;
					align-items: center;
					gap: 0.75rem;

					.checkbox-text {
						display: flex;
						align-items: center;
						gap: 0.5rem;

						small {
							color: var(--gray-500);
							font-size: 0.75rem;
						}
					}
				}
			}
		}
	}

	.modal-footer {
		padding: 1.5rem;
		border-top: 1px solid var(--gray-200);
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
	}
}


/* Responsive Design */
@media (max-width: 1024px) {
	.chat-header {
		padding: 1rem;

		.header-content {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.context-controls {
			flex-direction: column;
			gap: 1rem;
			width: 100%;
			align-items: stretch;

			.control-group {
				width: 100%;

				.context-select {
					width: 100%;
				}
			}
		}
	}

	.chat-messages {
		padding: 1rem;

		.message .message-content {
			max-width: 85%;
		}
	}

	.chat-input {
		padding: 1rem;
	}

	.chat-history-sidebar {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		z-index: 50;
		margin-right: -290px;

		&.collapsed {
			margin-right: -290px;
		}

		&:not(.collapsed) {
			margin-right: 0;
			box-shadow: -5px 0 15px rgba(0, 0, 0, 0.1);
		}
	}

	.history-toggle-button {
		right: 10px;

		&.is-collapsed {
			right: 10px;
		}

		&:not(.is-collapsed) {
			right: 290px;
		}
	}
}
</style>
