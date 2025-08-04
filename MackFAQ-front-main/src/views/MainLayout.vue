<template>
  <div class="modern-layout">
    <!-- Top Header -->
    <header class="top-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="app-title">Private AI</h1>
          <span class="app-subtitle">AI-Powered Document Assistant</span>
        </div>

        <div class="header-right">
          <Nav :hideTrain="hideTrain" />
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="main-content">
      <div class="content-wrapper">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script>
import Nav from "@/components/Nav";

export default {
  components: {
    Nav,
  },
  computed: {
    hideTrain() {
      return this.$route.name === "chat-only";
    },
  },
};
</script>

<style scoped lang="scss">
.modern-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.top-header {
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
    padding: 1rem 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-self: start;

    .app-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--gray-900);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .app-subtitle {
      font-size: 0.875rem;
      color: var(--gray-600);
      font-weight: 500;
    }
  }

  .header-center {
    justify-self: center;
  }

  .header-right {
    justify-self: end;

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(239, 68, 68, 0.1);
      color: var(--danger-red);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: var(--danger-red);
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
      }
    }
  }
}

.top-navbar {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 1px 10px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 80px;
  z-index: 90;
}

.main-content {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  min-height: calc(100vh - 160px);
}

.content-wrapper {
  padding: 2rem;
  min-height: 100%;
}

// Responsive Design
@media (max-width: 1024px) {
  .top-header .header-content {
    grid-template-columns: 1fr;
    gap: 1rem;
    text-align: center;

    .header-left {
      justify-self: center;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }

    .header-center {
      justify-self: center;
      order: 2;
    }

    .header-right {
      justify-self: center;
      order: 3;
    }
  }

  .content-wrapper {
    padding: 1rem;
  }
}

@media (max-width: 768px) {
  .top-header .header-content {
    padding: 1rem;

    .header-left {
      .app-title {
        font-size: 1.25rem;
      }

      .app-subtitle {
        font-size: 0.75rem;
      }
    }
  }
}

@media (max-width: 640px) {
  .top-header .header-content {
    gap: 0.75rem;

    .header-left {
      .app-subtitle {
        display: none;
      }
    }
  }
}
</style>

<style lang="scss">
.project-link {
  overflow: hidden !important;
  max-width: 85%;
}

@media only screen and (max-width: 600px) {

  .nav {
    max-width: 80%;
  }

  .page-train {
    table {
      overflow: scroll;

      td {
        padding: 5px;
      }
    }

    padding-left: 10px;
    padding-right: 10px;
  }
}
</style>
