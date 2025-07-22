<template>
	<div class="projects-table-container">
		<div class="table-wrapper">
			<table class="projects-table">
				<thead>
					<tr>
						<th class="col-serial">S.No</th>
						<th class="col-name">Project Name</th>
						<th class="col-updated">Updated At</th>
						<th class="col-files">Files</th>
						<th class="col-actions">Actions</th>
					</tr>
				</thead>
				<tbody>
					<tr 
						v-for="(project, index) in projects" 
						:key="project.id"
						:class="['table-row', { 'selected': selectedProject?.id === project.id }]"
						@click="selectProject(project)"
					>
						<td class="col-serial">{{ index + 1 }}</td>
						<td class="col-name">
							<div class="project-name-cell">
								<div class="project-icon">
									<i class="fas fa-folder"></i>
								</div>
								<div v-if="editingProject === project.id" class="project-name-edit">
									<input 
										v-model="editingName"
										@keydown.enter="saveRename(project)"
										@keydown.escape="cancelRename"
										@blur="saveRename(project)"
										ref="editInput"
										class="project-name-input"
									>
								</div>
								<span v-else class="project-name" @dblclick="startRename(project)">
									{{ project.name }}
								</span>
							</div>
						</td>
						<td class="col-updated">
							<span class="date-text">{{ formatDate(project.updatedAt) }}</span>
						</td>
						<td class="col-files">
							<span class="files-count">{{ getProjectFileCount(project.id) }}</span>
						</td>
						<td class="col-actions">
							<div class="actions-dropdown" :class="{ 'open': openDropdown === project.id }">
								<button 
									@click.stop="toggleDropdown(project.id)"
									class="actions-button"
								>
									<font-awesome-icon icon="ellipsis-h" />
								</button>
								<div v-if="openDropdown === project.id" class="dropdown-menu">
									<button 
										@click.stop="handleAction('rename', project)"
										class="dropdown-item"
									>
										<i class="fas fa-edit"></i>
										Rename
									</button>
									<button 
										@click.stop="handleAction('upload', project)"
										class="dropdown-item"
									>
										<i class="fas fa-upload"></i>
										Upload
									</button>
									<button 
										@click.stop="handleAction('delete', project)"
										class="dropdown-item danger"
									>
										<i class="fas fa-trash"></i>
										Delete
									</button>
								</div>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Empty State -->
		<div v-if="projects.length === 0" class="empty-state">
			<div class="empty-content">
				<div class="empty-icon">
					<i class="fas fa-folder-open"></i>
				</div>
				<h3>No Projects Found</h3>
				<p>Create your first project to get started with document management.</p>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'ProjectsTable',
	props: {
		projects: {
			type: Array,
			default: () => []
		},
		selectedProject: {
			type: Object,
			default: null
		},
		projectFileCounts: {
			type: Object,
			default: () => ({})
		}
	},
	emits: ['project-selected', 'action-triggered'],
	data() {
		return {
			openDropdown: null,
			editingProject: null,
			editingName: '',
			originalName: ''
		};
	},
	mounted() {
		// Close dropdown when clicking outside
		document.addEventListener('click', this.closeDropdown);
	},
	beforeUnmount() {
		document.removeEventListener('click', this.closeDropdown);
	},
	methods: {
		selectProject(project) {
			// Navigate to project details page
			this.$router.push({ name: 'project-details', params: { id: project.id } });
		},

		toggleDropdown(projectId) {
			this.openDropdown = this.openDropdown === projectId ? null : projectId;
		},

		closeDropdown() {
			this.openDropdown = null;
		},

		handleAction(action, project) {
			this.closeDropdown();
			this.$emit('action-triggered', { action, project });
		},

		getProjectFileCount(projectId) {
			return this.projectFileCounts[projectId] || 0;
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

		startRename(project) {
			this.editingProject = project.id;
			this.editingName = project.name;
			this.originalName = project.name;
			this.$nextTick(() => {
				if (this.$refs.editInput && this.$refs.editInput[0]) {
					this.$refs.editInput[0].focus();
					this.$refs.editInput[0].select();
				}
			});
		},

		saveRename(project) {
			if (this.editingName.trim() && this.editingName.trim() !== this.originalName) {
				this.$emit('action-triggered', { 
					action: 'rename', 
					project: project,
					newName: this.editingName.trim()
				});
			}
			this.cancelRename();
		},

		cancelRename() {
			this.editingProject = null;
			this.editingName = '';
			this.originalName = '';
		}
	}
};
</script>

<style lang="scss" scoped>
.projects-table-container {
	background: white;
	border-radius: 0.5rem;
	box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
	/* Remove overflow: hidden to allow dropdown to extend beyond table boundaries */
}

