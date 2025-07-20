<template>
    <div class="projects-workspace">
        <!-- Header Section -->
        <div class="workspace-header">
            <div class="header-content">
                <div class="header-title">
                    <h1>Project Management</h1>
                    <p class="subtitle">Manage your projects and AI-powered document analysis</p>
                </div>
                <div class="header-actions">
                    <AddNewProject @project-created="refreshProjects" />
                </div>
            </div>
        </div>

        <!-- Main Content Grid -->
        <div class="workspace-grid">
            <!-- Projects Panel -->
            <div class="projects-panel">
                <div class="panel-header">
                    <h2>Projects</h2>
                    <div class="project-stats">
                        <span class="stat-item">
                            <span class="stat-number">{{ projects.length }}</span>
                            <span class="stat-label">Total</span>
                        </span>
                    </div>
                </div>
                
                <div class="projects-list">
                    <div 
                        v-for="project in projects" 
                        :key="project.id"
                        :class="['project-card', { 'selected': selectedProject?.id === project.id }]"
                        @click="selectProject(project)">
                        
                        <div class="project-info">
                            <h3 class="project-name">{{ project.name }}</h3>
                            <p class="project-meta">
                                <span class="file-count">{{ getProjectFileCount(project.id) }} files</span>
                                <span class="last-updated">Updated {{ formatDate(project.updatedAt) }}</span>
                            </p>
                        </div>
                        
                        <div class="project-actions">
                            <button @click.stop="renameProject(project)" class="btn-modern btn-icon">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button @click.stop="deleteProject(project)" class="btn-modern btn-icon btn-danger">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Project Details Panel -->
            <div class="project-details" v-if="selectedProject">
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
                            @click="triggerFileInput">
                            
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
                                    class="file-input">
                                <button class="btn-modern btn-secondary">Choose Files</button>
                            </div>
                        </div>

                        <!-- Files Grid -->
                        <div class="files-grid" v-if="projectFiles.length">
                            <div v-for="file in projectFiles" :key="file.id" class="file-card">
                                <div class="file-icon" :class="getFileIconClass(file.file_type)">
                                    <i :class="getFileIcon(file.file_type)"></i>
                                </div>
                                <div class="file-info">
                                    <h4 class="file-name">{{ file.original_name }}</h4>
                                    <div class="file-meta">
                                        <span class="file-type">{{ file.file_type.toUpperCase() }}</span>
                                        <span class="file-category">{{ file.file_category || 'Document' }}</span>
                                        <span class="file-size">{{ formatFileSize(file.file_size) }}</span>
                                    </div>
                                </div>
                                <div class="file-actions">
                                    <button @click="downloadFile(file)" class="btn-modern btn-icon">
                                        <i class="fas fa-download"></i>
                                    </button>
                                    <button @click="deleteFile(file)" class="btn-modern btn-icon btn-danger">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- AI Configuration Section -->
                <div class="card" style="margin-top: 2rem;">
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
                                        <option value="meta-llama/llama-2-70b-chat">Llama 2 70B</option>
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
                                <div class="form-label-row" style="display: flex; justify-content: space-between; align-items: center;">
                                    <label class="form-label">System Prompt</label>
                                    <button 
                                        @click="togglePromptLock" 
                                        :class="['btn-modern', 'btn-sm', aiConfig.promptLocked ? 'btn-danger' : 'btn-success']">
                                        <i :class="aiConfig.promptLocked ? 'fas fa-lock' : 'fas fa-unlock'"></i>
                                        {{ aiConfig.promptLocked ? 'Unlock' : 'Lock' }}
                                    </button>
                                </div>
                                <textarea 
                                    v-model="aiConfig.systemPrompt" 
                                    :disabled="aiConfig.promptLocked"
                                    @blur="updateAIConfig"
                                    class="form-textarea"
                                    rows="4"
                                    placeholder="Enter your custom AI system prompt...">
                                </textarea>
                            </div>
                            
                            <!-- SOP Integration -->
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        v-model="aiConfig.includeSOP" 
                                        @change="updateAIConfig">
                                    <span class="checkbox-text">
                                        Include SOP Library
                                        <small>Cross-reference with company SOPs for compliance checking</small>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="empty-state">
                <div class="empty-content">
                    <div class="empty-icon">
                        <i class="fas fa-folder-open"></i>
                    </div>
                    <h3>Select a Project</h3>
                    <p>Choose a project from the left panel to view and manage its files and AI configuration.</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import axios from '@/axios';
import AddNewProject from '@/components/Projects/AddNewProject.vue';

