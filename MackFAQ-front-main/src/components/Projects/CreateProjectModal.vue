<template>
	<div v-if="show" class="modal-overlay" @click="closeModal">
		<div class="modal-content" @click.stop>
			<div class="modal-header">
				<h3>Create New Project</h3>
				<button @click="closeModal" class="modal-close">
					<i class="fas fa-times"></i>
				</button>
			</div>
			
			<div class="modal-body">
				<div class="form-group">
					<label class="form-label">Project Name</label>
					<input 
						type="text" 
						v-model="projectName"
						@keydown.enter="createProject"
						placeholder="Enter project name"
						class="form-input"
						ref="projectNameInput"
					>
				</div>
			</div>
			
			<div class="modal-footer">
				<button @click="closeModal" class="btn-modern btn-secondary">
					Cancel
				</button>
				<button 
					@click="createProject" 
					:disabled="isCreating || !projectName.trim()"
					:class="['btn-modern', 'btn-primary', { 'loading': isCreating }]"
				>
					<i v-if="!isCreating" class="fas fa-plus"></i>
					<i v-else class="fas fa-spinner fa-spin"></i>
					{{ isCreating ? 'Creating...' : 'Create Project' }}
				</button>
			</div>
		</div>
	</div>
</template>

<script>
import axios from '@/axios';

export default {
	name: 'CreateProjectModal',
	props: {
		show: {
			type: Boolean,
			default: false
		}
	},
	emits: ['close', 'project-created'],
	data() {
		return {
			projectName: '',
			isCreating: false,
		};
	},
	watch: {
		show(newVal) {
			if (newVal) {
				this.$nextTick(() => {
					if (this.$refs.projectNameInput) {
						this.$refs.projectNameInput.focus();
					}
				});
			} else {
				// Reset form when modal is closed
				this.projectName = '';
				this.isCreating = false;
			}
		}
	},
	methods: {
		closeModal() {
			this.$emit('close');
		},

		async createProject() {
			if (!this.projectName.trim()) {
				this.$toast.error('Please enter a project name');
				return;
			}

			try {
				this.isCreating = true;

				const user = this.$store.getters.getProfile;
				console.log('Creating project for user:', user);

				// Get the current user ID from the store profile
				let userId = this.$store.getters.getProfile?.id;
				
				// If profile is not loaded, try to load it first
				if (!userId) {
					console.log('Profile not loaded, attempting to load user data...');
					await this.$store.dispatch('loadMe');
					userId = this.$store.getters.getProfile?.id;
				}

				console.log('Creating project with user ID:', userId);

				const requestData = {
					name: this.projectName.trim(),
					bot_id: process.env.VUE_APP_API_BOT_ID,
					creator_id: userId
				};

				console.log('Project creation request data:', requestData);

				const response = await axios.post('/local-intents-responses-storage/projects/create', requestData);

				console.log('Project creation response:', response.data);

				await this.$store.dispatch('updateAvailableProjects');
				
				this.$toast.success('Project created successfully!');
				this.$emit('project-created');
				this.closeModal();

			} catch (error) {
				console.error('Failed to create project:', error);
				console.error('Error details:', error.response?.data);
				this.$toast.error('Failed to create project. Please try again.');
			} finally {
				this.isCreating = false;
			}
		},
	},
};
</script>

<style lang="scss" scoped>
/* Modal Styling */
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

	.form-group {
		margin-bottom: 1rem;

		&:last-child {
			margin-bottom: 0;
		}
	}

	.form-label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--gray-700);
	}

	.form-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--gray-300);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		transition: all 0.15s ease-in-out;
		background: white;
		color: var(--gray-900);

		&:focus {
			outline: none;
			border-color: var(--primary-blue);
			box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
		}

		&::placeholder {
			color: var(--gray-500);
		}
	}
}

.modal-footer {
	display: flex;
	justify-content: flex-end;
	gap: 0.75rem;
	padding: 1.5rem;
	border-top: 1px solid var(--gray-200);
	background: var(--gray-50);

	.btn-modern {
		&.loading {
			pointer-events: none;
			opacity: 0.7;
		}

		&:disabled {
			background-color: var(--gray-300);
			color: var(--gray-500);
			cursor: not-allowed;
			border-color: var(--gray-300);

			&:hover {
				background-color: var(--gray-300);
				transform: none;
				box-shadow: none;
			}
		}
	}
}

/* Responsive Design */
@media (max-width: 640px) {
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
}
</style>