.table-wrapper {
	/* Remove overflow-x: auto to prevent internal table scrolling */
	/* Let the page scroll instead */
}

.projects-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 0.875rem;

	thead {
		background-color: var(--gray-50);
		border-bottom: 1px solid var(--gray-200);

		th {
			padding: 0.75rem 1rem;
			text-align: left;
			font-weight: 600;
			color: var(--gray-700);
			font-size: 0.75rem;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			white-space: nowrap;

			&.col-serial {
				width: 100px;
			}

			&.col-name {
				min-width: 250px;
			}

			&.col-updated {
				width: 250px;
				min-width: 200px;
			}

			&.col-files {
				width: 150px;
				text-align: center;
			}

			&.col-actions {
				width: 100px;
				text-align: center;
			}
		}
	}

	tbody {
		tr {
			border-bottom: 1px solid var(--gray-100);
			transition: all 0.15s ease-in-out;
			cursor: pointer;

			&:hover {
				background-color: var(--gray-50);
			}

			&.selected {
				background-color: rgba(37, 99, 235, 0.05);
				border-left: 3px solid var(--primary-blue);
			}

			&:last-child {
				border-bottom: none;
			}
		}

		td {
			padding: 1rem;
			vertical-align: middle;
			color: var(--gray-900);

			&.col-serial {
				font-weight: 500;
				color: var(--gray-600);
			}

			&.col-files {
				text-align: center;
			}

			&.col-actions {
				text-align: center;
			}
		}
	}
}

.project-name-cell {
	display: flex;
	align-items: center;
	gap: 0.75rem;

	.project-icon {
		width: 2rem;
		height: 2rem;
		background-color: rgba(37, 99, 235, 0.1);
		border-radius: 0.375rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--primary-blue);
		font-size: 0.875rem;
	}

	.project-name {
		font-weight: 500;
		color: var(--gray-900);
		cursor: pointer;
		
		&:hover {
			color: var(--primary-blue);
		}
	}

	.project-name-edit {
		flex: 1;
	}

	.project-name-input {
		width: 100%;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--primary-blue);
		border-radius: 0.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--gray-900);
		background: white;
		outline: none;
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);

		&:focus {
			border-color: var(--primary-blue);
			box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
		}
	}
}

.date-text {
	color: var(--gray-600);
	font-size: 0.875rem;
}

.files-count {
	background-color: var(--gray-100);
	color: var(--gray-700);
	padding: 0.25rem 0.5rem;
	border-radius: 0.375rem;
	font-size: 0.75rem;
	font-weight: 500;
}

.actions-dropdown {
	position: relative;
	display: inline-block;

	.actions-button {
		background: none;
		color: var(--gray-600);
		cursor: pointer;
		padding: 0.75rem 1rem;
		border-radius: 0.25rem;
		transition: all 0.15s ease-in-out;

		&:hover {
			color: var(--gray-800);
			background-color: var(--gray-100);
		}

		i {
			font-size: 0.875rem;
		}
	}

	.dropdown-menu {
		position: absolute;
		top: 100%;
		right: 0;
		background: white;
		border: 1px solid var(--gray-200);
		border-radius: 0.375rem;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		z-index: 50;
		min-width: 120px;
		overflow: hidden;
		animation: dropdownSlideIn 0.15s ease-out;

		.dropdown-item {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			width: 100%;
			padding: 0.75rem 1rem;
			background: none;
			border: none;
			text-align: left;
			color: var(--gray-700);
			font-size: 0.875rem;
			cursor: pointer;
			transition: all 0.15s ease-in-out;

			&:hover {
				background-color: var(--gray-50);
			}

			&.danger {
				color: var(--danger-red);

				&:hover {
					background-color: rgba(239, 68, 68, 0.05);
				}
			}

			i {
				font-size: 0.75rem;
				width: 1rem;
			}
		}
	}
}

@keyframes dropdownSlideIn {
	from {
		opacity: 0;
		transform: translateY(-10px) scale(0.95);
	}
	to {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
}

.empty-state {
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

/* Responsive Design */
@media (max-width: 768px) {
	.projects-table {
		font-size: 0.75rem;

		thead th {
			padding: 0.5rem 0.75rem;
			font-size: 0.625rem;
		}

		tbody td {
			padding: 0.75rem;
		}

		.project-name-cell {
			gap: 0.5rem;

			.project-icon {
				width: 1.5rem;
				height: 1.5rem;
				font-size: 0.75rem;
			}
		}
	}

	.actions-dropdown .dropdown-menu {
		right: -50px;
		min-width: 100px;
	}
}

@media (max-width: 640px) {
	.projects-table {
		.col-updated {
			display: none;
		}

		.col-files {
			width: 60px;
		}
	}
}
</style>
