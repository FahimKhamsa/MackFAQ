<template>
  <template v-if="BACKGROUND">
    <video v-if="BACKGROUND.includes('.mp4')" autoplay muted loop id="backgroundVideo">
      <source :src="`/${BACKGROUND}`" type="video/mp4">
    </video>
    <img v-else :src="`/${BACKGROUND}`" id="backgroundVideo" />
  </template>
  <router-view v-if="loaded" />
</template>

<script>
export default {
  computed: {
    BACKGROUND() {
      if (this['BACKGROUND_' + this.$route?.name + '_VIDEO']) {
        return this['BACKGROUND_' + this.$route?.name + '_VIDEO'];
      }
      return this.BACKGROUND_VIDEO;
    },
    isAuthRequired() {
      if (this.$route.name === undefined) {
        return null;
      }

      return this.$route.meta?.authRequired || false;
    }
  },
  watch: {
    isAuthRequired(val) {
      this.refreshAuth();
    }
  },
  data() {
    return {
      authRefreshTimer: null,
      isRefreshingAuth: false,
      loaded: false,
    }
  },
  methods: {
    async refreshAuth() {
      if (this.isRefreshingAuth) {
        return;
      }
      
      if (this.isAuthRequired == null) {
        this.loaded = false;
        return;
      }

      if (!this.$store.getters.getIsAuthSet) {
        this.loaded = true;
        return;
      }

      if (!this.isAuthRequired) {
        this.loaded = true;
        return;
      }

      this.isRefreshingAuth = true;

      try {
        await this.$store.dispatch('refreshAuth');
        await this.$store.dispatch('loadMe');
      } catch (ex) {
        console.error(ex);
      }

      this.loaded = true;

      this.isRefreshingAuth = false;
    }
  },
  created() {
    if (!this.$store.getters.getIsAuthSet && this.$route.meta.authRequired) {
      return this.$router.push({ name: "Login" });
    }
  },
  mounted() {
    this.refreshAuth();
    this.authRefreshTimer = setInterval(() => {
      this.refreshAuth();
    }, 60_000);
  },
  beforeUnmount() {
    if (this.authRefreshTimer) {
      clearInterval(this.authRefreshTimer);
    }
  }
}
</script>

<style>
#backgroundVideo {
  position: fixed;
  right: 0;
  bottom: 0;
  min-width: 100%;
  min-height: 100%;
  z-index: -1;
  object-fit: cover;
}
</style>