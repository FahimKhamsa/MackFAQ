<template>
  <!-- <video autoplay muted loop id="backgroundVideo">
        <source src="@/assets/backgroundVideo.mp4" type="video/mp4">
    </video> -->
  <div style="position: absolute; width: 100%;z-index: 10;margin-top: -29px;">
    <button @click="$store.dispatch('logOut')" type="submit" class="btn" style="margin-left: auto; position: fixed; right: 10px; display: block; margin-right: 10px; margin-top: 0px;">Logout</button>
  </div>
  <div style="position: relative;" class="rounded-container">
    <Nav :hideTrain="hideTrain" />
    <router-view />
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
.rounded-container {
  width: 570px;
  padding: 0 15px;
  margin-left: auto;
  margin-right: auto;
  margin-top: 40px;
  height: fit-content;
}

@media only screen and (max-width: 600px) {
  .rounded-container {
    width: 95%;
  }
}
</style>

<style lang="scss">

  .project-link {
    overflow: hidden!important;
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