export default {
    components: {
        AddNewProject
    },
    data() {
        return {
            projects: [],
            selectedProject: null,
            projectFiles: [],
            isDragOver: false,
            aiConfig: {
                selectedModel: 'gpt-3.5-turbo',
                apiProvider: 'openai',
                systemPrompt: 'You are a helpful AI assistant that analyzes project documents and provides insights based on the uploaded files and company SOPs.',
                promptLocked: false,
                includeSOP: true
            },
            fileUploadProgress: {},
            isLoading: false
        }
    },
    async mounted() {
        await this.loadProjects();
    },
    methods: {
        async loadProjects() {
            try {
                this.isLoading = true;
                const response = await axios.get('/api/projects');
                this.projects = response.data || [];
            } catch (error) {
                console.error('Failed to load projects:', error);
                this.$toast.error('Failed to load projects');
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
                const response = await axios.get(`/api/projects/${this.selectedProject.id}/files`);
                this.projectFiles = response.data || [];
            } catch (error) {
                console.error('Failed to load project files:', error);
                this.$toast.error('Failed to load project files');
            }
        },

        async loadAIConfig() {
            if (!this.selectedProject) return;
            
            try {
                const response = await axios.get(`/api/ai-config/user`);
                if (response.data) {
                    this.aiConfig = { ...this.aiConfig, ...response.data };
                }
            } catch (error) {
                console.error('Failed to load AI config:', error);
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
            event.target.value = '';
        },
        
        async uploadFiles(files) {
            if (!this.selectedProject) {
                this.$toast.error('Please select a project first');
                return;
            }

            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('project_id', this.selectedProject.id);
                formData.append('file_category', this.detectFileCategory(file.name));
                
                try {
                    this.$toast.info(`Uploading ${file.name}...`);
                    await axios.post('/api/large-files-processing/learn-private', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                    this.$toast.success(`${file.name} uploaded successfully`);
                } catch (error) {
                    console.error('File upload failed:', error);
                    this.$toast.error(`Failed to upload ${file.name}`);
                }
            }
            
            // Reload files after upload
            await this.loadProjectFiles();
        },
        
        detectFileCategory(filename) {
            const name = filename.toLowerCase();
            if (name.includes('manual') || name.includes('guide')) return 'manual';
            if (name.includes('invoice') || name.includes('bill')) return 'invoice';
            if (name.includes('contract') || name.includes('agreement')) return 'contract';
            if (name.includes('email') || name.includes('mail')) return 'email';
            if (name.includes('transcript') || name.includes('meeting')) return 'transcript';
            if (name.match(/\.(jpg|jpeg|png|gif)$/)) return 'screenshot';
            return 'document';
        },
        
        getFileIcon(fileType) {
            const iconMap = {
                'pdf': 'fas fa-file-pdf',
                'xls': 'fas fa-file-excel',
                'xlsx': 'fas fa-file-excel',
                'txt': 'fas fa-file-alt',
                'jpg': 'fas fa-file-image',
                'jpeg': 'fas fa-file-image',
                'png': 'fas fa-file-image',
                'gif': 'fas fa-file-image'
            };
            return iconMap[fileType?.toLowerCase()] || 'fas fa-file';
        },

        getFileIconClass(fileType) {
            const classMap = {
                'pdf': 'file-pdf',
                'xls': 'file-excel',
                'xlsx': 'file-excel',
                'txt': 'file-text',
                'jpg': 'file-image',
                'jpeg': 'file-image',
                'png': 'file-image',
                'gif': 'file-image'
            };
            return classMap[fileType?.toLowerCase()] || 'file-text';
        },

        getProjectFileCount(projectId) {
            // This would typically come from the API
            return this.selectedProject?.id === projectId ? this.projectFiles.length : 0;
        },

        formatDate(dateString) {
            if (!dateString) return 'Never';
            const date = new Date(dateString);
            return date.toLocaleDateString();
        },

        formatFileSize(bytes) {
            if (!bytes) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        },

        async updateAIConfig() {
            try {
                await axios.post('/api/ai-config/update', this.aiConfig);
                this.$toast.success('AI configuration updated');
            } catch (error) {
                console.error('Failed to update AI config:', error);
                this.$toast.error('Failed to update AI configuration');
            }
        },

        togglePromptLock() {
            this.aiConfig.promptLocked = !this.aiConfig.promptLocked;
            this.updateAIConfig();
        },

        async refreshProjects() {
            await this.loadProjects();
        },

        async renameProject(project) {
            const newName = prompt('Enter new project name:', project.name);
            if (newName && newName !== project.name) {
                try {
                    await axios.put(`/api/projects/${project.id}`, { name: newName });
                    this.$toast.success('Project renamed successfully');
                    await this.loadProjects();
                } catch (error) {
                    console.error('Failed to rename project:', error);
                    this.$toast.error('Failed to rename project');
                }
            }
        },

        async deleteProject(project) {
            if (confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
                try {
                    await axios.delete(`/api/projects/${project.id}`);
                    this.$toast.success('Project deleted successfully');
                    if (this.selectedProject?.id === project.id) {
                        this.selectedProject = null;
                        this.projectFiles = [];
                    }
                    await this.loadProjects();
                } catch (error) {
                    console.error('Failed to delete project:', error);
                    this.$toast.error('Failed to delete project');
                }
            }
        },

        async deleteFile(file) {
            if (confirm(`Are you sure you want to delete "${file.original_name}"?`)) {
                try {
                    await axios.delete(`/api/files/${file.id}`);
                    this.$toast.success('File deleted successfully');
                    await this.loadProjectFiles();
                } catch (error) {
                    console.error('Failed to delete file:', error);
                    this.$toast.error('Failed to delete file');
                }
            }
        },

        async downloadFile(file) {
            try {
                const response = await axios.get(`/api/files/${file.id}/download`, {
                    responseType: 'blob'
                });
                
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', file.original_name);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Failed to download file:', error);
                this.$toast.error('Failed to download file');
            }
        }
    }
}
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
}
</style>
