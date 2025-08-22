<template>
  <div class="conversations-table-container">
    <div class="table-wrapper">
      <table class="conversations-table">
        <thead>
          <tr>
            <th class="col-serial">S.No</th>
            <th class="col-name">Conversation Name</th>
            <th class="col-updated">Updated At</th>
            <th class="col-questions">Questions</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(conversation, index) in conversations" :key="conversation.id"
            :class="['table-row', { 'selected': selectedConversation?.id === conversation.id }]"
            @click="selectConversation(conversation)">
            <td class="col-serial">{{ index + 1 }}</td>
            <td class="col-name">
              <div class="conversation-name-cell">
                <div class="conversation-icon">
                  <i class="fa-solid fa-comments"></i>
                </div>
                <div v-if="editingConversation === conversation.id" class="conversation-name-edit">
                  <div class="input-wrapper">
                    <input v-model="editingName" @keydown.enter="saveRename(conversation)"
                      @keydown.escape="cancelRename" @blur="saveRename(conversation)" ref="editInput"
                      class="conversation-name-input" :disabled="renamingConversation === conversation.id">
                    <div v-if="renamingConversation === conversation.id" class="loading-spinner">
                      <i class="fa-solid fa-spinner fa-spin"></i>
                    </div>
                  </div>
                </div>
                <span v-else class="conversation-name" @dblclick="startRename(conversation)">
                  {{ conversation.name || `Conversation ${conversation.id}` }}
                </span>
              </div>
            </td>
            <td class="col-updated">
              <span class="date-text">{{ formatDate(conversation.updatedAt) }}</span>
            </td>
            <td class="col-questions">
              <span class="questions-count">{{ conversation.questions }}</span>
            </td>
            <td class="col-actions">
              <div class="actions-dropdown" :class="{ 'open': openDropdown === conversation.id }">
                <button @click.stop="toggleDropdown(conversation.id)" class="actions-button">
                  <font-awesome-icon icon="ellipsis-h" />
                </button>
                <div v-if="openDropdown === conversation.id" class="dropdown-menu">
                  <!-- <button @click.stop="handleAction('view', conversation)" class="dropdown-item">
                    <i class="fa-solid fa-eye"></i>
                    View
                  </button> -->
                  <button @click.stop="handleAction('rename', conversation)" class="dropdown-item">
                    <i class="fa-solid fa-edit"></i>
                    Rename
                  </button>
                  <button @click.stop="handleAction('export', conversation)" class="dropdown-item">
                    <i class="fa-solid fa-download"></i>
                    Export
                  </button>
                  <button @click.stop="handleAction('delete', conversation)" class="dropdown-item danger">
                    <i class="fa-solid fa-trash"></i>
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
    <div v-if="conversations.length === 0" class="empty-state">
      <div class="empty-content">
        <div class="empty-icon">
          <i class="fa-solid fa-comments"></i>
        </div>
        <h3>No Conversations Found</h3>
        <p>Start chatting to see your conversation history here.</p>
      </div>
    </div>
  </div>
</template>

<script>
import axiosConfigured from '@/axios';

const API_URL = process.env.VUE_APP_API_HOST;

