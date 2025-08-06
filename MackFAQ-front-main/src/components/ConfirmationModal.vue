<template>
  <div v-if="show" class="modal-overlay" @click="handleCancel">
    <div class="modal-content confirmation-modal" @click.stop>
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button @click="handleCancel" class="modal-close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="confirmation-content">
          <div class="confirmation-icon" :class="iconClass">
            <i :class="iconName"></i>
          </div>
          <div class="confirmation-text">
            <p v-if="itemName">
              {{ message }} <strong>"{{ itemName }}"</strong>?
            </p>
            <p v-else>{{ message }}</p>
            <p v-if="warningText" class="warning-text">{{ warningText }}</p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="handleCancel" class="btn-modern btn-secondary">
          {{ cancelText }}
        </button>
        <button @click="handleConfirm" :disabled="isLoading"
          :class="['btn-modern', buttonClass, { 'loading': isLoading }]">
          <i v-if="!isLoading" :class="buttonIcon"></i>
          <i v-else class="fas fa-spinner fa-spin"></i>
          {{ isLoading ? computedLoadingText : computedConfirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConfirmationModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      default: 'delete',
      validator: (value) => ['delete', 'warning', 'info'].includes(value)
    },
    title: {
      type: String,
      required: true
    },
    itemName: {
      type: String,
      default: ''
    },
    message: {
      type: String,
      required: true
    },
    warningText: {
      type: String,
      default: ''
    },
    confirmText: {
      type: String,
      default: ''
    },
    cancelText: {
      type: String,
      default: 'Cancel'
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    loadingText: {
      type: String,
      default: ''
    }
  },
  emits: ['confirm', 'cancel', 'close'],
  computed: {
    iconClass() {
      const classes = {
        delete: 'icon-delete',
        warning: 'icon-warning',
        info: 'icon-info'
      };
      return classes[this.type] || classes.delete;
    },
    iconName() {
      const icons = {
        delete: 'fas fa-exclamation-triangle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
      };
      return icons[this.type] || icons.delete;
    },
    buttonClass() {
      const classes = {
        delete: 'btn-danger',
        warning: 'btn-warning',
        info: 'btn-primary'
      };
      return classes[this.type] || classes.delete;
    },
    buttonIcon() {
      const icons = {
        delete: 'fas fa-trash',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-check'
      };
      return icons[this.type] || icons.delete;
    },
    computedConfirmText() {
      if (this.confirmText) return this.confirmText;

      const defaults = {
        delete: 'Delete',
        warning: 'Proceed',
        info: 'Confirm'
      };
      return defaults[this.type] || defaults.delete;
    },
    computedLoadingText() {
      if (this.loadingText) return this.loadingText;

      const defaults = {
        delete: 'Deleting...',
        warning: 'Processing...',
        info: 'Confirming...'
      };
      return defaults[this.type] || defaults.delete;
    }
  },
  methods: {
    handleConfirm() {
      this.$emit('confirm');
    },
    handleCancel() {
      this.$emit('cancel');
      this.$emit('close');
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
      } else {
        // Restore body scroll when modal is closed
        document.body.style.overflow = '';
      }
    }
  },
  beforeUnmount() {
    // Ensure body scroll is restored if component is destroyed while modal is open
    document.body.style.overflow = '';
  }
};
</script>

<style lang="scss" scoped>
/* Modal Overlay */
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

/* Modal Content */
.modal-content {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  animation: modalSlideIn 0.2s ease-out;

  &.confirmation-modal {
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

/* Modal Header */
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

/* Modal Body */
.modal-body {
  padding: 1.5rem;
}

.confirmation-content {
  display: flex;
  gap: 1rem;
  align-items: flex-start;

  .confirmation-icon {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    flex-shrink: 0;

    &.icon-delete {
      background-color: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    &.icon-warning {
      background-color: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }

    &.icon-info {
      background-color: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }
  }

  .confirmation-text {
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

/* Modal Footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--gray-200);
  background: var(--gray-50);
}

/* Button Styles */
.btn-modern {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s ease-in-out;
  cursor: pointer;
  border: 1px solid transparent;

  &:disabled {
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  i {
    font-size: 0.875rem;
  }
}

.btn-secondary {
  background-color: white;
  color: var(--gray-700);
  border-color: var(--gray-300);

  &:hover:not(:disabled) {
    background-color: var(--gray-50);
    border-color: var(--gray-400);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
  }

  &.loading {
    pointer-events: none;
    opacity: 0.7;
  }
}

.btn-warning {
  background-color: #f59e0b;
  color: white;
  border: 1px solid #f59e0b;

  &:hover:not(:disabled) {
    background-color: #d97706;
    border-color: #d97706;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  }

  &:disabled {
    background-color: #fcd34d;
    border-color: #fcd34d;
  }

  &.loading {
    pointer-events: none;
    opacity: 0.7;
  }
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
  border: 1px solid #3b82f6;

  &:hover:not(:disabled) {
    background-color: #2563eb;
    border-color: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    background-color: #93c5fd;
    border-color: #93c5fd;
  }

  &.loading {
    pointer-events: none;
    opacity: 0.7;
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
      justify-content: center;
    }
  }

  .confirmation-content {
    flex-direction: column;
    text-align: center;

    .confirmation-icon {
      align-self: center;
    }
  }
}
</style>
