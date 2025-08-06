<template>
    <div class="modern-add-project">
        <div class="form-group">
            <label class="form-label">Project Name</label>
            <input type="text" placeholder="Enter project name" class="form-input" v-model="name"
                @keydown.enter="sendForm">
        </div>
        <div class="form-actions">
            <button @click="sendForm" :disabled="isLoading || !name.trim()"
                :class="['btn-modern', 'btn-primary', { 'loading': isLoading }]">
                <i v-if="!isLoading" class="fas fa-plus"></i>
                <i v-else class="fas fa-spinner fa-spin"></i>
                {{ isLoading ? 'Creating...' : 'Create Project' }}
            </button>
        </div>
    </div>
</template>

<script>
import axios from '@/axios';

const API_URL = process.env.VUE_APP_API_HOST;
const API_BOT_ID = process.env.VUE_APP_API_BOT_ID;

export default {
    emits: ['project-created'],
    data() {
        return {
            name: '',
            isLoading: false,
        }
    },
    methods: {
        async sendForm() {
            try {
                this.name = this.name.trim();

                if (!this.name) {
                    this.$toast.error('Please enter the project name', { position: "top" });
                    return;
                }

                this.isLoading = true;

                const response = await axios.post('/projects/management/create', {
                    name: this.name,
                    bot_id: API_BOT_ID
                });

                await this.$store.dispatch('updateAvailableProjects');

                this.$toast.success('Project created successfully!', { position: "top" });
                this.name = '';
                this.$emit('project-created');

            } catch (error) {
                console.error('Failed to create project:', error);
                this.$toast.error('Failed to create project. Please try again.', { position: "top" });
            } finally {
                this.isLoading = false;
            }
        }
    }
}
</script>

<style lang="scss">
.modern-add-project {
    .form-group {
        margin-bottom: 1.5rem;
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

    .form-actions {
        display: flex;
        justify-content: flex-end;
    }

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

// Legacy styles for backward compatibility
div.form {
    input {
        display: block !important;
        min-height: 50px;
        min-width: 100%;
    }

    button {
        margin-left: 10px;
    }
}
</style>