export default {
  name: 'ConversationsTable',
  props: {
    conversations: {
      type: Array,
      default: () => []
    },
    selectedConversation: {
      type: Object,
      default: null
    }
  },
  emits: ['conversation-selected', 'action-triggered', 'conversation-renamed'],
  data() {
    return {
      openDropdown: null,
      editingConversation: null,
      editingName: '',
      originalName: '',
      renamingConversation: null
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
    selectConversation(conversation) {
      this.$emit('conversation-selected', conversation);
    },

    toggleDropdown(conversationId) {
      this.openDropdown = this.openDropdown === conversationId ? null : conversationId;
    },

    closeDropdown() {
      this.openDropdown = null;
    },

    handleAction(action, conversation) {
      this.closeDropdown();
      if (action === 'rename') {
        this.startRename(conversation);
      } else {
        this.$emit('action-triggered', { action, conversation });
      }
    },

    getQuestionsCount(conversation) {
      if (!conversation.messages) return 0;
      // Count user messages only
      return conversation.messages.filter(msg => msg.type === 'user_message').length;
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

    startRename(conversation) {
      this.editingConversation = conversation.id;
      this.editingName = conversation.name || conversation.messages_slug || `Conversation ${conversation.id}`;
      this.originalName = this.editingName;
      this.$nextTick(() => {
        if (this.$refs.editInput && this.$refs.editInput[0]) {
          this.$refs.editInput[0].focus();
          this.$refs.editInput[0].select();
        }
      });
    },

    async saveRename(conversation) {
      const newName = this.editingName.trim();

      // Don't save if name is empty or unchanged
      if (!newName || newName === this.originalName) {
        this.cancelRename();
        return;
      }

      // Don't save if already renaming this conversation
      if (this.renamingConversation === conversation.id) {
        return;
      }

      try {
        this.renamingConversation = conversation.id;

        const response = await axiosConfigured.put(API_URL + '/conversations/rename-conversation', {
          conversationId: conversation.id,
          name: newName
        });

        if (response.data.success) {
          // Show success message
          if (this.$toast) {
            this.$toast.success('Conversation renamed successfully', { position: 'top' });
          }

          // Update the conversation name locally
          conversation.name = newName;
          conversation.messages_slug = newName;

          // Emit event to notify parent component
          this.$emit('conversation-renamed', {
            conversationId: conversation.id,
            newName: newName
          });

        } else {
          throw new Error(response.data.message || 'Failed to rename conversation');
        }
      } catch (error) {
        console.error('Failed to rename conversation:', error);

        // Show error message
        if (this.$toast) {
          this.$toast.error(error.response?.data?.message || error.message || 'Failed to rename conversation', { position: 'top' });
        } else {
          // Fallback to alert if toast is not available
          alert('Failed to rename conversation: ' + (error.response?.data?.message || error.message));
        }

        // Reset the name to original
        this.editingName = this.originalName;
      } finally {
        this.renamingConversation = null;
        this.cancelRename();
      }
    },

    cancelRename() {
      this.editingConversation = null;
      this.editingName = '';
      this.originalName = '';
    }
  }
};
</script>

<style lang="scss" scoped>
.conversations-table-container {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

// .table-wrapper {
//   /* Remove overflow-x: auto to prevent internal table scrolling */
//   /* Let the page scroll instead */
// }

.conversations-table {
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
        min-width: 300px;
      }

      &.col-updated {
        width: 250px;
        min-width: 200px;
      }

      &.col-questions {
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

      &.col-questions {
        text-align: center;
      }

      &.col-actions {
        text-align: center;
      }
    }
  }
}

.conversation-name-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  .conversation-icon {
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

  .conversation-name {
    font-weight: 500;
    color: var(--gray-900);
    cursor: pointer;

    &:hover {
      color: var(--primary-blue);
    }
  }

  .conversation-name-edit {
    flex: 1;

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
  }

  .conversation-name-input {
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

    &:disabled {
      background-color: var(--gray-50);
      color: var(--gray-500);
      cursor: not-allowed;
    }
  }

  .loading-spinner {
    position: absolute;
    right: 0.5rem;
    color: var(--primary-blue);
    font-size: 0.75rem;
    pointer-events: none;

    i {
      animation: spin 1s linear infinite;
    }
  }
}

.date-text {
  color: var(--gray-600);
  font-size: 0.875rem;
}

.questions-count {
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

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
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
  .conversations-table {
    font-size: 0.75rem;

    thead th {
      padding: 0.5rem 0.75rem;
      font-size: 0.625rem;
    }

    tbody td {
      padding: 0.75rem;
    }

    .conversation-name-cell {
      gap: 0.5rem;

      .conversation-icon {
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
  .conversations-table {
    .col-updated {
      display: none;
    }

    .col-questions {
      width: 60px;
    }
  }
}
</style>
